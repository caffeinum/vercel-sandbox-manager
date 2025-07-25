
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { sandboxesTable } from '../db/schema';
import { type CreateSandboxInput } from '../schema';
import { createSandbox } from '../handlers/create_sandbox';
import { eq, and } from 'drizzle-orm';

const testInput: CreateSandboxInput = {
  user_session_id: 'session-123',
  github_repo_url: 'https://github.com/user/repo',
  runtime: 'nodejs',
  vcpus: 2
};

describe('createSandbox', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a new sandbox', async () => {
    const result = await createSandbox(testInput);

    expect(result.id).toBeDefined();
    expect(result.user_session_id).toEqual('session-123');
    expect(result.github_repo_url).toEqual('https://github.com/user/repo');
    expect(result.runtime).toEqual('nodejs');
    expect(result.vcpus).toEqual(2);
    expect(result.status).toEqual('creating');
    expect(result.vercel_sandbox_id).toBeNull();
    expect(result.public_url).toBeNull();
    expect(result.error_message).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save sandbox to database', async () => {
    const result = await createSandbox(testInput);

    const sandboxes = await db.select()
      .from(sandboxesTable)
      .where(eq(sandboxesTable.id, result.id))
      .execute();

    expect(sandboxes).toHaveLength(1);
    expect(sandboxes[0].user_session_id).toEqual('session-123');
    expect(sandboxes[0].github_repo_url).toEqual('https://github.com/user/repo');
    expect(sandboxes[0].runtime).toEqual('nodejs');
    expect(sandboxes[0].vcpus).toEqual(2);
    expect(sandboxes[0].status).toEqual('creating');
  });

  it('should stop existing active sandbox before creating new one', async () => {
    // Create an active sandbox first
    await db.insert(sandboxesTable)
      .values({
        user_session_id: 'session-123',
        github_repo_url: 'https://github.com/user/old-repo',
        runtime: 'python',
        vcpus: 1,
        status: 'active',
        vercel_sandbox_id: 'old-sandbox-123',
        public_url: 'https://old-sandbox.vercel.app'
      })
      .execute();

    // Create new sandbox
    const newSandbox = await createSandbox(testInput);

    // Check that old sandbox is stopped
    const oldSandboxes = await db.select()
      .from(sandboxesTable)
      .where(
        and(
          eq(sandboxesTable.user_session_id, 'session-123'),
          eq(sandboxesTable.github_repo_url, 'https://github.com/user/old-repo')
        )
      )
      .execute();

    expect(oldSandboxes).toHaveLength(1);
    expect(oldSandboxes[0].status).toEqual('stopped');

    // Check that new sandbox is created with 'creating' status
    expect(newSandbox.status).toEqual('creating');
    expect(newSandbox.github_repo_url).toEqual('https://github.com/user/repo');
  });

  it('should not affect sandboxes from different users', async () => {
    // Create active sandbox for different user
    await db.insert(sandboxesTable)
      .values({
        user_session_id: 'different-session',
        github_repo_url: 'https://github.com/other/repo',
        runtime: 'python',
        vcpus: 4,
        status: 'active',
        vercel_sandbox_id: 'other-sandbox-456'
      })
      .execute();

    // Create sandbox for our test user
    await createSandbox(testInput);

    // Check that other user's sandbox is still active
    const otherSandboxes = await db.select()
      .from(sandboxesTable)
      .where(eq(sandboxesTable.user_session_id, 'different-session'))
      .execute();

    expect(otherSandboxes).toHaveLength(1);
    expect(otherSandboxes[0].status).toEqual('active');
  });

  it('should handle multiple non-active sandboxes correctly', async () => {
    // Create some stopped/error sandboxes for the same user
    await db.insert(sandboxesTable)
      .values([
        {
          user_session_id: 'session-123',
          github_repo_url: 'https://github.com/user/old1',
          runtime: 'nodejs',
          vcpus: 1,
          status: 'stopped'
        },
        {
          user_session_id: 'session-123',
          github_repo_url: 'https://github.com/user/old2',
          runtime: 'python',
          vcpus: 2,
          status: 'error'
        }
      ])
      .execute();

    // Create new sandbox
    const newSandbox = await createSandbox(testInput);

    // Check that old sandboxes remain unchanged
    const allUserSandboxes = await db.select()
      .from(sandboxesTable)
      .where(eq(sandboxesTable.user_session_id, 'session-123'))
      .execute();

    expect(allUserSandboxes).toHaveLength(3);

    const stoppedSandbox = allUserSandboxes.find(s => s.github_repo_url.includes('old1'));
    const errorSandbox = allUserSandboxes.find(s => s.github_repo_url.includes('old2'));

    expect(stoppedSandbox?.status).toEqual('stopped');
    expect(errorSandbox?.status).toEqual('error');
    expect(newSandbox.status).toEqual('creating');
  });
});

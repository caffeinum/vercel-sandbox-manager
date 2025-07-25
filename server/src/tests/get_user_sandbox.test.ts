
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { sandboxesTable } from '../db/schema';
import { type GetUserSandboxInput } from '../schema';
import { getUserSandbox } from '../handlers/get_user_sandbox';

const testInput: GetUserSandboxInput = {
  user_session_id: 'test-session-123'
};

describe('getUserSandbox', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null when no sandbox exists for user', async () => {
    const result = await getUserSandbox(testInput);
    expect(result).toBeNull();
  });

  it('should return the most recent active sandbox for user', async () => {
    // Create two sandboxes for the same user
    const olderSandbox = await db.insert(sandboxesTable)
      .values({
        user_session_id: testInput.user_session_id,
        github_repo_url: 'https://github.com/test/repo1',
        runtime: 'nodejs',
        vcpus: 2,
        status: 'active'
      })
      .returning()
      .execute();

    // Wait a moment to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const newerSandbox = await db.insert(sandboxesTable)
      .values({
        user_session_id: testInput.user_session_id,
        github_repo_url: 'https://github.com/test/repo2',
        runtime: 'python',
        vcpus: 4,
        status: 'creating'
      })
      .returning()
      .execute();

    const result = await getUserSandbox(testInput);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(newerSandbox[0].id);
    expect(result!.github_repo_url).toEqual('https://github.com/test/repo2');
    expect(result!.runtime).toEqual('python');
    expect(result!.status).toEqual('creating');
  });

  it('should exclude stopped sandboxes', async () => {
    // Create a stopped sandbox
    await db.insert(sandboxesTable)
      .values({
        user_session_id: testInput.user_session_id,
        github_repo_url: 'https://github.com/test/repo',
        runtime: 'nodejs',
        vcpus: 2,
        status: 'stopped'
      })
      .returning()
      .execute();

    const result = await getUserSandbox(testInput);
    expect(result).toBeNull();
  });

  it('should return null when only stopped sandboxes exist', async () => {
    // Create multiple stopped sandboxes
    await db.insert(sandboxesTable)
      .values([
        {
          user_session_id: testInput.user_session_id,
          github_repo_url: 'https://github.com/test/repo1',
          runtime: 'nodejs',
          vcpus: 2,
          status: 'stopped'
        },
        {
          user_session_id: testInput.user_session_id,
          github_repo_url: 'https://github.com/test/repo2',
          runtime: 'python',
          vcpus: 4,
          status: 'stopped'
        }
      ])
      .execute();

    const result = await getUserSandbox(testInput);
    expect(result).toBeNull();
  });

  it('should return active sandbox when both active and stopped exist', async () => {
    // Create a stopped sandbox first
    await db.insert(sandboxesTable)
      .values({
        user_session_id: testInput.user_session_id,
        github_repo_url: 'https://github.com/test/repo1',
        runtime: 'nodejs',
        vcpus: 2,
        status: 'stopped'
      })
      .execute();

    // Wait to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    // Create an active sandbox
    const activeSandbox = await db.insert(sandboxesTable)
      .values({
        user_session_id: testInput.user_session_id,
        github_repo_url: 'https://github.com/test/repo2',
        runtime: 'python',
        vcpus: 4,
        status: 'active'
      })
      .returning()
      .execute();

    const result = await getUserSandbox(testInput);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(activeSandbox[0].id);
    expect(result!.status).toEqual('active');
  });

  it('should not return sandboxes for different users', async () => {
    // Create sandbox for a different user
    await db.insert(sandboxesTable)
      .values({
        user_session_id: 'different-session-456',
        github_repo_url: 'https://github.com/test/repo',
        runtime: 'nodejs',
        vcpus: 2,
        status: 'active'
      })
      .execute();

    const result = await getUserSandbox(testInput);
    expect(result).toBeNull();
  });

  it('should include error status sandboxes', async () => {
    const errorSandbox = await db.insert(sandboxesTable)
      .values({
        user_session_id: testInput.user_session_id,
        github_repo_url: 'https://github.com/test/repo',
        runtime: 'nodejs',
        vcpus: 2,
        status: 'error',
        error_message: 'Failed to create sandbox'
      })
      .returning()
      .execute();

    const result = await getUserSandbox(testInput);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(errorSandbox[0].id);
    expect(result!.status).toEqual('error');
    expect(result!.error_message).toEqual('Failed to create sandbox');
  });
});

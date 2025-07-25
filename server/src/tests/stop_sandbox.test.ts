
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { sandboxesTable } from '../db/schema';
import { type StopSandboxInput } from '../schema';
import { stopSandbox } from '../handlers/stop_sandbox';
import { eq } from 'drizzle-orm';

// Test input
const testInput: StopSandboxInput = {
  sandbox_id: 1
};

describe('stopSandbox', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should stop an active sandbox', async () => {
    // Create a test sandbox first
    const createResult = await db.insert(sandboxesTable)
      .values({
        user_session_id: 'test-session-123',
        github_repo_url: 'https://github.com/test/repo',
        runtime: 'nodejs',
        vcpus: 2,
        status: 'active',
        vercel_sandbox_id: 'vercel-123',
        public_url: 'https://test.vercel.app'
      })
      .returning()
      .execute();

    const createdSandbox = createResult[0];

    const result = await stopSandbox({ sandbox_id: createdSandbox.id });

    // Verify the sandbox is stopped
    expect(result.id).toEqual(createdSandbox.id);
    expect(result.status).toEqual('stopped');
    expect(result.public_url).toBeNull();
    expect(result.user_session_id).toEqual('test-session-123');
    expect(result.github_repo_url).toEqual('https://github.com/test/repo');
    expect(result.runtime).toEqual('nodejs');
    expect(result.vcpus).toEqual(2);
    expect(result.vercel_sandbox_id).toEqual('vercel-123');
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should update sandbox in database', async () => {
    // Create a test sandbox first
    const createResult = await db.insert(sandboxesTable)
      .values({
        user_session_id: 'test-session-456',
        github_repo_url: 'https://github.com/test/another-repo',
        runtime: 'python',
        vcpus: 4,
        status: 'active',
        vercel_sandbox_id: 'vercel-456',
        public_url: 'https://another-test.vercel.app'
      })
      .returning()
      .execute();

    const createdSandbox = createResult[0];

    await stopSandbox({ sandbox_id: createdSandbox.id });

    // Query database to verify changes
    const sandboxes = await db.select()
      .from(sandboxesTable)
      .where(eq(sandboxesTable.id, createdSandbox.id))
      .execute();

    expect(sandboxes).toHaveLength(1);
    const updatedSandbox = sandboxes[0];
    expect(updatedSandbox.status).toEqual('stopped');
    expect(updatedSandbox.public_url).toBeNull();
    expect(updatedSandbox.updated_at).toBeInstanceOf(Date);
    expect(updatedSandbox.updated_at!.getTime()).toBeGreaterThan(updatedSandbox.created_at!.getTime());
  });

  it('should handle already stopped sandbox', async () => {
    // Create a test sandbox that's already stopped
    const createResult = await db.insert(sandboxesTable)
      .values({
        user_session_id: 'test-session-789',
        github_repo_url: 'https://github.com/test/stopped-repo',
        runtime: 'nodejs',
        vcpus: 1,
        status: 'stopped',
        vercel_sandbox_id: 'vercel-789',
        public_url: null
      })
      .returning()
      .execute();

    const createdSandbox = createResult[0];

    const result = await stopSandbox({ sandbox_id: createdSandbox.id });

    // Should return the sandbox as-is
    expect(result.status).toEqual('stopped');
    expect(result.public_url).toBeNull();
    expect(result.id).toEqual(createdSandbox.id);
  });

  it('should throw error for non-existent sandbox', async () => {
    await expect(stopSandbox({ sandbox_id: 999 }))
      .rejects.toThrow(/sandbox with id 999 not found/i);
  });

  it('should stop sandbox with error status', async () => {
    // Create a test sandbox with error status
    const createResult = await db.insert(sandboxesTable)
      .values({
        user_session_id: 'test-session-error',
        github_repo_url: 'https://github.com/test/error-repo',
        runtime: 'python',
        vcpus: 2,
        status: 'error',
        vercel_sandbox_id: 'vercel-error',
        public_url: null,
        error_message: 'Something went wrong'
      })
      .returning()
      .execute();

    const createdSandbox = createResult[0];

    const result = await stopSandbox({ sandbox_id: createdSandbox.id });

    // Should successfully stop even if in error state
    expect(result.status).toEqual('stopped');
    expect(result.public_url).toBeNull();
    expect(result.error_message).toEqual('Something went wrong');
  });
});

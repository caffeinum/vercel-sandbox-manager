
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { sandboxesTable, commandsTable } from '../db/schema';
import { type ExecuteCommandInput } from '../schema';
import { executeCommand } from '../handlers/execute_command';
import { eq } from 'drizzle-orm';

// Test input
const testInput: ExecuteCommandInput = {
  sandbox_id: 1,
  command: 'npm test'
};

describe('executeCommand', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a command record for active sandbox', async () => {
    // Create prerequisite active sandbox
    await db.insert(sandboxesTable)
      .values({
        user_session_id: 'test-session',
        github_repo_url: 'https://github.com/test/repo',
        runtime: 'nodejs',
        vcpus: 2,
        status: 'active',
        vercel_sandbox_id: 'vercel-123'
      })
      .execute();

    const result = await executeCommand(testInput);

    // Basic field validation
    expect(result.sandbox_id).toEqual(1);
    expect(result.command).toEqual('npm test');
    expect(result.status).toEqual('pending');
    expect(result.output).toBeNull();
    expect(result.error_output).toBeNull();
    expect(result.exit_code).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.completed_at).toBeNull();
  });

  it('should save command to database', async () => {
    // Create prerequisite active sandbox
    await db.insert(sandboxesTable)
      .values({
        user_session_id: 'test-session',
        github_repo_url: 'https://github.com/test/repo',
        runtime: 'nodejs',
        vcpus: 2,
        status: 'active',
        vercel_sandbox_id: 'vercel-123'
      })
      .execute();

    const result = await executeCommand(testInput);

    // Query using proper drizzle syntax
    const commands = await db.select()
      .from(commandsTable)
      .where(eq(commandsTable.id, result.id))
      .execute();

    expect(commands).toHaveLength(1);
    expect(commands[0].sandbox_id).toEqual(1);
    expect(commands[0].command).toEqual('npm test');
    expect(commands[0].status).toEqual('pending');
    expect(commands[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error if sandbox does not exist', async () => {
    await expect(executeCommand(testInput)).rejects.toThrow(/sandbox with id 1 not found/i);
  });

  it('should throw error if sandbox is not active', async () => {
    // Create prerequisite sandbox with non-active status
    await db.insert(sandboxesTable)
      .values({
        user_session_id: 'test-session',
        github_repo_url: 'https://github.com/test/repo',
        runtime: 'nodejs',
        vcpus: 2,
        status: 'stopped',
        vercel_sandbox_id: 'vercel-123'
      })
      .execute();

    await expect(executeCommand(testInput)).rejects.toThrow(/sandbox is not active.*stopped/i);
  });

  it('should work with different command types', async () => {
    // Create prerequisite active sandbox
    await db.insert(sandboxesTable)
      .values({
        user_session_id: 'test-session',
        github_repo_url: 'https://github.com/test/repo',
        runtime: 'python',
        vcpus: 4,
        status: 'active',
        vercel_sandbox_id: 'vercel-456'
      })
      .execute();

    const pythonInput: ExecuteCommandInput = {
      sandbox_id: 1,
      command: 'python main.py'
    };

    const result = await executeCommand(pythonInput);

    expect(result.command).toEqual('python main.py');
    expect(result.status).toEqual('pending');
    expect(result.sandbox_id).toEqual(1);
  });
});

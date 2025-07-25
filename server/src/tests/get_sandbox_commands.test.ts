
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { sandboxesTable, commandsTable } from '../db/schema';
import { type GetSandboxCommandsInput } from '../schema';
import { getSandboxCommands } from '../handlers/get_sandbox_commands';

// Test input
const testInput: GetSandboxCommandsInput = {
  sandbox_id: 1
};

describe('getSandboxCommands', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return commands for a sandbox ordered by creation date', async () => {
    // Create a test sandbox first
    const sandboxResult = await db.insert(sandboxesTable)
      .values({
        user_session_id: 'test-session',
        github_repo_url: 'https://github.com/test/repo',
        runtime: 'nodejs',
        vcpus: 2,
        status: 'active'
      })
      .returning()
      .execute();

    const sandboxId = sandboxResult[0].id;

    // Create test commands with different timestamps
    const now = new Date();
    const earlier = new Date(now.getTime() - 60000); // 1 minute earlier

    await db.insert(commandsTable)
      .values([
        {
          sandbox_id: sandboxId,
          command: 'npm install',
          status: 'completed',
          output: 'Installation complete',
          exit_code: 0,
          created_at: earlier
        },
        {
          sandbox_id: sandboxId,
          command: 'npm start',
          status: 'running',
          output: 'Server starting...',
          created_at: now
        }
      ])
      .execute();

    const result = await getSandboxCommands({ sandbox_id: sandboxId });

    expect(result).toHaveLength(2);
    
    // Verify ordering (most recent first)
    expect(result[0].command).toEqual('npm start');
    expect(result[0].status).toEqual('running');
    expect(result[0].output).toEqual('Server starting...');
    
    expect(result[1].command).toEqual('npm install');
    expect(result[1].status).toEqual('completed');
    expect(result[1].output).toEqual('Installation complete');
    expect(result[1].exit_code).toEqual(0);

    // Verify all fields are present
    result.forEach(command => {
      expect(command.id).toBeDefined();
      expect(command.sandbox_id).toEqual(sandboxId);
      expect(command.command).toBeDefined();
      expect(command.status).toBeDefined();
      expect(command.created_at).toBeInstanceOf(Date);
    });
  });

  it('should return empty array when sandbox has no commands', async () => {
    // Create a test sandbox without commands
    const sandboxResult = await db.insert(sandboxesTable)
      .values({
        user_session_id: 'test-session',
        github_repo_url: 'https://github.com/test/repo',
        runtime: 'python',
        vcpus: 1,
        status: 'active'
      })
      .returning()
      .execute();

    const result = await getSandboxCommands({ sandbox_id: sandboxResult[0].id });

    expect(result).toHaveLength(0);
  });

  it('should return empty array for non-existent sandbox', async () => {
    const result = await getSandboxCommands({ sandbox_id: 999 });

    expect(result).toHaveLength(0);
  });

  it('should include all command details including error information', async () => {
    // Create a test sandbox
    const sandboxResult = await db.insert(sandboxesTable)
      .values({
        user_session_id: 'test-session',
        github_repo_url: 'https://github.com/test/repo',
        runtime: 'nodejs',
        vcpus: 2,
        status: 'active'
      })
      .returning()
      .execute();

    const sandboxId = sandboxResult[0].id;

    // Create a command with error information
    const completedAt = new Date();
    await db.insert(commandsTable)
      .values({
        sandbox_id: sandboxId,
        command: 'npm test',
        status: 'failed',
        output: 'Some output before error',
        error_output: 'Test failed: assertion error',
        exit_code: 1,
        completed_at: completedAt
      })
      .execute();

    const result = await getSandboxCommands({ sandbox_id: sandboxId });

    expect(result).toHaveLength(1);
    
    const command = result[0];
    expect(command.command).toEqual('npm test');
    expect(command.status).toEqual('failed');
    expect(command.output).toEqual('Some output before error');
    expect(command.error_output).toEqual('Test failed: assertion error');
    expect(command.exit_code).toEqual(1);
    expect(command.completed_at).toBeInstanceOf(Date);
  });
});

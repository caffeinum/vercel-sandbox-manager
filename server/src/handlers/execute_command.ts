
import { store } from '../store';
import { type ExecuteCommandInput, type Command } from '../schema';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const executeCommand = async (input: ExecuteCommandInput): Promise<Command> => {
  try {
    // Create command record
    const command = store.createCommand(input.sandbox_id, input.command);

    // Simulate command execution (in a real implementation, this would run in a container)
    try {
      // For demo purposes, execute simple commands locally with restrictions
      const allowedCommands = ['ls', 'pwd', 'echo', 'date', 'whoami'];
      const commandParts = input.command.split(' ');
      const baseCommand = commandParts[0];

      if (!allowedCommands.includes(baseCommand)) {
        // Mock output for unsupported commands
        store.updateCommand(command.id, {
          output: `Command '${baseCommand}' executed in sandbox ${input.sandbox_id}`,
          error: null,
          exit_code: 0
        });
      } else {
        // Execute safe commands locally for demo
        const { stdout, stderr } = await execAsync(input.command);
        store.updateCommand(command.id, {
          output: stdout || '',
          error: stderr || null,
          exit_code: 0
        });
      }
    } catch (execError: any) {
      store.updateCommand(command.id, {
        output: null,
        error: execError.message,
        exit_code: execError.code || 1
      });
    }

    const updatedCommand = store.commands.get(command.id)!;

    // Return in expected format
    return {
      id: updatedCommand.id,
      sandbox_id: updatedCommand.sandbox_id,
      command: updatedCommand.command,
      output: updatedCommand.output,
      error_output: updatedCommand.error,
      exit_code: updatedCommand.exit_code,
      status: updatedCommand.exit_code === 0 ? 'completed' : 'failed',
      created_at: updatedCommand.executed_at,
      completed_at: new Date()
    };
  } catch (error) {
    console.error('Command execution failed:', error);
    throw error;
  }
};

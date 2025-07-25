
import { store } from '../store';
import { type GetSandboxCommandsInput, type Command } from '../schema';

export const getSandboxCommands = async (input: GetSandboxCommandsInput): Promise<Command[]> => {
  try {
    const commands = store.getSandboxCommands(input.sandbox_id);
    
    // Return in expected format
    return commands.map(cmd => ({
      id: cmd.id,
      sandbox_id: cmd.sandbox_id,
      command: cmd.command,
      output: cmd.output,
      error_output: cmd.error,
      exit_code: cmd.exit_code,
      status: cmd.exit_code === null ? 'pending' : (cmd.exit_code === 0 ? 'completed' : 'failed'),
      created_at: cmd.executed_at,
      completed_at: cmd.exit_code !== null ? new Date() : null
    }));
  } catch (error) {
    console.error('Getting sandbox commands failed:', error);
    throw error;
  }
};

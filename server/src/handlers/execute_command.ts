
import { db } from '../db';
import { sandboxesTable, commandsTable } from '../db/schema';
import { type ExecuteCommandInput, type Command } from '../schema';
import { eq } from 'drizzle-orm';

export const executeCommand = async (input: ExecuteCommandInput): Promise<Command> => {
  try {
    // 1. Verify that the sandbox exists and is in 'active' status
    const sandboxes = await db.select()
      .from(sandboxesTable)
      .where(eq(sandboxesTable.id, input.sandbox_id))
      .execute();

    if (sandboxes.length === 0) {
      throw new Error(`Sandbox with id ${input.sandbox_id} not found`);
    }

    const sandbox = sandboxes[0];
    if (sandbox.status !== 'active') {
      throw new Error(`Sandbox is not active. Current status: ${sandbox.status}`);
    }

    // 2. Create a new command record in the database with 'pending' status
    const result = await db.insert(commandsTable)
      .values({
        sandbox_id: input.sandbox_id,
        command: input.command,
        status: 'pending'
      })
      .returning()
      .execute();

    const command = result[0];

    // TODO: 3. Make API call to Vercel to execute the command in the sandbox
    // TODO: 4. Update command record with output, error output, exit code, and 'completed'/'failed' status
    // TODO: 5. Set completed_at timestamp when command finishes

    return command;
  } catch (error) {
    console.error('Command execution failed:', error);
    throw error;
  }
};

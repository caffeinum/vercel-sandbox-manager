
import { db } from '../db';
import { commandsTable } from '../db/schema';
import { type GetSandboxCommandsInput, type Command } from '../schema';
import { eq, desc } from 'drizzle-orm';

export const getSandboxCommands = async (input: GetSandboxCommandsInput): Promise<Command[]> => {
  try {
    const results = await db.select()
      .from(commandsTable)
      .where(eq(commandsTable.sandbox_id, input.sandbox_id))
      .orderBy(desc(commandsTable.created_at))
      .execute();

    return results;
  } catch (error) {
    console.error('Getting sandbox commands failed:', error);
    throw error;
  }
};

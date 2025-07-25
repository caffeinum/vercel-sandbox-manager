
import { db } from '../db';
import { sandboxesTable } from '../db/schema';
import { type StopSandboxInput, type Sandbox } from '../schema';
import { eq } from 'drizzle-orm';

export const stopSandbox = async (input: StopSandboxInput): Promise<Sandbox> => {
  try {
    // First, verify the sandbox exists and get its current state
    const existingSandboxes = await db.select()
      .from(sandboxesTable)
      .where(eq(sandboxesTable.id, input.sandbox_id))
      .execute();

    if (existingSandboxes.length === 0) {
      throw new Error(`Sandbox with id ${input.sandbox_id} not found`);
    }

    const existingSandbox = existingSandboxes[0];

    // Check if sandbox is already stopped
    if (existingSandbox.status === 'stopped') {
      return {
        ...existingSandbox,
        created_at: existingSandbox.created_at!,
        updated_at: existingSandbox.updated_at!
      };
    }

    // Update sandbox status to 'stopped' and clear public_url
    const result = await db.update(sandboxesTable)
      .set({
        status: 'stopped',
        public_url: null,
        updated_at: new Date()
      })
      .where(eq(sandboxesTable.id, input.sandbox_id))
      .returning()
      .execute();

    const updatedSandbox = result[0];
    return {
      ...updatedSandbox,
      created_at: updatedSandbox.created_at!,
      updated_at: updatedSandbox.updated_at!
    };
  } catch (error) {
    console.error('Sandbox stop failed:', error);
    throw error;
  }
};


import { db } from '../db';
import { sandboxesTable } from '../db/schema';
import { type GetUserSandboxInput, type Sandbox } from '../schema';
import { eq, ne, desc } from 'drizzle-orm';

export const getUserSandbox = async (input: GetUserSandboxInput): Promise<Sandbox | null> => {
  try {
    // Query for the most recent sandbox for the user that is not stopped
    const results = await db.select()
      .from(sandboxesTable)
      .where(
        eq(sandboxesTable.user_session_id, input.user_session_id)
      )
      .orderBy(desc(sandboxesTable.created_at))
      .limit(1)
      .execute();

    if (results.length === 0) {
      return null;
    }

    const sandbox = results[0];
    
    // Filter out stopped sandboxes
    if (sandbox.status === 'stopped') {
      return null;
    }

    return sandbox;
  } catch (error) {
    console.error('Failed to get user sandbox:', error);
    throw error;
  }
};

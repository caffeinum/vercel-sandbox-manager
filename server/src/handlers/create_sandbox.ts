
import { db } from '../db';
import { sandboxesTable } from '../db/schema';
import { type CreateSandboxInput, type Sandbox } from '../schema';
import { eq, and } from 'drizzle-orm';

export const createSandbox = async (input: CreateSandboxInput): Promise<Sandbox> => {
  try {
    // Check if user already has an active sandbox
    const existingSandboxes = await db.select()
      .from(sandboxesTable)
      .where(
        and(
          eq(sandboxesTable.user_session_id, input.user_session_id),
          eq(sandboxesTable.status, 'active')
        )
      )
      .execute();

    // If active sandbox exists, stop it first
    if (existingSandboxes.length > 0) {
      await db.update(sandboxesTable)
        .set({ 
          status: 'stopped',
          updated_at: new Date()
        })
        .where(eq(sandboxesTable.id, existingSandboxes[0].id))
        .execute();
    }

    // Create new sandbox record with 'creating' status
    const result = await db.insert(sandboxesTable)
      .values({
        user_session_id: input.user_session_id,
        github_repo_url: input.github_repo_url,
        runtime: input.runtime,
        vcpus: input.vcpus,
        status: 'creating',
        vercel_sandbox_id: null,
        public_url: null,
        error_message: null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Sandbox creation failed:', error);
    throw error;
  }
};

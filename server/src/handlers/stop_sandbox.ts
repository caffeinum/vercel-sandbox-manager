
import { store } from '../store';
import { type StopSandboxInput, type Sandbox } from '../schema';

export const stopSandbox = async (input: StopSandboxInput): Promise<Sandbox> => {
  try {
    const stoppedSandbox = store.stopSandbox(input.sandbox_id);
    
    if (!stoppedSandbox) {
      throw new Error(`Sandbox with id ${input.sandbox_id} not found`);
    }

    // Return in expected format
    return {
      id: stoppedSandbox.id,
      user_session_id: stoppedSandbox.user_session_id,
      github_repo_url: 'https://github.com/example/repo',
      runtime: 'node',
      vcpus: 1,
      status: 'stopped',
      vercel_sandbox_id: stoppedSandbox.container_id,
      public_url: null,
      error_message: null,
      created_at: stoppedSandbox.created_at,
      updated_at: stoppedSandbox.stopped_at || stoppedSandbox.created_at
    };
  } catch (error) {
    console.error('Sandbox stop failed:', error);
    throw error;
  }
};

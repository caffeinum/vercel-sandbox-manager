
import { store } from '../store';
import { type GetUserSandboxInput, type Sandbox } from '../schema';

export const getUserSandbox = async (input: GetUserSandboxInput): Promise<Sandbox | null> => {
  try {
    const sandbox = store.getUserSandbox(input.user_session_id);
    
    if (!sandbox) {
      return null;
    }

    // Return sandbox in the expected format
    return {
      id: sandbox.id,
      user_session_id: sandbox.user_session_id,
      github_repo_url: 'https://github.com/example/repo', // Mock data
      runtime: 'node',
      vcpus: 1,
      status: sandbox.status,
      vercel_sandbox_id: sandbox.container_id,
      public_url: `http://localhost:3000/${sandbox.id}`,
      error_message: null,
      created_at: sandbox.created_at,
      updated_at: sandbox.created_at
    };
  } catch (error) {
    console.error('Failed to get user sandbox:', error);
    throw error;
  }
};

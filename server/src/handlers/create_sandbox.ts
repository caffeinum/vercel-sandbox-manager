
import { store } from '../store';
import { type CreateSandboxInput, type Sandbox } from '../schema';

export const createSandbox = async (input: CreateSandboxInput): Promise<Sandbox> => {
  try {
    // Check if user already has an active sandbox
    const existingSandbox = store.getUserSandbox(input.user_session_id);

    // If active sandbox exists, stop it first
    if (existingSandbox) {
      store.stopSandbox(existingSandbox.id);
    }

    // Generate temporary container ID
    const containerId = `container_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create new sandbox
    const sandbox = store.createSandbox(input.user_session_id, containerId);

    // Return sandbox in the expected format
    return {
      id: sandbox.id,
      user_session_id: sandbox.user_session_id,
      github_repo_url: input.github_repo_url,
      runtime: input.runtime,
      vcpus: input.vcpus,
      status: 'active',
      vercel_sandbox_id: sandbox.container_id,
      public_url: `http://localhost:3000/${sandbox.id}`, // Mock URL
      error_message: null,
      created_at: sandbox.created_at,
      updated_at: sandbox.created_at
    };
  } catch (error) {
    console.error('Sandbox creation failed:', error);
    throw error;
  }
};

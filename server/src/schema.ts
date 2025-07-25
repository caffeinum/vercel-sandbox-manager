
import { z } from 'zod';

// Enum for sandbox runtime types
export const runtimeTypeSchema = z.enum(['nodejs', 'python']);
export type RuntimeType = z.infer<typeof runtimeTypeSchema>;

// Enum for sandbox status
export const sandboxStatusSchema = z.enum(['creating', 'active', 'stopped', 'error']);
export type SandboxStatus = z.infer<typeof sandboxStatusSchema>;

// Enum for command status
export const commandStatusSchema = z.enum(['pending', 'running', 'completed', 'failed']);
export type CommandStatus = z.infer<typeof commandStatusSchema>;

// Sandbox schema
export const sandboxSchema = z.object({
  id: z.string(),
  user_session_id: z.string(),
  github_repo_url: z.string().url(),
  runtime: runtimeTypeSchema,
  vcpus: z.number().int().positive(),
  status: sandboxStatusSchema,
  vercel_sandbox_id: z.string().nullable(),
  public_url: z.string().url().nullable(),
  error_message: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Sandbox = z.infer<typeof sandboxSchema>;

// Command schema
export const commandSchema = z.object({
  id: z.string(),
  sandbox_id: z.string(),
  command: z.string(),
  status: commandStatusSchema,
  output: z.string().nullable(),
  error_output: z.string().nullable(),
  exit_code: z.number().int().nullable(),
  created_at: z.coerce.date(),
  completed_at: z.coerce.date().nullable()
});

export type Command = z.infer<typeof commandSchema>;

// Input schema for creating a sandbox
export const createSandboxInputSchema = z.object({
  user_session_id: z.string().min(1),
  github_repo_url: z.string().url(),
  runtime: runtimeTypeSchema,
  vcpus: z.number().int().min(1).max(8) // Reasonable limits for vCPUs
});

export type CreateSandboxInput = z.infer<typeof createSandboxInputSchema>;

// Input schema for executing a command
export const executeCommandInputSchema = z.object({
  sandbox_id: z.string(),
  command: z.string().min(1)
});

export type ExecuteCommandInput = z.infer<typeof executeCommandInputSchema>;

// Input schema for stopping a sandbox
export const stopSandboxInputSchema = z.object({
  sandbox_id: z.string()
});

export type StopSandboxInput = z.infer<typeof stopSandboxInputSchema>;

// Input schema for getting user's sandbox
export const getUserSandboxInputSchema = z.object({
  user_session_id: z.string().min(1)
});

export type GetUserSandboxInput = z.infer<typeof getUserSandboxInputSchema>;

// Input schema for getting sandbox commands
export const getSandboxCommandsInputSchema = z.object({
  sandbox_id: z.string()
});

export type GetSandboxCommandsInput = z.infer<typeof getSandboxCommandsInputSchema>;

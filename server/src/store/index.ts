interface Sandbox {
  id: string;
  user_session_id: string;
  container_id: string;
  status: 'active' | 'stopped';
  created_at: Date;
  stopped_at?: Date;
}

interface Command {
  id: string;
  sandbox_id: string;
  command: string;
  output: string | null;
  error: string | null;
  exit_code: number | null;
  executed_at: Date;
}

class InMemoryStore {
  private sandboxes: Map<string, Sandbox> = new Map();
  commands: Map<string, Command> = new Map();
  private userSandboxes: Map<string, string> = new Map(); // user_session_id -> sandbox_id

  // Sandbox methods
  createSandbox(userSessionId: string, containerId: string): Sandbox {
    const sandbox: Sandbox = {
      id: `sandbox_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_session_id: userSessionId,
      container_id: containerId,
      status: 'active',
      created_at: new Date(),
    };
    
    this.sandboxes.set(sandbox.id, sandbox);
    this.userSandboxes.set(userSessionId, sandbox.id);
    
    return sandbox;
  }

  getUserSandbox(userSessionId: string): Sandbox | null {
    const sandboxId = this.userSandboxes.get(userSessionId);
    if (!sandboxId) return null;
    
    const sandbox = this.sandboxes.get(sandboxId);
    return sandbox && sandbox.status === 'active' ? sandbox : null;
  }

  stopSandbox(sandboxId: string): Sandbox | null {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) return null;
    
    sandbox.status = 'stopped';
    sandbox.stopped_at = new Date();
    
    // Remove from user mapping
    this.userSandboxes.delete(sandbox.user_session_id);
    
    return sandbox;
  }

  // Command methods
  createCommand(sandboxId: string, command: string): Command {
    const cmd: Command = {
      id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sandbox_id: sandboxId,
      command,
      output: null,
      error: null,
      exit_code: null,
      executed_at: new Date(),
    };
    
    this.commands.set(cmd.id, cmd);
    return cmd;
  }

  updateCommand(commandId: string, updates: Partial<Pick<Command, 'output' | 'error' | 'exit_code'>>): Command | null {
    const command = this.commands.get(commandId);
    if (!command) return null;
    
    Object.assign(command, updates);
    return command;
  }

  getSandboxCommands(sandboxId: string): Command[] {
    const commands: Command[] = [];
    
    for (const command of this.commands.values()) {
      if (command.sandbox_id === sandboxId) {
        commands.push(command);
      }
    }
    
    return commands.sort((a, b) => a.executed_at.getTime() - b.executed_at.getTime());
  }

  // Cleanup old sandboxes (optional)
  cleanup(maxAge: number = 3600000) { // 1 hour default
    const now = Date.now();
    
    for (const [id, sandbox] of this.sandboxes.entries()) {
      const age = now - sandbox.created_at.getTime();
      if (age > maxAge && sandbox.status === 'stopped') {
        this.sandboxes.delete(id);
        
        // Also clean up associated commands
        for (const [cmdId, cmd] of this.commands.entries()) {
          if (cmd.sandbox_id === id) {
            this.commands.delete(cmdId);
          }
        }
      }
    }
  }
}

export const store = new InMemoryStore();
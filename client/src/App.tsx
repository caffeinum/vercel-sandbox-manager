
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback } from 'react';
import type { Sandbox, Command, CreateSandboxInput } from '../../server/src/schema';

function App() {
  // Generate a simple user session ID (in real app, this would come from auth)
  const [userSessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  
  const [currentSandbox, setCurrentSandbox] = useState<Sandbox | null>(null);
  const [commands, setCommands] = useState<Command[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [commandInput, setCommandInput] = useState('');
  const [isExecutingCommand, setIsExecutingCommand] = useState(false);

  // Form state for creating new sandbox
  const [formData, setFormData] = useState<CreateSandboxInput>({
    user_session_id: userSessionId,
    github_repo_url: '',
    runtime: 'nodejs',
    vcpus: 1
  });

  // Load current sandbox
  const loadSandbox = useCallback(async () => {
    try {
      const sandbox = await trpc.getUserSandbox.query({ user_session_id: userSessionId });
      setCurrentSandbox(sandbox);
      
      // If we have an active sandbox, load its commands
      if (sandbox) {
        const sandboxCommands = await trpc.getSandboxCommands.query({ sandbox_id: sandbox.id });
        setCommands(sandboxCommands);
      } else {
        setCommands([]);
      }
    } catch (error) {
      console.error('Failed to load sandbox:', error);
    }
  }, [userSessionId]);

  useEffect(() => {
    loadSandbox();
  }, [loadSandbox]);

  const handleCreateSandbox = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const newSandbox = await trpc.createSandbox.mutate(formData);
      setCurrentSandbox(newSandbox);
      setCommands([]);
      // Reset form
      setFormData(prev => ({
        ...prev,
        github_repo_url: '',
        vcpus: 1
      }));
    } catch (error) {
      console.error('Failed to create sandbox:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSandbox || !commandInput.trim()) return;
    
    setIsExecutingCommand(true);
    try {
      const command = await trpc.executeCommand.mutate({
        sandbox_id: currentSandbox.id,
        command: commandInput.trim()
      });
      setCommands(prev => [command, ...prev]);
      setCommandInput('');
    } catch (error) {
      console.error('Failed to execute command:', error);
    } finally {
      setIsExecutingCommand(false);
    }
  };

  const handleStopSandbox = async () => {
    if (!currentSandbox) return;
    
    setIsLoading(true);
    try {
      const stoppedSandbox = await trpc.stopSandbox.mutate({ sandbox_id: currentSandbox.id });
      setCurrentSandbox(stoppedSandbox);
    } catch (error) {
      console.error('Failed to stop sandbox:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'creating': return 'bg-yellow-500';
      case 'stopped': return 'bg-gray-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getCommandStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'running': return 'bg-blue-500';
      case 'pending': return 'bg-yellow-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">🚀 Vercel Sandbox Manager</h1>
        <p className="text-gray-600">Manage your development sandboxes with ease</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column - Sandbox Management */}
        <div className="space-y-6">
          {/* Current Sandbox Status */}
          {currentSandbox ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    📦 Current Sandbox
                    <Badge className={`${getStatusColor(currentSandbox.status)} text-white`}>
                      {currentSandbox.status}
                    </Badge>
                  </CardTitle>
                  {currentSandbox.status !== 'stopped' && (
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={handleStopSandbox}
                      disabled={isLoading}
                    >
                      Stop Sandbox
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <strong>Repository:</strong>
                  <p className="text-sm text-gray-600 break-all">{currentSandbox.github_repo_url}</p>
                </div>
                <div className="flex gap-4">
                  <div>
                    <strong>Runtime:</strong> {currentSandbox.runtime}
                  </div>
                  <div>
                    <strong>vCPUs:</strong> {currentSandbox.vcpus}
                  </div>
                </div>
                {currentSandbox.public_url && (
                  <div>
                    <strong>Public URL:</strong>
                    <a 
                      href={currentSandbox.public_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 block text-sm break-all"
                    >
                      {currentSandbox.public_url} ↗️
                    </a>
                  </div>
                )}
                {currentSandbox.error_message && (
                  <Alert>
                    <AlertDescription className="text-red-600">
                      {currentSandbox.error_message}
                    </AlertDescription>
                  </Alert>
                )}
                <div className="text-xs text-gray-500">
                  Created: {currentSandbox.created_at.toLocaleString()}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Alert>
              <AlertDescription>
                No active sandbox found. Create one below to get started! 👇
              </AlertDescription>
            </Alert>
          )}

          {/* Create New Sandbox */}
          <Card>
            <CardHeader>
              <CardTitle>✨ Create New Sandbox</CardTitle>
              <CardDescription>
                {currentSandbox && currentSandbox.status !== 'stopped' 
                  ? 'Creating a new sandbox will stop the current one'
                  : 'Start by providing a GitHub repository URL'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateSandbox} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">GitHub Repository URL</label>
                  <Input
                    placeholder="https://github.com/username/repository"
                    value={formData.github_repo_url}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData(prev => ({ ...prev, github_repo_url: e.target.value }))
                    }
                    required
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Runtime</label>
                  <Select 
                    value={formData.runtime} 
                    onValueChange={(value: 'nodejs' | 'python') =>
                      setFormData(prev => ({ ...prev, runtime: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nodejs">🟢 Node.js</SelectItem>
                      <SelectItem value="python">🐍 Python</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">vCPUs ({formData.vcpus})</label>
                  <Input
                    type="number"
                    min="1"
                    max="8"
                    value={formData.vcpus}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData(prev => ({ ...prev, vcpus: parseInt(e.target.value) || 1 }))
                    }
                    required
                  />
                </div>

                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? '⏳ Creating Sandbox...' : '🚀 Create Sandbox'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Command Execution & History */}
        <div className="space-y-6">
          {/* Command Execution */}
          {currentSandbox && currentSandbox.status === 'active' && (
            <Card>
              <CardHeader>
                <CardTitle>💻 Execute Command</CardTitle>
                <CardDescription>Run commands in your sandbox environment</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleExecuteCommand} className="space-y-4">
                  <Textarea
                    placeholder="Enter command to execute (e.g., npm install, python app.py, ls -la)"
                    value={commandInput}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCommandInput(e.target.value)}
                    className="min-h-[100px]"
                  />
                  <Button 
                    type="submit" 
                    disabled={isExecutingCommand || !commandInput.trim()}
                    className="w-full"
                  >
                    {isExecutingCommand ? '⚡ Executing...' : '▶️ Execute Command'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Command History */}
          <Card>
            <CardHeader>
              <CardTitle>📋 Command History</CardTitle>
              <CardDescription>
                {commands.length === 0 
                  ? 'No commands executed yet' 
                  : `${commands.length} command${commands.length !== 1 ? 's' : ''} executed`
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {commands.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {currentSandbox?.status === 'active' 
                    ? '🎯 Execute your first command above!' 
                    : '⚡ Commands will appear here once you have an active sandbox'
                  }
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {commands.map((command: Command) => (
                    <div key={command.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                          {command.command}
                        </code>
                        <Badge className={`${getCommandStatusColor(command.status)} text-white`}>
                          {command.status}
                        </Badge>
                      </div>
                      
                      {command.output && (
                        <div>
                          <div className="text-xs font-medium text-gray-600 mb-1">Output:</div>
                          <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto whitespace-pre-wrap">
                            {command.output}
                          </pre>
                        </div>
                      )}
                      
                      {command.error_output && (
                        <div>
                          <div className="text-xs font-medium text-red-600 mb-1">Error:</div>
                          <pre className="text-xs bg-red-50 p-2 rounded overflow-x-auto whitespace-pre-wrap text-red-700">
                            {command.error_output}
                          </pre>
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>Started: {command.created_at.toLocaleString()}</span>
                        {command.completed_at && (
                          <span>Completed: {command.completed_at.toLocaleString()}</span>
                        )}
                        {command.exit_code !== null && (
                          <span>Exit Code: {command.exit_code}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <Separator className="my-8" />
      <div className="text-center text-sm text-gray-500">
        <p>🔧 Session ID: <code className="bg-gray-100 px-1 rounded">{userSessionId}</code></p>
        <p className="mt-1">Each session can manage one active sandbox at a time</p>
      </div>
    </div>
  );
}

export default App;

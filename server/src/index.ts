
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import cors from 'cors';
import superjson from 'superjson';

import { 
  createSandboxInputSchema,
  executeCommandInputSchema,
  stopSandboxInputSchema,
  getUserSandboxInputSchema,
  getSandboxCommandsInputSchema
} from './schema';

import { createSandbox } from './handlers/create_sandbox';
import { getUserSandbox } from './handlers/get_user_sandbox';
import { executeCommand } from './handlers/execute_command';
import { stopSandbox } from './handlers/stop_sandbox';
import { getSandboxCommands } from './handlers/get_sandbox_commands';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),
  
  // Create a new sandbox for the user session
  createSandbox: publicProcedure
    .input(createSandboxInputSchema)
    .mutation(({ input }) => createSandbox(input)),
  
  // Get the current active sandbox for a user session
  getUserSandbox: publicProcedure
    .input(getUserSandboxInputSchema)
    .query(({ input }) => getUserSandbox(input)),
  
  // Execute a command in an active sandbox
  executeCommand: publicProcedure
    .input(executeCommandInputSchema)
    .mutation(({ input }) => executeCommand(input)),
  
  // Stop an active sandbox
  stopSandbox: publicProcedure
    .input(stopSandboxInputSchema)
    .mutation(({ input }) => stopSandbox(input)),
  
  // Get all commands for a specific sandbox
  getSandboxCommands: publicProcedure
    .input(getSandboxCommandsInputSchema)
    .query(({ input }) => getSandboxCommands(input))
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();


import { serial, text, pgTable, timestamp, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Define enums for PostgreSQL
export const runtimeTypeEnum = pgEnum('runtime_type', ['nodejs', 'python']);
export const sandboxStatusEnum = pgEnum('sandbox_status', ['creating', 'active', 'stopped', 'error']);
export const commandStatusEnum = pgEnum('command_status', ['pending', 'running', 'completed', 'failed']);

// Sandboxes table
export const sandboxesTable = pgTable('sandboxes', {
  id: serial('id').primaryKey(),
  user_session_id: text('user_session_id').notNull(),
  github_repo_url: text('github_repo_url').notNull(),
  runtime: runtimeTypeEnum('runtime').notNull(),
  vcpus: integer('vcpus').notNull(),
  status: sandboxStatusEnum('status').notNull().default('creating'),
  vercel_sandbox_id: text('vercel_sandbox_id'),
  public_url: text('public_url'),
  error_message: text('error_message'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Commands table
export const commandsTable = pgTable('commands', {
  id: serial('id').primaryKey(),
  sandbox_id: integer('sandbox_id').notNull(),
  command: text('command').notNull(),
  status: commandStatusEnum('status').notNull().default('pending'),
  output: text('output'),
  error_output: text('error_output'),
  exit_code: integer('exit_code'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  completed_at: timestamp('completed_at')
});

// Define relations
export const sandboxesRelations = relations(sandboxesTable, ({ many }) => ({
  commands: many(commandsTable)
}));

export const commandsRelations = relations(commandsTable, ({ one }) => ({
  sandbox: one(sandboxesTable, {
    fields: [commandsTable.sandbox_id],
    references: [sandboxesTable.id]
  })
}));

// TypeScript types for the tables
export type Sandbox = typeof sandboxesTable.$inferSelect;
export type NewSandbox = typeof sandboxesTable.$inferInsert;
export type Command = typeof commandsTable.$inferSelect;
export type NewCommand = typeof commandsTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = {
  sandboxes: sandboxesTable,
  commands: commandsTable
};

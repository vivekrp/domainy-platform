import { pgTable, uuid, text, timestamp, json } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const usersTable = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

export const domainsTable = pgTable('domains', {
  id: uuid('id').primaryKey().defaultRandom(),
  domain_name: text('domain_name').notNull(),
  registrar: text('registrar').notNull(),
  expiry_date: timestamp('expiry_date'),
  whois_data: text('whois_data'),
  user_id: uuid('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  domains: many(domainsTable)
}));

export const domainsRelations = relations(domainsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [domainsTable.user_id],
    references: [usersTable.id]
  })
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
export type Domain = typeof domainsTable.$inferSelect;
export type NewDomain = typeof domainsTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = { 
  users: usersTable, 
  domains: domainsTable 
};

export const relations_exports = {
  usersRelations,
  domainsRelations
};
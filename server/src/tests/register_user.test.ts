
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type RegisterUserInput } from '../schema';
import { registerUser } from '../handlers/register_user';
import { eq } from 'drizzle-orm';

// Simple test input
const testInput: RegisterUserInput = {
  email: 'test@example.com',
  password: 'password123'
};

describe('registerUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should register a new user', async () => {
    const result = await registerUser(testInput);

    // Basic field validation
    expect(result.user.email).toEqual('test@example.com');
    expect(result.user.id).toBeDefined();
    expect(result.user.created_at).toBeInstanceOf(Date);
    expect(result.user.updated_at).toBeInstanceOf(Date);
    expect(result.token).toBeDefined();
    expect(result.token).toContain('token_');
    
    // Ensure password_hash is not returned
    expect((result.user as any).password_hash).toBeUndefined();
  });

  it('should save user to database', async () => {
    const result = await registerUser(testInput);

    // Query using proper drizzle syntax
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.user.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].password_hash).toEqual('hashed_password123');
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for duplicate email', async () => {
    // First registration should succeed
    await registerUser(testInput);

    // Second registration with same email should fail
    await expect(registerUser(testInput)).rejects.toThrow(/already exists/i);
  });

  it('should handle different email formats', async () => {
    const testInputWithDifferentEmail: RegisterUserInput = {
      email: 'user.name+tag@domain.co.uk',
      password: 'secure123'
    };

    const result = await registerUser(testInputWithDifferentEmail);

    expect(result.user.email).toEqual('user.name+tag@domain.co.uk');
    expect(result.user.id).toBeDefined();
    expect(result.token).toBeDefined();

    // Verify saved to database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, 'user.name+tag@domain.co.uk'))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].password_hash).toEqual('hashed_secure123');
  });
});

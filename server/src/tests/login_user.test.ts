
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { loginUser } from '../handlers/login_user';

// Test user data
const testUserData = {
  email: 'test@example.com',
  password_hash: 'testpassword123',
  id: '550e8400-e29b-41d4-a716-446655440000'
};

const testLoginInput: LoginInput = {
  email: 'test@example.com',
  password: 'testpassword123'
};

describe('loginUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should login user with valid credentials', async () => {
    // Create test user first
    await db.insert(usersTable)
      .values(testUserData)
      .execute();

    const result = await loginUser(testLoginInput);

    // Verify user data (without password_hash)
    expect(result.user.id).toBeDefined();
    expect(result.user.email).toEqual('test@example.com');
    expect(result.user.created_at).toBeInstanceOf(Date);
    expect(result.user.updated_at).toBeInstanceOf(Date);
    expect((result.user as any).password_hash).toBeUndefined();

    // Verify token is generated
    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe('string');
    expect(result.token.length).toBeGreaterThan(0);
  });

  it('should throw error for non-existent email', async () => {
    const invalidInput: LoginInput = {
      email: 'nonexistent@example.com',
      password: 'anypassword'
    };

    await expect(loginUser(invalidInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should throw error for incorrect password', async () => {
    // Create test user first
    await db.insert(usersTable)
      .values(testUserData)
      .execute();

    const invalidInput: LoginInput = {
      email: 'test@example.com',
      password: 'wrongpassword'
    };

    await expect(loginUser(invalidInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should generate unique tokens for different login sessions', async () => {
    // Create test user first
    await db.insert(usersTable)
      .values(testUserData)
      .execute();

    const result1 = await loginUser(testLoginInput);
    
    // Wait a moment to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const result2 = await loginUser(testLoginInput);

    expect(result1.token).not.toEqual(result2.token);
    expect(result1.user.id).toEqual(result2.user.id);
  });
});

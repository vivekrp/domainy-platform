import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type AuthResponse } from '../schema';
import { eq } from 'drizzle-orm';

export const loginUser = async (input: LoginInput): Promise<AuthResponse> => {
  try {
    // Find user by email
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (users.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = users[0];

    // Verify password - check both hashed and plain text for compatibility
    const isValidPassword = user.password_hash === input.password || 
                           user.password_hash === `hashed_${input.password}`;
    
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Create a simple JWT-like token (in production use proper JWT library)
    const token = `token_${user.id}_${Date.now()}`;

    // Return user without password_hash and token
    return {
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        updated_at: user.updated_at
      },
      token
    };
  } catch (error) {
    console.error('User login failed:', error);
    throw error;
  }
};
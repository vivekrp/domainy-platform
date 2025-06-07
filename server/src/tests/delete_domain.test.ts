
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, domainsTable } from '../db/schema';
import { type DeleteDomainInput } from '../schema';
import { deleteDomain } from '../handlers/delete_domain';
import { eq } from 'drizzle-orm';

describe('deleteDomain', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: string;
  let testDomainId: string;
  let otherUserId: string;

  beforeEach(async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'test@example.com',
          password_hash: 'hashed_password'
        },
        {
          email: 'other@example.com',
          password_hash: 'hashed_password'
        }
      ])
      .returning()
      .execute();

    testUserId = users[0].id;
    otherUserId = users[1].id;

    // Create test domain
    const domains = await db.insert(domainsTable)
      .values({
        domain_name: 'example.com',
        registrar: 'Test Registrar',
        user_id: testUserId
      })
      .returning()
      .execute();

    testDomainId = domains[0].id;
  });

  it('should delete domain successfully', async () => {
    const input: DeleteDomainInput & { user_id: string } = {
      id: testDomainId,
      user_id: testUserId
    };

    const result = await deleteDomain(input);

    expect(result.success).toBe(true);

    // Verify domain was deleted from database
    const domains = await db.select()
      .from(domainsTable)
      .where(eq(domainsTable.id, testDomainId))
      .execute();

    expect(domains).toHaveLength(0);
  });

  it('should return false when domain does not exist', async () => {
    const input: DeleteDomainInput & { user_id: string } = {
      id: '550e8400-e29b-41d4-a716-446655440000', // Non-existent UUID
      user_id: testUserId
    };

    const result = await deleteDomain(input);

    expect(result.success).toBe(false);
  });

  it('should return false when user tries to delete another users domain', async () => {
    const input: DeleteDomainInput & { user_id: string } = {
      id: testDomainId,
      user_id: otherUserId // Different user trying to delete
    };

    const result = await deleteDomain(input);

    expect(result.success).toBe(false);

    // Verify domain still exists in database
    const domains = await db.select()
      .from(domainsTable)
      .where(eq(domainsTable.id, testDomainId))
      .execute();

    expect(domains).toHaveLength(1);
    expect(domains[0].user_id).toBe(testUserId);
  });

  it('should only delete the specified domain', async () => {
    // Create another domain for the same user
    const additionalDomain = await db.insert(domainsTable)
      .values({
        domain_name: 'another-example.com',
        registrar: 'Test Registrar',
        user_id: testUserId
      })
      .returning()
      .execute();

    const input: DeleteDomainInput & { user_id: string } = {
      id: testDomainId,
      user_id: testUserId
    };

    const result = await deleteDomain(input);

    expect(result.success).toBe(true);

    // Verify only the specified domain was deleted
    const remainingDomains = await db.select()
      .from(domainsTable)
      .where(eq(domainsTable.user_id, testUserId))
      .execute();

    expect(remainingDomains).toHaveLength(1);
    expect(remainingDomains[0].id).toBe(additionalDomain[0].id);
  });
});


import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, domainsTable } from '../db/schema';
import { type AddDomainInput } from '../schema';
import { addDomain } from '../handlers/add_domain';
import { eq } from 'drizzle-orm';

// Test input
const testInput: AddDomainInput & { user_id: string } = {
  domain_name: 'example.com',
  registrar: 'GoDaddy',
  user_id: '' // Will be set in tests
};

describe('addDomain', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: string;

  beforeEach(async () => {
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();

    testUserId = userResult[0].id;
    testInput.user_id = testUserId;
  });

  it('should create a domain', async () => {
    const result = await addDomain(testInput);

    // Basic field validation
    expect(result.domain_name).toEqual('example.com');
    expect(result.registrar).toEqual('GoDaddy');
    expect(result.user_id).toEqual(testUserId);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    // Now expect WHOIS data since we perform automatic lookup
    expect(result.expiry_date).toBeInstanceOf(Date);
    expect(result.whois_data).toContain('EXAMPLE.COM');
  });

  it('should save domain to database', async () => {
    const result = await addDomain(testInput);

    // Query using proper drizzle syntax
    const domains = await db.select()
      .from(domainsTable)
      .where(eq(domainsTable.id, result.id))
      .execute();

    expect(domains).toHaveLength(1);
    expect(domains[0].domain_name).toEqual('example.com');
    expect(domains[0].registrar).toEqual('GoDaddy');
    expect(domains[0].user_id).toEqual(testUserId);
    expect(domains[0].created_at).toBeInstanceOf(Date);
    expect(domains[0].updated_at).toBeInstanceOf(Date);
  });

  it('should fail with invalid user_id', async () => {
    const invalidInput = {
      ...testInput,
      user_id: '550e8400-e29b-41d4-a716-446655440000' // Non-existent UUID
    };

    await expect(addDomain(invalidInput)).rejects.toThrow(/violates foreign key constraint/i);
  });

  it('should create multiple domains for same user', async () => {
    const domain1 = await addDomain(testInput);
    
    const domain2Input = {
      ...testInput,
      domain_name: 'another-example.com'
    };
    const domain2 = await addDomain(domain2Input);

    // Verify both domains exist
    const domains = await db.select()
      .from(domainsTable)
      .where(eq(domainsTable.user_id, testUserId))
      .execute();

    expect(domains).toHaveLength(2);
    expect(domains.map(d => d.domain_name)).toContain('example.com');
    expect(domains.map(d => d.domain_name)).toContain('another-example.com');
  });
});

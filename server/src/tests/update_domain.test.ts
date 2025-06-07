
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, domainsTable } from '../db/schema';
import { type UpdateDomainInput } from '../schema';
import { updateDomain } from '../handlers/update_domain';
import { eq } from 'drizzle-orm';

describe('updateDomain', () => {
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
          password_hash: 'other_hashed_password'
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
        expiry_date: new Date('2024-12-31'),
        whois_data: 'Original WHOIS data',
        user_id: testUserId
      })
      .returning()
      .execute();

    testDomainId = domains[0].id;
  });

  it('should update domain name', async () => {
    const input: UpdateDomainInput & { user_id: string } = {
      id: testDomainId,
      domain_name: 'updated-example.com',
      user_id: testUserId
    };

    const result = await updateDomain(input);

    expect(result.domain_name).toEqual('updated-example.com');
    expect(result.registrar).toEqual('Test Registrar'); // Unchanged
    expect(result.id).toEqual(testDomainId);
    expect(result.user_id).toEqual(testUserId);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update registrar', async () => {
    const input: UpdateDomainInput & { user_id: string } = {
      id: testDomainId,
      registrar: 'New Registrar',
      user_id: testUserId
    };

    const result = await updateDomain(input);

    expect(result.registrar).toEqual('New Registrar');
    expect(result.domain_name).toEqual('example.com'); // Unchanged
    expect(result.id).toEqual(testDomainId);
  });

  it('should update expiry date', async () => {
    const newExpiryDate = new Date('2025-06-15');
    const input: UpdateDomainInput & { user_id: string } = {
      id: testDomainId,
      expiry_date: newExpiryDate,
      user_id: testUserId
    };

    const result = await updateDomain(input);

    expect(result.expiry_date).toEqual(newExpiryDate);
    expect(result.domain_name).toEqual('example.com'); // Unchanged
  });

  it('should update whois data', async () => {
    const input: UpdateDomainInput & { user_id: string } = {
      id: testDomainId,
      whois_data: 'Updated WHOIS information',
      user_id: testUserId
    };

    const result = await updateDomain(input);

    expect(result.whois_data).toEqual('Updated WHOIS information');
    expect(result.domain_name).toEqual('example.com'); // Unchanged
  });

  it('should update multiple fields at once', async () => {
    const newExpiryDate = new Date('2025-03-20');
    const input: UpdateDomainInput & { user_id: string } = {
      id: testDomainId,
      domain_name: 'multi-update.com',
      registrar: 'Multi Registrar',
      expiry_date: newExpiryDate,
      whois_data: 'Multi-field WHOIS data',
      user_id: testUserId
    };

    const result = await updateDomain(input);

    expect(result.domain_name).toEqual('multi-update.com');
    expect(result.registrar).toEqual('Multi Registrar');
    expect(result.expiry_date).toEqual(newExpiryDate);
    expect(result.whois_data).toEqual('Multi-field WHOIS data');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should set expiry date to null', async () => {
    const input: UpdateDomainInput & { user_id: string } = {
      id: testDomainId,
      expiry_date: null,
      user_id: testUserId
    };

    const result = await updateDomain(input);

    expect(result.expiry_date).toBeNull();
    expect(result.domain_name).toEqual('example.com'); // Unchanged
  });

  it('should update the domain in database', async () => {
    const input: UpdateDomainInput & { user_id: string } = {
      id: testDomainId,
      domain_name: 'db-check.com',
      user_id: testUserId
    };

    await updateDomain(input);

    // Verify update in database
    const domains = await db.select()
      .from(domainsTable)
      .where(eq(domainsTable.id, testDomainId))
      .execute();

    expect(domains).toHaveLength(1);
    expect(domains[0].domain_name).toEqual('db-check.com');
    expect(domains[0].updated_at).toBeInstanceOf(Date);
  });

  it('should fail when domain does not exist', async () => {
    const input: UpdateDomainInput & { user_id: string } = {
      id: '00000000-0000-0000-0000-000000000000', // Non-existent ID
      domain_name: 'nonexistent.com',
      user_id: testUserId
    };

    await expect(updateDomain(input)).rejects.toThrow(/not found or access denied/i);
  });

  it('should fail when user does not own domain', async () => {
    const input: UpdateDomainInput & { user_id: string } = {
      id: testDomainId,
      domain_name: 'unauthorized.com',
      user_id: otherUserId // Different user
    };

    await expect(updateDomain(input)).rejects.toThrow(/not found or access denied/i);
  });

  it('should update only updated_at when no fields provided', async () => {
    const input: UpdateDomainInput & { user_id: string } = {
      id: testDomainId,
      user_id: testUserId
    };

    const originalDomain = await db.select()
      .from(domainsTable)
      .where(eq(domainsTable.id, testDomainId))
      .execute();

    const result = await updateDomain(input);

    expect(result.domain_name).toEqual(originalDomain[0].domain_name);
    expect(result.registrar).toEqual(originalDomain[0].registrar);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalDomain[0].updated_at.getTime());
  });
});

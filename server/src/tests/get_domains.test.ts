
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, domainsTable } from '../db/schema';
import { getDomains } from '../handlers/get_domains';

describe('getDomains', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: string;
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
  });

  it('should return domains for specific user', async () => {
    // Create domains for test user
    await db.insert(domainsTable)
      .values([
        {
          domain_name: 'example.com',
          registrar: 'GoDaddy',
          expiry_date: new Date('2025-01-01'),
          user_id: testUserId
        },
        {
          domain_name: 'test.org',
          registrar: 'Namecheap',
          expiry_date: new Date('2024-12-31'),
          user_id: testUserId
        }
      ])
      .execute();

    // Create domain for other user
    await db.insert(domainsTable)
      .values({
        domain_name: 'other.com',
        registrar: 'GoDaddy',
        expiry_date: new Date('2025-01-01'),
        user_id: otherUserId
      })
      .execute();

    const result = await getDomains(testUserId);

    expect(result).toHaveLength(2);
    expect(result.map(d => d.domain_name)).toEqual(['example.com', 'test.org']);
    expect(result.every(d => d.user_id === testUserId)).toBe(true);
  });

  it('should return empty array for user with no domains', async () => {
    const result = await getDomains(testUserId);
    expect(result).toHaveLength(0);
  });

  it('should calculate domain status correctly', async () => {
    const now = new Date();
    
    // Active domain: 60 days from now (well beyond 30 day threshold)
    const activeDomainDate = new Date(now);
    activeDomainDate.setDate(activeDomainDate.getDate() + 60);
    
    // Expiring soon: 15 days from now (within 30 day threshold)
    const expiringDomainDate = new Date(now);
    expiringDomainDate.setDate(expiringDomainDate.getDate() + 15);
    
    // Expired: 30 days ago
    const expiredDomainDate = new Date(now);
    expiredDomainDate.setDate(expiredDomainDate.getDate() - 30);

    await db.insert(domainsTable)
      .values([
        {
          domain_name: 'active.com',
          registrar: 'GoDaddy',
          expiry_date: activeDomainDate,
          user_id: testUserId
        },
        {
          domain_name: 'expiring.com',
          registrar: 'Namecheap',
          expiry_date: expiringDomainDate,
          user_id: testUserId
        },
        {
          domain_name: 'expired.com',
          registrar: 'GoDaddy',
          expiry_date: expiredDomainDate,
          user_id: testUserId
        },
        {
          domain_name: 'unknown.com',
          registrar: 'GoDaddy',
          expiry_date: null,
          user_id: testUserId
        }
      ])
      .execute();

    const result = await getDomains(testUserId);

    const activeDomain = result.find(d => d.domain_name === 'active.com');
    const expiringDomain = result.find(d => d.domain_name === 'expiring.com');
    const expiredDomain = result.find(d => d.domain_name === 'expired.com');
    const unknownDomain = result.find(d => d.domain_name === 'unknown.com');

    expect(activeDomain?.status).toBe('green');
    expect(activeDomain?.days_until_expiry).toBeGreaterThan(30);

    expect(expiringDomain?.status).toBe('orange');
    expect(expiringDomain?.days_until_expiry).toBeLessThanOrEqual(30);
    expect(expiringDomain?.days_until_expiry).toBeGreaterThan(0);

    expect(expiredDomain?.status).toBe('red');
    expect(expiredDomain?.days_until_expiry).toBeLessThan(0);

    expect(unknownDomain?.status).toBe('unknown');
    expect(unknownDomain?.days_until_expiry).toBeNull();
  });

  it('should include all domain fields with status', async () => {
    await db.insert(domainsTable)
      .values({
        domain_name: 'example.com',
        registrar: 'GoDaddy',
        expiry_date: new Date('2025-01-01'),
        whois_data: 'sample whois data',
        user_id: testUserId
      })
      .execute();

    const result = await getDomains(testUserId);

    expect(result).toHaveLength(1);
    const domain = result[0];

    expect(domain.id).toBeDefined();
    expect(domain.domain_name).toBe('example.com');
    expect(domain.registrar).toBe('GoDaddy');
    expect(domain.expiry_date).toBeInstanceOf(Date);
    expect(domain.whois_data).toBe('sample whois data');
    expect(domain.user_id).toBe(testUserId);
    expect(domain.created_at).toBeInstanceOf(Date);
    expect(domain.updated_at).toBeInstanceOf(Date);
    expect(domain.status).toBeDefined();
    expect(domain.days_until_expiry).toBeDefined();
  });
});

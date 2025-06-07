import { db } from '../db';
import { domainsTable } from '../db/schema';
import { type DomainWithStatus, calculateDomainStatus } from '../schema';
import { eq } from 'drizzle-orm';

export const getDomains = async (user_id: string): Promise<DomainWithStatus[]> => {
  try {
    const results = await db.select()
      .from(domainsTable)
      .where(eq(domainsTable.user_id, user_id))
      .execute();

    return results.map(domain => {
      const { status, days_until_expiry } = calculateDomainStatus(domain);
      
      return {
        ...domain,
        status,
        days_until_expiry
      };
    });
  } catch (error) {
    console.error('Get domains failed:', error);
    throw error;
  }
};
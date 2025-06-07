
import { db } from '../db';
import { domainsTable } from '../db/schema';
import { type DomainWithStatus, domainStatusSchema } from '../schema';
import { eq } from 'drizzle-orm';

const calculateDomainStatus = (expiryDate: Date | null): { status: string; days_until_expiry: number | null } => {
  if (!expiryDate) {
    return { status: 'unknown', days_until_expiry: null };
  }

  const now = new Date();
  const diffTime = expiryDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { status: 'expired', days_until_expiry: diffDays };
  } else if (diffDays <= 30) {
    return { status: 'expiring_soon', days_until_expiry: diffDays };
  } else {
    return { status: 'active', days_until_expiry: diffDays };
  }
};

export const getDomains = async (user_id: string): Promise<DomainWithStatus[]> => {
  try {
    const results = await db.select()
      .from(domainsTable)
      .where(eq(domainsTable.user_id, user_id))
      .execute();

    return results.map(domain => {
      const { status, days_until_expiry } = calculateDomainStatus(domain.expiry_date);
      
      return {
        ...domain,
        status: domainStatusSchema.parse(status),
        days_until_expiry
      };
    });
  } catch (error) {
    console.error('Get domains failed:', error);
    throw error;
  }
};

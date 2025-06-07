
import { db } from '../db';
import { domainsTable } from '../db/schema';
import { type UpdateDomainInput, type Domain } from '../schema';
import { eq, and } from 'drizzle-orm';

export const updateDomain = async (input: UpdateDomainInput & { user_id: string }): Promise<Domain> => {
  try {
    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.domain_name !== undefined) {
      updateData.domain_name = input.domain_name;
    }

    if (input.registrar !== undefined) {
      updateData.registrar = input.registrar;
    }

    if (input.expiry_date !== undefined) {
      updateData.expiry_date = input.expiry_date;
    }

    if (input.whois_data !== undefined) {
      updateData.whois_data = input.whois_data;
    }

    // Update domain record with user ownership check
    const result = await db.update(domainsTable)
      .set(updateData)
      .where(and(
        eq(domainsTable.id, input.id),
        eq(domainsTable.user_id, input.user_id)
      ))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Domain not found or access denied');
    }

    return result[0];
  } catch (error) {
    console.error('Domain update failed:', error);
    throw error;
  }
};

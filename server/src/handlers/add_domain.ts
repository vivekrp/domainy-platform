
import { db } from '../db';
import { domainsTable } from '../db/schema';
import { type AddDomainInput, type Domain } from '../schema';

export const addDomain = async (input: AddDomainInput & { user_id: string }): Promise<Domain> => {
  try {
    // Insert domain record
    const result = await db.insert(domainsTable)
      .values({
        domain_name: input.domain_name,
        registrar: input.registrar,
        user_id: input.user_id
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Domain creation failed:', error);
    throw error;
  }
};

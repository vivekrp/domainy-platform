import { db } from '../db';
import { domainsTable } from '../db/schema';
import { type AddDomainInput, type Domain } from '../schema';
import { whoisLookup } from './whois_lookup';

export const addDomain = async (input: AddDomainInput & { user_id: string }): Promise<Domain> => {
  try {
    // Perform WHOIS lookup to get expiry date and data
    const whoisResult = await whoisLookup(input.domain_name);

    // Insert domain record with WHOIS data
    const result = await db.insert(domainsTable)
      .values({
        domain_name: input.domain_name,
        registrar: input.registrar,
        expiry_date: whoisResult.expiry_date,
        whois_data: whoisResult.whois_data,
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
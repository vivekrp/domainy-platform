import { db } from '../db';
import { domainsTable } from '../db/schema';
import { type DeleteDomainInput } from '../schema';
import { eq, and } from 'drizzle-orm';

export const deleteDomain = async (input: DeleteDomainInput & { user_id: string }): Promise<{ success: boolean }> => {
  try {
    // Delete domain only if it belongs to the user
    const result = await db.delete(domainsTable)
      .where(
        and(
          eq(domainsTable.id, input.id),
          eq(domainsTable.user_id, input.user_id)
        )
      )
      .execute();

    // Check if any rows were affected (domain was found and deleted)
    return { success: (result.rowCount ?? 0) > 0 };
  } catch (error) {
    console.error('Domain deletion failed:', error);
    throw error;
  }
};
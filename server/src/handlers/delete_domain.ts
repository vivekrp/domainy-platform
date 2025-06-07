
import { type DeleteDomainInput } from '../schema';

export declare function deleteDomain(input: DeleteDomainInput & { user_id: string }): Promise<{ success: boolean }>;


import { type UpdateDomainInput, type Domain } from '../schema';

export declare function updateDomain(input: UpdateDomainInput & { user_id: string }): Promise<Domain>;

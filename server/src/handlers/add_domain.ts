
import { type AddDomainInput, type Domain } from '../schema';

export declare function addDomain(input: AddDomainInput & { user_id: string }): Promise<Domain>;

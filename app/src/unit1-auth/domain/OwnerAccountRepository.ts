import { OwnerAccount } from "./OwnerAccount";
import { EmailAddress } from "./EmailAddress";

/**
 * リポジトリインターフェース: OwnerAccountRepository
 */
export interface OwnerAccountRepository {
  save(account: OwnerAccount): Promise<void>;
  findById(ownerId: string): Promise<OwnerAccount | null>;
  findByEmail(email: EmailAddress): Promise<OwnerAccount | null>;
  findAll(): Promise<OwnerAccount[]>;
}

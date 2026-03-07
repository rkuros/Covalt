import { AdminAccount } from "./AdminAccount";
import { EmailAddress } from "./EmailAddress";

/**
 * リポジトリインターフェース: AdminAccountRepository
 */
export interface AdminAccountRepository {
  save(account: AdminAccount): Promise<void>;
  findById(adminId: string): Promise<AdminAccount | null>;
  findByEmail(email: EmailAddress): Promise<AdminAccount | null>;
}

import { AdminAccount } from "./AdminAccount";
import { AdminAccountRepository } from "./AdminAccountRepository";
import { EmailAddress } from "./EmailAddress";

/**
 * InMemory 実装: AdminAccountRepository
 */
export class InMemoryAdminAccountRepository implements AdminAccountRepository {
  private readonly store = new Map<string, AdminAccount>();

  async save(account: AdminAccount): Promise<void> {
    this.store.set(account.adminId, account);
  }

  async findById(adminId: string): Promise<AdminAccount | null> {
    return this.store.get(adminId) ?? null;
  }

  async findByEmail(email: EmailAddress): Promise<AdminAccount | null> {
    for (const account of this.store.values()) {
      if (account.email.equals(email)) {
        return account;
      }
    }
    return null;
  }
}

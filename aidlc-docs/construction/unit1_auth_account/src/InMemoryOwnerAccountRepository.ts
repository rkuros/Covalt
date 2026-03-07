import { OwnerAccount } from "./OwnerAccount";
import { OwnerAccountRepository } from "./OwnerAccountRepository";
import { EmailAddress } from "./EmailAddress";

/**
 * InMemory 実装: OwnerAccountRepository
 */
export class InMemoryOwnerAccountRepository implements OwnerAccountRepository {
  private readonly store = new Map<string, OwnerAccount>();

  async save(account: OwnerAccount): Promise<void> {
    this.store.set(account.ownerId, account);
  }

  async findById(ownerId: string): Promise<OwnerAccount | null> {
    return this.store.get(ownerId) ?? null;
  }

  async findByEmail(email: EmailAddress): Promise<OwnerAccount | null> {
    for (const account of this.store.values()) {
      if (account.email.equals(email)) {
        return account;
      }
    }
    return null;
  }

  async findAll(): Promise<OwnerAccount[]> {
    return Array.from(this.store.values());
  }
}

import { Customer } from "./Customer";
import { CustomerId } from "./CustomerId";
import { OwnerId } from "./OwnerId";
import { LineUserId } from "./LineUserId";
import { CustomerRepository } from "./CustomerRepository";

/**
 * InMemoryCustomerRepository - テスト・開発用のインメモリ実装
 */
export class InMemoryCustomerRepository implements CustomerRepository {
  private readonly store: Map<string, Customer> = new Map();

  async findById(customerId: CustomerId): Promise<Customer | null> {
    return this.store.get(customerId.value) ?? null;
  }

  async findByOwnerAndLineUserId(
    ownerId: OwnerId,
    lineUserId: LineUserId
  ): Promise<Customer | null> {
    for (const customer of this.store.values()) {
      if (
        customer.ownerId.equals(ownerId) &&
        customer.lineUserId !== null &&
        customer.lineUserId.equals(lineUserId)
      ) {
        return customer;
      }
    }
    return null;
  }

  async searchByName(
    ownerId: OwnerId,
    query: string
  ): Promise<Customer[]> {
    const results: Customer[] = [];
    for (const customer of this.store.values()) {
      if (
        customer.ownerId.equals(ownerId) &&
        customer.customerName.value.includes(query)
      ) {
        results.push(customer);
      }
    }
    return results;
  }

  async save(customer: Customer): Promise<void> {
    this.store.set(customer.customerId.value, customer);
  }

  /** テスト用: ストアをクリアする */
  clear(): void {
    this.store.clear();
  }

  /** テスト用: 保存件数を返す */
  count(): number {
    return this.store.size;
  }
}

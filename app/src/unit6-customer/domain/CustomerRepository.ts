import { Customer } from './Customer';
import { CustomerId } from './CustomerId';
import { OwnerId } from './OwnerId';
import { LineUserId } from './LineUserId';

/**
 * CustomerRepository - 顧客リポジトリインターフェース
 */
export interface CustomerRepository {
  /** 顧客 ID による単一取得 */
  findById(customerId: CustomerId): Promise<Customer | null>;

  /** ownerId + lineUserId の組み合わせで検索 */
  findByOwnerAndLineUserId(
    ownerId: OwnerId,
    lineUserId: LineUserId,
  ): Promise<Customer | null>;

  /** 顧客名の部分一致検索（ownerIdスコープ） */
  searchByName(ownerId: OwnerId, query: string): Promise<Customer[]>;

  /** 顧客を永続化する（新規・更新兼用） */
  save(customer: Customer): Promise<void>;
}

import { Customer, CustomerResponse, CustomerSearchResult } from './Customer';
import { CustomerId } from './CustomerId';
import { OwnerId } from './OwnerId';
import { LineUserId } from './LineUserId';
import { CustomerRepository } from './CustomerRepository';

/** GET /api/customers/search のレスポンス */
export interface CustomerSearchResponse {
  customers: CustomerSearchResult[];
  total: number;
}

/**
 * CustomerQueryService - 顧客検索アプリケーションサービス
 *
 * ID 検索・LINE ユーザー ID 検索・名前検索を処理する。
 * すべての検索は ownerId によるスコープ制限を適用（テナント分離）。
 */
export class CustomerQueryService {
  constructor(private readonly repository: CustomerRepository) {}

  /**
   * A6: 顧客 ID による単一取得
   * GET /api/customers/{customerId}
   *
   * @returns 顧客レスポンス。見つからない場合は null。
   */
  async findById(customerId: string): Promise<CustomerResponse | null> {
    const id = CustomerId.create(customerId);
    const customer = await this.repository.findById(id);
    if (!customer) {
      return null;
    }
    return customer.toResponse();
  }

  /**
   * A7: LINE ユーザー ID による顧客検索
   * GET /api/customers/by-line-user?ownerId=...&lineUserId=...
   *
   * @returns 顧客レスポンス。見つからない場合は null。
   */
  async findByLineUserId(
    ownerId: string,
    lineUserId: string,
  ): Promise<CustomerResponse | null> {
    const owner = OwnerId.create(ownerId);
    const lineUser = LineUserId.create(lineUserId);
    const customer = await this.repository.findByOwnerAndLineUserId(
      owner,
      lineUser,
    );
    if (!customer) {
      return null;
    }
    return customer.toResponse();
  }

  /**
   * A8: 顧客名の部分一致検索
   * GET /api/customers/search?ownerId=...&q=...
   *
   * BR-2: 顧客名による検索（部分一致）が可能であること
   */
  async searchByName(
    ownerId: string,
    query: string,
  ): Promise<CustomerSearchResponse> {
    const owner = OwnerId.create(ownerId);
    const customers = await this.repository.searchByName(owner, query);
    return {
      customers: customers.map((c) => c.toSearchResult()),
      total: customers.length,
    };
  }
}

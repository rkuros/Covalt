import { Customer, CustomerResponse } from './Customer';
import { CustomerId } from './CustomerId';
import { OwnerId } from './OwnerId';
import { CustomerName } from './CustomerName';
import { LineUserId } from './LineUserId';
import { DisplayName } from './DisplayName';
import { CustomerRepository } from './CustomerRepository';

/**
 * CustomerCommandService - 顧客コマンドアプリケーションサービス
 *
 * 顧客の新規作成（手動 / LINE 友だち追加）および情報編集を処理する。
 */
export class CustomerCommandService {
  constructor(private readonly repository: CustomerRepository) {}

  /**
   * 手動による新規顧客作成（BR-7）
   * POST /api/customers
   *
   * LINE 連携なしの顧客を手動で新規登録する。
   */
  async createManual(params: {
    ownerId: string;
    customerName: string;
  }): Promise<CustomerResponse> {
    const ownerId = OwnerId.create(params.ownerId);
    const customerName = CustomerName.create(params.customerName);

    const customer = Customer.createManual({ ownerId, customerName });
    await this.repository.save(customer);

    console.log(
      `[CustomerCommandService] Manual customer created: ${customer.customerId.value}`,
    );

    return customer.toResponse();
  }

  /**
   * LINE 友だち追加による顧客自動登録（BR-8, BR-9）
   *
   * 冪等性: ownerId + lineUserId の組み合わせで既存顧客をチェックし、
   * 既に存在する場合は重複登録を行わない。
   *
   * @returns 作成または既存の顧客レスポンス
   */
  async createFromLineFollow(params: {
    ownerId: string;
    lineUserId: string;
    displayName: string;
  }): Promise<CustomerResponse> {
    const ownerId = OwnerId.create(params.ownerId);
    const lineUserId = LineUserId.create(params.lineUserId);
    const displayName = DisplayName.create(params.displayName);

    // BR-9: 冪等性の担保 -- 既存顧客チェック
    const existing = await this.repository.findByOwnerAndLineUserId(
      ownerId,
      lineUserId,
    );
    if (existing) {
      console.log(
        `[CustomerCommandService] Customer already exists for ownerId=${ownerId.value}, lineUserId=${lineUserId.value}. Skipping creation.`,
      );
      return existing.toResponse();
    }

    const customer = Customer.createFromLineFollow({
      ownerId,
      lineUserId,
      displayName,
    });
    await this.repository.save(customer);

    console.log(
      `[CustomerCommandService] LINE follow customer created: ${customer.customerId.value}`,
    );

    return customer.toResponse();
  }

  /**
   * 顧客名の変更（BR-6）
   *
   * @returns 更新後の顧客レスポンス。見つからない場合は null。
   */
  async updateName(
    customerId: string,
    newName: string,
  ): Promise<CustomerResponse | null> {
    const id = CustomerId.create(customerId);
    const customer = await this.repository.findById(id);
    if (!customer) {
      return null;
    }

    customer.changeName(CustomerName.create(newName));
    await this.repository.save(customer);

    console.log(
      `[CustomerCommandService] Customer name updated: ${customer.customerId.value}`,
    );

    return customer.toResponse();
  }
}

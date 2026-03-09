/**
 * CustomerGateway - Unit 6（顧客情報管理）の顧客 API 用 Gateway インターフェース
 */
import { CustomerId } from './CustomerId';
import { OwnerId } from './OwnerId';
import { LineUserId } from './LineUserId';

export interface CustomerInfo {
  readonly customerId: string;
  readonly ownerId: string;
  readonly customerName: string;
  readonly displayName: string | null;
  readonly lineUserId: string | null;
  readonly isLineLinked: boolean;
  readonly registeredAt: string;
}

export interface CustomerSearchResult {
  readonly customers: readonly {
    readonly customerId: string;
    readonly customerName: string;
    readonly isLineLinked: boolean;
  }[];
  readonly total: number;
}

export interface CustomerGateway {
  /** 顧客IDで顧客情報を取得する。存在しない場合は null を返す。 */
  findById(customerId: CustomerId): Promise<CustomerInfo | null>;

  /** LINE ユーザーIDで顧客を検索する。顧客操作時の顧客特定に使用。 */
  findByLineUserId(
    ownerId: OwnerId,
    lineUserId: LineUserId,
  ): Promise<CustomerInfo | null>;

  /** 顧客名で検索する。オーナーの手動予約時の顧客選択に使用。 */
  searchByName(ownerId: OwnerId, query: string): Promise<CustomerSearchResult>;

  /** 新規顧客を作成する。オーナーの手動予約時に新規顧客を登録する場合に使用。 */
  create(ownerId: OwnerId, customerName: string): Promise<CustomerInfo>;

  /** LINE ユーザーIDで顧客を検索し、存在しなければ自動作成する。LIFF 予約時に使用。 */
  findOrCreateByLineUserId(
    ownerId: OwnerId,
    lineUserId: LineUserId,
    displayName: string,
  ): Promise<CustomerInfo>;
}

import { CustomerId } from './CustomerId';
import { OwnerId } from './OwnerId';
import { CustomerName } from './CustomerName';
import { LineUserId } from './LineUserId';
import { DisplayName } from './DisplayName';

/**
 * Customer - 顧客の集約ルート
 *
 * customerId を識別子とし、オーナーとの所属関係・LINE 連携状態・個人情報を保持する。
 */
export class Customer {
  readonly customerId: CustomerId;
  readonly ownerId: OwnerId;
  private _customerName: CustomerName;
  private _displayName: DisplayName | null;
  private _lineUserId: LineUserId | null;
  private _isLineLinked: boolean;
  readonly registeredAt: Date;
  private _birthDate: string | null;
  private _gender: string | null;

  private constructor(params: {
    customerId: CustomerId;
    ownerId: OwnerId;
    customerName: CustomerName;
    displayName: DisplayName | null;
    lineUserId: LineUserId | null;
    isLineLinked: boolean;
    registeredAt: Date;
    birthDate?: string | null;
    gender?: string | null;
  }) {
    this.customerId = params.customerId;
    this.ownerId = params.ownerId;
    this._customerName = params.customerName;
    this._displayName = params.displayName;
    this._lineUserId = params.lineUserId;
    this._isLineLinked = params.isLineLinked;
    this.registeredAt = params.registeredAt;
    this._birthDate = params.birthDate ?? null;
    this._gender = params.gender ?? null;
  }

  /**
   * 手動登録による顧客作成（LINE 連携なし）
   */
  static createManual(params: {
    ownerId: OwnerId;
    customerName: CustomerName;
  }): Customer {
    return new Customer({
      customerId: CustomerId.generate(),
      ownerId: params.ownerId,
      customerName: params.customerName,
      displayName: null,
      lineUserId: null,
      isLineLinked: false,
      registeredAt: new Date(),
    });
  }

  /**
   * LINE 友だち追加による自動登録で顧客を作成
   * customerName には displayName の値を初期値として設定する
   */
  static createFromLineFollow(params: {
    ownerId: OwnerId;
    lineUserId: LineUserId;
    displayName: DisplayName;
  }): Customer {
    return new Customer({
      customerId: CustomerId.generate(),
      ownerId: params.ownerId,
      customerName: CustomerName.create(params.displayName.value),
      displayName: params.displayName,
      lineUserId: params.lineUserId,
      isLineLinked: true,
      registeredAt: new Date(),
    });
  }

  /**
   * 永続化データからの復元用ファクトリ
   */
  static reconstruct(params: {
    customerId: CustomerId;
    ownerId: OwnerId;
    customerName: CustomerName;
    displayName: DisplayName | null;
    lineUserId: LineUserId | null;
    isLineLinked: boolean;
    registeredAt: Date;
    birthDate?: string | null;
    gender?: string | null;
  }): Customer {
    return new Customer(params);
  }

  get customerName(): CustomerName {
    return this._customerName;
  }

  get displayName(): DisplayName | null {
    return this._displayName;
  }

  get lineUserId(): LineUserId | null {
    return this._lineUserId;
  }

  get isLineLinked(): boolean {
    return this._isLineLinked;
  }

  /**
   * 顧客名を変更する（BR-6: 顧客名等の情報を編集し保存できること）
   */
  changeName(newName: CustomerName): void {
    this._customerName = newName;
  }

  /**
   * API レスポンス用の単一顧客表現を返す
   */
  toResponse(): CustomerResponse {
    return {
      customerId: this.customerId.value,
      ownerId: this.ownerId.value,
      customerName: this._customerName.value,
      displayName: this._displayName?.value ?? null,
      lineUserId: this._lineUserId?.value ?? null,
      isLineLinked: this._isLineLinked,
      registeredAt: this.registeredAt.toISOString().replace(/\.\d{3}Z$/, 'Z'),
      birthDate: this._birthDate,
      gender: this._gender,
    };
  }

  /**
   * 検索結果用のサマリ表現を返す
   */
  toSearchResult(): CustomerSearchResult {
    return {
      customerId: this.customerId.value,
      customerName: this._customerName.value,
      isLineLinked: this._isLineLinked,
    };
  }
}

/** GET /api/customers/{id}, GET /api/customers/by-line-user, POST /api/customers レスポンス */
export interface CustomerResponse {
  customerId: string;
  ownerId: string;
  customerName: string;
  displayName: string | null;
  lineUserId: string | null;
  isLineLinked: boolean;
  registeredAt: string;
  birthDate: string | null;
  gender: string | null;
}

/** GET /api/customers/search の各要素 */
export interface CustomerSearchResult {
  customerId: string;
  customerName: string;
  isLineLinked: boolean;
}

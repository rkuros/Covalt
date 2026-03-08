/**
 * ReservationCommandService - 予約コマンドサービス（ドメインサービス）
 *
 * 予約の作成・変更・キャンセル・完了の各コマンド操作において、
 * 集約の状態遷移に加えて外部コンテキストとの連携やドメインイベントの発行を含む
 * 一連のドメインロジックを提供する。
 *
 * 顧客操作（LIFF 経由）とオーナー操作（Web 管理画面経由）を統合し、
 * ActorType で分岐する。
 */
import { Reservation } from './Reservation';
import { ReservationId } from './ReservationId';
import { OwnerId } from './OwnerId';
import { CustomerId } from './CustomerId';
import { SlotId } from './SlotId';
import { ReservationDateTime } from './ReservationDateTime';
import { DurationMinutes } from './DurationMinutes';
import { CustomerName } from './CustomerName';
import { LineUserId } from './LineUserId';
import { ActorType } from './ActorType';
import { ReservationRepository } from './ReservationRepository';
import { SlotGateway } from './SlotGateway';
import { CustomerGateway } from './CustomerGateway';
import { EventPublisher } from './EventPublisher';

// --- Command DTOs ---

export interface CreateReservationCommand {
  readonly ownerId: string;
  readonly customerId?: string;     // オーナー操作時（既存顧客選択）
  readonly lineUserId?: string;     // 顧客操作時
  readonly slotId: string;
  readonly dateTime: string;        // ISO 8601
  readonly durationMinutes: number;
  readonly createdBy: ActorType;
  readonly newCustomerName?: string; // オーナー操作時（新規顧客作成）
}

export interface ModifyReservationCommand {
  readonly reservationId: string;
  readonly newSlotId: string;
  readonly newDateTime: string;      // ISO 8601
  readonly newDurationMinutes: number;
  readonly modifiedBy: ActorType;
}

export interface CancelReservationCommand {
  readonly reservationId: string;
  readonly cancelledBy: ActorType;
}

export interface CompleteReservationCommand {
  readonly reservationId: string;
}

export class ReservationCommandService {
  constructor(
    private readonly reservationRepository: ReservationRepository,
    private readonly slotGateway: SlotGateway,
    private readonly customerGateway: CustomerGateway,
    private readonly eventPublisher: EventPublisher,
  ) {}

  /**
   * 予約を新規作成する。
   *
   * 1. 顧客情報の取得（スナップショット用）
   * 2. スロット情報の取得
   * 3. スロットを予約確保
   * 4. Reservation 集約を生成
   * 5. 永続化
   * 6. ReservationCreated イベントを発行
   */
  async createReservation(command: CreateReservationCommand): Promise<Reservation> {
    // 1. 顧客情報の取得
    const customerInfo = await this.resolveCustomer(command);

    // 2. スロット情報の取得
    const slotId = SlotId.create(command.slotId);
    const ownerId = OwnerId.create(command.ownerId);
    const reservationId = ReservationId.generate();

    // 3. スロットを予約確保（スロットの実際の日時情報を取得）
    const slotResult = await this.slotGateway.reserveSlot(slotId, reservationId);

    // 4. Reservation 集約を生成（dateTimeはスロットのstartTimeから導出）
    const slotDateTime = `${slotResult.date}T${slotResult.startTime}:00+09:00`;
    const reservation = Reservation.create({
      reservationId,
      ownerId,
      customerId: CustomerId.create(customerInfo.customerId),
      slotId,
      dateTime: ReservationDateTime.create(slotDateTime),
      durationMinutes: DurationMinutes.create(slotResult.durationMinutes),
      customerName: CustomerName.create(customerInfo.customerName),
      lineUserId: LineUserId.create(customerInfo.lineUserId),
      ownerLineUserId: LineUserId.create(customerInfo.ownerLineUserId),
      createdBy: command.createdBy,
    });

    // 5. 永続化
    await this.reservationRepository.save(reservation);

    // 6. ドメインイベントを発行
    for (const event of reservation.domainEvents) {
      await this.eventPublisher.publish(event);
    }
    reservation.clearDomainEvents();

    return reservation;
  }

  /**
   * 予約を変更する。
   *
   * 1. 対象予約を取得
   * 2. 旧スロットを解放
   * 3. 新スロットを予約確保
   * 4. Reservation.modify() で集約を更新
   * 5. 永続化
   * 6. ReservationModified イベントを発行
   */
  async modifyReservation(command: ModifyReservationCommand): Promise<Reservation> {
    const reservationId = ReservationId.create(command.reservationId);
    const reservation = await this.findReservationOrThrow(reservationId);

    const newSlotId = SlotId.create(command.newSlotId);
    const oldSlotId = reservation.slotId;

    // 新スロットを先に予約確保（失敗しても旧スロットは安全）
    const newSlotResult = await this.slotGateway.reserveSlot(newSlotId, reservationId);

    // 新スロット確保成功後に旧スロットを解放
    await this.slotGateway.releaseSlot(oldSlotId, reservationId);

    // 集約を更新（不変条件の検証 + 履歴追加）
    reservation.modify({
      newSlotId,
      newDateTime: ReservationDateTime.create(`${newSlotResult.date}T${newSlotResult.startTime}:00+09:00`),
      newDurationMinutes: DurationMinutes.create(newSlotResult.durationMinutes),
      modifiedBy: command.modifiedBy,
    });

    // 永続化
    await this.reservationRepository.save(reservation);

    // ドメインイベントを発行
    for (const event of reservation.domainEvents) {
      await this.eventPublisher.publish(event);
    }
    reservation.clearDomainEvents();

    return reservation;
  }

  /**
   * 予約をキャンセルする。
   *
   * 1. 対象予約を取得
   * 2. Reservation.cancel() で集約を更新
   * 3. スロットを解放
   * 4. 永続化
   * 5. ReservationCancelled イベントを発行
   */
  async cancelReservation(command: CancelReservationCommand): Promise<Reservation> {
    const reservationId = ReservationId.create(command.reservationId);
    const reservation = await this.findReservationOrThrow(reservationId);

    // 集約を更新（不変条件の検証 + 履歴追加）
    reservation.cancel(command.cancelledBy);

    // スロットを解放
    await this.slotGateway.releaseSlot(reservation.slotId, reservationId);

    // 永続化
    await this.reservationRepository.save(reservation);

    // ドメインイベントを発行
    for (const event of reservation.domainEvents) {
      await this.eventPublisher.publish(event);
    }
    reservation.clearDomainEvents();

    return reservation;
  }

  /**
   * 予約を完了する。
   *
   * 1. 対象予約を取得
   * 2. Reservation.complete() で集約を更新
   * 3. 永続化
   *
   * 現時点では完了イベントの Consumer が存在しないため、ドメインイベントは発行しない。
   */
  async completeReservation(command: CompleteReservationCommand): Promise<Reservation> {
    const reservationId = ReservationId.create(command.reservationId);
    const reservation = await this.findReservationOrThrow(reservationId);

    // 集約を更新（不変条件の検証 + 履歴追加）
    reservation.complete();

    // 永続化
    await this.reservationRepository.save(reservation);

    return reservation;
  }

  // --- Private helpers ---

  private async findReservationOrThrow(reservationId: ReservationId): Promise<Reservation> {
    const reservation = await this.reservationRepository.findById(reservationId);
    if (!reservation) {
      throw new Error(`Reservation not found: ${reservationId.value}`);
    }
    return reservation;
  }

  /**
   * コマンドに応じて顧客情報を解決する。
   * 返却値はスナップショット用の情報をまとめたもの。
   */
  private async resolveCustomer(command: CreateReservationCommand): Promise<{
    customerId: string;
    customerName: string;
    lineUserId: string | null;
    ownerLineUserId: string | null;
    dateTime: string;
    durationMinutes: number;
  }> {
    const ownerId = OwnerId.create(command.ownerId);

    if (command.createdBy === ActorType.Customer) {
      // 顧客操作: LINE ユーザーIDで顧客を特定
      if (!command.lineUserId) {
        throw new Error('lineUserId is required for customer operation');
      }
      const lineUserId = LineUserId.create(command.lineUserId);
      if (!lineUserId) {
        throw new Error('Invalid lineUserId');
      }
      const customer = await this.customerGateway.findByLineUserId(ownerId, lineUserId);
      if (!customer) {
        throw new Error('Customer not found by lineUserId');
      }
      return {
        customerId: customer.customerId,
        customerName: customer.customerName,
        lineUserId: customer.lineUserId,
        ownerLineUserId: null,
        dateTime: command.dateTime,
        durationMinutes: command.durationMinutes,
      };
    } else {
      // オーナー操作: 既存顧客選択 or 新規顧客作成
      let customer;
      if (command.customerId) {
        customer = await this.customerGateway.findById(
          CustomerId.create(command.customerId),
        );
        if (!customer) {
          throw new Error(`Customer not found: ${command.customerId}`);
        }
      } else if (command.newCustomerName) {
        customer = await this.customerGateway.create(
          ownerId,
          command.newCustomerName,
        );
      } else {
        throw new Error('Either customerId or newCustomerName is required for owner operation');
      }
      return {
        customerId: customer.customerId,
        customerName: customer.customerName,
        lineUserId: customer.lineUserId,
        ownerLineUserId: null,
        dateTime: command.dateTime,
        durationMinutes: command.durationMinutes,
      };
    }
  }
}

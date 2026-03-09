/**
 * Reservation - 予約エンティティ（集約ルート）
 *
 * 予約管理コンテキストの中核エンティティ。
 * ReservationHistory を内部エンティティとして保持する。
 * 状態遷移: confirmed -> cancelled, confirmed -> completed
 */
import { ReservationId } from './ReservationId';
import { OwnerId } from './OwnerId';
import { CustomerId } from './CustomerId';
import { SlotId } from './SlotId';
import { ReservationDateTime } from './ReservationDateTime';
import { DurationMinutes } from './DurationMinutes';
import {
  ReservationStatus,
  canTransition,
  isTerminal,
} from './ReservationStatus';
import { CustomerName } from './CustomerName';
import { LineUserId } from './LineUserId';
import { ActorType } from './ActorType';
import { ReservationHistory } from './ReservationHistory';
import {
  ReservationCreatedEvent,
  ReservationModifiedEvent,
  ReservationCancelledEvent,
  ReservationDomainEvent,
} from './DomainEvent';

export interface CreateReservationParams {
  reservationId: ReservationId;
  ownerId: OwnerId;
  customerId: CustomerId;
  slotId: SlotId;
  dateTime: ReservationDateTime;
  durationMinutes: DurationMinutes;
  customerName: CustomerName;
  lineUserId: LineUserId | null;
  ownerLineUserId: LineUserId | null;
  createdBy: ActorType;
  now?: Date;
}

export interface ModifyReservationParams {
  newSlotId: SlotId;
  newDateTime: ReservationDateTime;
  newDurationMinutes: DurationMinutes;
  modifiedBy: ActorType;
  now?: Date;
}

export interface ReconstructReservationProps {
  reservationId: ReservationId;
  ownerId: OwnerId;
  customerId: CustomerId;
  slotId: SlotId;
  dateTime: ReservationDateTime;
  durationMinutes: DurationMinutes;
  status: ReservationStatus;
  customerName: CustomerName;
  lineUserId: LineUserId | null;
  ownerLineUserId: LineUserId | null;
  createdBy: ActorType;
  createdAt: Date;
  updatedAt: Date;
  histories: ReservationHistory[];
}

export class Reservation {
  readonly reservationId: ReservationId;
  readonly ownerId: OwnerId;
  readonly customerId: CustomerId;
  private _slotId: SlotId;
  private _dateTime: ReservationDateTime;
  private _durationMinutes: DurationMinutes;
  private _status: ReservationStatus;
  readonly customerName: CustomerName;
  readonly lineUserId: LineUserId | null;
  readonly ownerLineUserId: LineUserId | null;
  readonly createdBy: ActorType;
  readonly createdAt: Date;
  private _updatedAt: Date;
  private readonly _histories: ReservationHistory[];
  private readonly _domainEvents: ReservationDomainEvent[] = [];

  private constructor(props: ReconstructReservationProps) {
    this.reservationId = props.reservationId;
    this.ownerId = props.ownerId;
    this.customerId = props.customerId;
    this._slotId = props.slotId;
    this._dateTime = props.dateTime;
    this._durationMinutes = props.durationMinutes;
    this._status = props.status;
    this.customerName = props.customerName;
    this.lineUserId = props.lineUserId;
    this.ownerLineUserId = props.ownerLineUserId;
    this.createdBy = props.createdBy;
    this.createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
    this._histories = [...props.histories];
  }

  // --- Getters ---

  get slotId(): SlotId {
    return this._slotId;
  }
  get dateTime(): ReservationDateTime {
    return this._dateTime;
  }
  get durationMinutes(): DurationMinutes {
    return this._durationMinutes;
  }
  get status(): ReservationStatus {
    return this._status;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }
  get histories(): readonly ReservationHistory[] {
    return [...this._histories];
  }
  get domainEvents(): readonly ReservationDomainEvent[] {
    return [...this._domainEvents];
  }

  /** 蓄積されたドメインイベントをクリアする。 */
  clearDomainEvents(): void {
    this._domainEvents.length = 0;
  }

  // --- Factory Methods ---

  /** 新規予約を作成する。status は confirmed で生成される。 */
  static create(params: CreateReservationParams): Reservation {
    const now = params.now ?? new Date();
    const reservation = new Reservation({
      reservationId: params.reservationId,
      ownerId: params.ownerId,
      customerId: params.customerId,
      slotId: params.slotId,
      dateTime: params.dateTime,
      durationMinutes: params.durationMinutes,
      status: ReservationStatus.Confirmed,
      customerName: params.customerName,
      lineUserId: params.lineUserId,
      ownerLineUserId: params.ownerLineUserId,
      createdBy: params.createdBy,
      createdAt: now,
      updatedAt: now,
      histories: [],
    });

    const event: ReservationCreatedEvent = {
      eventType: 'reservation.created',
      reservationId: params.reservationId.value,
      ownerId: params.ownerId.value,
      customerId: params.customerId.value,
      customerName: params.customerName.value,
      lineUserId: params.lineUserId?.value ?? null,
      ownerLineUserId: params.ownerLineUserId?.value ?? null,
      slotId: params.slotId.value,
      dateTime: params.dateTime.toISOString(),
      durationMinutes: params.durationMinutes.value,
      timestamp: now.toISOString(),
    };
    reservation._domainEvents.push(event);

    return reservation;
  }

  /** 永続化されたデータから復元する。ドメインイベントは発行しない。 */
  static reconstruct(props: ReconstructReservationProps): Reservation {
    return new Reservation(props);
  }

  // --- Commands ---

  /**
   * 予約を変更する。
   * 事前条件: status が confirmed、dateTime が未来
   */
  modify(params: ModifyReservationParams): void {
    const now = params.now ?? new Date();

    this.assertConfirmed('modify');
    this.assertNotPast(now, 'modify');

    const previousDateTime = this._dateTime;
    const previousSlotId = this._slotId;

    const history = ReservationHistory.createModified({
      previousDateTime,
      newDateTime: params.newDateTime,
      previousSlotId,
      newSlotId: params.newSlotId,
      changedBy: params.modifiedBy,
      now,
    });
    this._histories.push(history);

    this._slotId = params.newSlotId;
    this._dateTime = params.newDateTime;
    this._durationMinutes = params.newDurationMinutes;
    this._updatedAt = now;

    const event: ReservationModifiedEvent = {
      eventType: 'reservation.modified',
      reservationId: this.reservationId.value,
      ownerId: this.ownerId.value,
      customerId: this.customerId.value,
      customerName: this.customerName.value,
      lineUserId: this.lineUserId?.value ?? null,
      ownerLineUserId: this.ownerLineUserId?.value ?? null,
      slotId: params.newSlotId.value,
      dateTime: params.newDateTime.toISOString(),
      previousDateTime: previousDateTime.toISOString(),
      durationMinutes: params.newDurationMinutes.value,
      modifiedBy: params.modifiedBy,
      timestamp: now.toISOString(),
    };
    this._domainEvents.push(event);
  }

  /**
   * 予約をキャンセルする。
   * 事前条件: status が confirmed、dateTime が未来
   */
  cancel(cancelledBy: ActorType, now?: Date): void {
    const currentTime = now ?? new Date();

    this.assertConfirmed('cancel');
    this.assertNotPast(currentTime, 'cancel');

    const history = ReservationHistory.createCancelled({
      changedBy: cancelledBy,
      now: currentTime,
    });
    this._histories.push(history);

    this._status = ReservationStatus.Cancelled;
    this._updatedAt = currentTime;

    const event: ReservationCancelledEvent = {
      eventType: 'reservation.cancelled',
      reservationId: this.reservationId.value,
      ownerId: this.ownerId.value,
      customerId: this.customerId.value,
      customerName: this.customerName.value,
      lineUserId: this.lineUserId?.value ?? null,
      ownerLineUserId: this.ownerLineUserId?.value ?? null,
      slotId: this._slotId.value,
      dateTime: this._dateTime.toISOString(),
      cancelledBy,
      timestamp: currentTime.toISOString(),
    };
    this._domainEvents.push(event);
  }

  /**
   * 予約を完了する。
   * 事前条件: status が confirmed（過去日時制約は対象外）
   */
  complete(now?: Date): void {
    const currentTime = now ?? new Date();

    this.assertConfirmed('complete');

    const history = ReservationHistory.createCompleted({ now: currentTime });
    this._histories.push(history);

    this._status = ReservationStatus.Completed;
    this._updatedAt = currentTime;
    // 完了イベントは現時点では Consumer が存在しないため発行しない
  }

  // --- Invariant Assertions ---

  private assertConfirmed(operation: string): void {
    if (this._status !== ReservationStatus.Confirmed) {
      throw new Error(
        `Cannot ${operation} reservation: current status is '${this._status}'. Only 'confirmed' reservations can be ${operation === 'modify' ? 'modified' : operation + 'led'}.`,
      );
    }
  }

  private assertNotPast(now: Date, operation: string): void {
    if (this._dateTime.isPast(now)) {
      throw new Error(
        `Cannot ${operation} reservation: reservation dateTime is in the past.`,
      );
    }
  }
}

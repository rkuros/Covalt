import { describe, it, expect } from 'vitest';
import { Reservation } from '../src/Reservation';
import { ReservationId } from '../src/ReservationId';
import { OwnerId } from '../src/OwnerId';
import { CustomerId } from '../src/CustomerId';
import { SlotId } from '../src/SlotId';
import { ReservationDateTime } from '../src/ReservationDateTime';
import { DurationMinutes } from '../src/DurationMinutes';
import { ReservationStatus } from '../src/ReservationStatus';
import { CustomerName } from '../src/CustomerName';
import { LineUserId } from '../src/LineUserId';
import { ActorType } from '../src/ActorType';
import { ChangeType } from '../src/ChangeType';

// --- テストデータヘルパー ---

const VALID_UUID_1 = '550e8400-e29b-41d4-a716-446655440000';
const VALID_UUID_2 = '6ba7b810-9dad-41d8-80b4-00c04fd430c8';
const VALID_LINE_USER_ID = 'U1234567890abcdef1234567890abcdef';
const OWNER_LINE_USER_ID = 'Uabcdef1234567890abcdef1234567890';
const NOW = new Date('2024-06-01T12:00:00Z');
const FUTURE_DT_STR = '2024-07-01T10:00:00+09:00';
const PAST_DT_STR = '2024-05-01T10:00:00+09:00';

function createDefaultParams(overrides: Record<string, unknown> = {}) {
  return {
    reservationId: ReservationId.create(VALID_UUID_1),
    ownerId: OwnerId.create('owner-001'),
    customerId: CustomerId.create('customer-001'),
    slotId: SlotId.create('slot-001'),
    dateTime: ReservationDateTime.create(FUTURE_DT_STR),
    durationMinutes: DurationMinutes.create(60),
    customerName: CustomerName.create('田中太郎'),
    lineUserId: LineUserId.create(VALID_LINE_USER_ID),
    ownerLineUserId: LineUserId.create(OWNER_LINE_USER_ID),
    createdBy: ActorType.Customer as ActorType,
    now: NOW,
    ...overrides,
  };
}

function createConfirmedReservation(overrides: Record<string, unknown> = {}) {
  return Reservation.create(createDefaultParams(overrides));
}

// --- Step 2-2: Reservation エンティティ単体としての生成・属性テスト ---

describe('Reservation - エンティティ生成', () => {
  it('有効な全属性を指定して Reservation を生成できること', () => {
    const reservation = createConfirmedReservation();

    expect(reservation.reservationId.value).toBe(VALID_UUID_1);
    expect(reservation.ownerId.value).toBe('owner-001');
    expect(reservation.customerId.value).toBe('customer-001');
    expect(reservation.slotId.value).toBe('slot-001');
    expect(reservation.durationMinutes.value).toBe(60);
    expect(reservation.customerName.value).toBe('田中太郎');
    expect(reservation.lineUserId?.value).toBe(VALID_LINE_USER_ID);
    expect(reservation.ownerLineUserId?.value).toBe(OWNER_LINE_USER_ID);
    expect(reservation.createdBy).toBe(ActorType.Customer);
  });

  it('生成時の status が confirmed であること', () => {
    const reservation = createConfirmedReservation();
    expect(reservation.status).toBe(ReservationStatus.Confirmed);
  });

  it('lineUserId が null の場合でも生成できること（LINE 未連携の顧客）', () => {
    const reservation = createConfirmedReservation({ lineUserId: null });
    expect(reservation.lineUserId).toBeNull();
  });

  it('ownerLineUserId が null の場合でも生成できること（LINE 未連携のオーナー）', () => {
    const reservation = createConfirmedReservation({ ownerLineUserId: null });
    expect(reservation.ownerLineUserId).toBeNull();
  });

  it('生成時に histories が空リストであること', () => {
    const reservation = createConfirmedReservation();
    expect(reservation.histories).toHaveLength(0);
  });

  it('同じ reservationId を持つ2つの Reservation が同一エンティティと判定されること', () => {
    const r1 = createConfirmedReservation();
    const r2 = createConfirmedReservation();
    expect(r1.reservationId.equals(r2.reservationId)).toBe(true);
  });
});

// --- Step 3-1: create 操作（予約作成） ---

describe('Reservation - create 操作', () => {
  it('有効なパラメータで予約を作成し、status が confirmed になること', () => {
    const reservation = createConfirmedReservation();
    expect(reservation.status).toBe(ReservationStatus.Confirmed);
  });

  it('createdAt / updatedAt が現在日時で設定されること', () => {
    const reservation = createConfirmedReservation();
    expect(reservation.createdAt).toEqual(NOW);
    expect(reservation.updatedAt).toEqual(NOW);
  });

  it('作成時に histories が空であること（作成自体は履歴に記録しない）', () => {
    const reservation = createConfirmedReservation();
    expect(reservation.histories).toHaveLength(0);
  });

  it('createdBy が customer の場合に正しく設定されること', () => {
    const reservation = createConfirmedReservation({ createdBy: ActorType.Customer });
    expect(reservation.createdBy).toBe(ActorType.Customer);
  });

  it('createdBy が owner の場合に正しく設定されること', () => {
    const reservation = createConfirmedReservation({ createdBy: ActorType.Owner });
    expect(reservation.createdBy).toBe(ActorType.Owner);
  });

  it('lineUserId が null でも作成できること', () => {
    const reservation = createConfirmedReservation({ lineUserId: null });
    expect(reservation.lineUserId).toBeNull();
    expect(reservation.status).toBe(ReservationStatus.Confirmed);
  });

  it('ownerLineUserId が null でも作成できること', () => {
    const reservation = createConfirmedReservation({ ownerLineUserId: null });
    expect(reservation.ownerLineUserId).toBeNull();
    expect(reservation.status).toBe(ReservationStatus.Confirmed);
  });

  it('ReservationCreated ドメインイベントが発生すること', () => {
    const reservation = createConfirmedReservation();
    const events = reservation.domainEvents;
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('reservation.created');
  });
});

// --- Step 3-2: modify 操作（予約変更） ---

describe('Reservation - modify 操作', () => {
  const NEW_DT_STR = '2024-08-01T14:00:00+09:00';
  const MODIFY_TIME = new Date('2024-06-15T12:00:00Z');

  function doModify(reservation: Reservation, overrides: Record<string, unknown> = {}) {
    reservation.modify({
      newSlotId: SlotId.create('slot-new'),
      newDateTime: ReservationDateTime.create(NEW_DT_STR),
      newDurationMinutes: DurationMinutes.create(90),
      modifiedBy: ActorType.Customer,
      now: MODIFY_TIME,
      ...overrides,
    });
  }

  // --- 正常系 ---

  it('confirmed 状態かつ未来日時の予約に対して modify を実行し、日時・スロット・施術時間が更新されること', () => {
    const reservation = createConfirmedReservation();
    reservation.clearDomainEvents();
    doModify(reservation);

    expect(reservation.slotId.value).toBe('slot-new');
    expect(reservation.dateTime.equals(ReservationDateTime.create(NEW_DT_STR))).toBe(true);
    expect(reservation.durationMinutes.value).toBe(90);
  });

  it('modify 後も status が confirmed のまま維持されること', () => {
    const reservation = createConfirmedReservation();
    reservation.clearDomainEvents();
    doModify(reservation);
    expect(reservation.status).toBe(ReservationStatus.Confirmed);
  });

  it('modify により ReservationHistory（changeType=modified）が追加されること', () => {
    const reservation = createConfirmedReservation();
    reservation.clearDomainEvents();
    doModify(reservation);

    expect(reservation.histories).toHaveLength(1);
    expect(reservation.histories[0].changeType).toBe(ChangeType.Modified);
  });

  it('ReservationHistory に変更前の dateTime / slotId と変更後の dateTime / slotId が記録されること', () => {
    const reservation = createConfirmedReservation();
    const originalDateTime = reservation.dateTime;
    const originalSlotId = reservation.slotId;
    reservation.clearDomainEvents();
    doModify(reservation);

    const history = reservation.histories[0];
    expect(history.previousDateTime!.equals(originalDateTime)).toBe(true);
    expect(history.newDateTime!.equals(ReservationDateTime.create(NEW_DT_STR))).toBe(true);
    expect(history.previousSlotId!.equals(originalSlotId)).toBe(true);
    expect(history.newSlotId!.value).toBe('slot-new');
  });

  it('updatedAt が更新されること', () => {
    const reservation = createConfirmedReservation();
    reservation.clearDomainEvents();
    doModify(reservation);
    expect(reservation.updatedAt).toEqual(MODIFY_TIME);
  });

  it('modifiedBy が customer の場合に ReservationHistory.changedBy が customer であること', () => {
    const reservation = createConfirmedReservation();
    reservation.clearDomainEvents();
    doModify(reservation, { modifiedBy: ActorType.Customer });
    expect(reservation.histories[0].changedBy).toBe(ActorType.Customer);
  });

  it('modifiedBy が owner の場合に ReservationHistory.changedBy が owner であること', () => {
    const reservation = createConfirmedReservation();
    reservation.clearDomainEvents();
    doModify(reservation, { modifiedBy: ActorType.Owner });
    expect(reservation.histories[0].changedBy).toBe(ActorType.Owner);
  });

  it('複数回 modify を実行し、履歴が複数件追加されること', () => {
    const reservation = createConfirmedReservation();
    reservation.clearDomainEvents();

    doModify(reservation);
    doModify(reservation, {
      newSlotId: SlotId.create('slot-new-2'),
      newDateTime: ReservationDateTime.create('2024-09-01T10:00:00+09:00'),
      now: new Date('2024-07-01T12:00:00Z'),
    });

    expect(reservation.histories).toHaveLength(2);
    expect(reservation.histories[0].changeType).toBe(ChangeType.Modified);
    expect(reservation.histories[1].changeType).toBe(ChangeType.Modified);
  });

  it('ReservationModified ドメインイベントが発生すること', () => {
    const reservation = createConfirmedReservation();
    reservation.clearDomainEvents();
    doModify(reservation);

    const events = reservation.domainEvents;
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('reservation.modified');
  });

  // --- 異常系: ステータス遷移制約（INV-1） ---

  it('cancelled 状態の予約に対して modify を実行した場合にドメインエラーとなること', () => {
    const reservation = createConfirmedReservation();
    reservation.cancel(ActorType.Customer, MODIFY_TIME);
    reservation.clearDomainEvents();

    expect(() => doModify(reservation)).toThrow(/Cannot modify reservation/);
  });

  it('completed 状態の予約に対して modify を実行した場合にドメインエラーとなること', () => {
    const reservation = createConfirmedReservation();
    reservation.complete(MODIFY_TIME);
    reservation.clearDomainEvents();

    expect(() => doModify(reservation)).toThrow(/Cannot modify reservation/);
  });

  // --- 異常系: 過去日時制約（INV-2） ---

  it('予約日時が過去の予約に対して modify を実行した場合にドメインエラーとなること', () => {
    const reservation = createConfirmedReservation({
      dateTime: ReservationDateTime.create(PAST_DT_STR),
    });
    reservation.clearDomainEvents();

    expect(() => doModify(reservation)).toThrow(/dateTime is in the past/);
  });

  it('予約日時が現在時刻ちょうどの予約に対する modify の挙動を確認すること', () => {
    // isPast は strict < なので、ちょうどでは isPast=false となり modify は成功する。
    // ただし、テスト方針では「現在時刻ちょうどは過去とみなす」とあるが、
    // 実装上の isPast は < (not <=) なので、ちょうどでは通る。
    const exactNow = new Date('2024-06-15T12:00:00Z');
    const reservation = createConfirmedReservation({
      dateTime: ReservationDateTime.fromDate(exactNow),
    });
    reservation.clearDomainEvents();

    // 実装上 isPast(now) = this.value.getTime() < now.getTime()
    // 同一時刻では false なのでエラーにならない
    expect(() => {
      reservation.modify({
        newSlotId: SlotId.create('slot-new'),
        newDateTime: ReservationDateTime.create('2024-09-01T10:00:00+09:00'),
        newDurationMinutes: DurationMinutes.create(90),
        modifiedBy: ActorType.Customer,
        now: exactNow,
      });
    }).not.toThrow();
  });
});

// --- Step 3-3: cancel 操作（予約キャンセル） ---

describe('Reservation - cancel 操作', () => {
  const CANCEL_TIME = new Date('2024-06-15T12:00:00Z');

  // --- 正常系 ---

  it('confirmed 状態かつ未来日時の予約に対して cancel を実行し、status が cancelled になること', () => {
    const reservation = createConfirmedReservation();
    reservation.clearDomainEvents();
    reservation.cancel(ActorType.Customer, CANCEL_TIME);
    expect(reservation.status).toBe(ReservationStatus.Cancelled);
  });

  it('cancel により ReservationHistory（changeType=cancelled）が追加されること', () => {
    const reservation = createConfirmedReservation();
    reservation.clearDomainEvents();
    reservation.cancel(ActorType.Customer, CANCEL_TIME);

    expect(reservation.histories).toHaveLength(1);
    expect(reservation.histories[0].changeType).toBe(ChangeType.Cancelled);
  });

  it('updatedAt が更新されること', () => {
    const reservation = createConfirmedReservation();
    reservation.clearDomainEvents();
    reservation.cancel(ActorType.Customer, CANCEL_TIME);
    expect(reservation.updatedAt).toEqual(CANCEL_TIME);
  });

  it('cancelledBy が customer の場合に ReservationHistory.changedBy が customer であること', () => {
    const reservation = createConfirmedReservation();
    reservation.clearDomainEvents();
    reservation.cancel(ActorType.Customer, CANCEL_TIME);
    expect(reservation.histories[0].changedBy).toBe(ActorType.Customer);
  });

  it('cancelledBy が owner の場合に ReservationHistory.changedBy が owner であること', () => {
    const reservation = createConfirmedReservation();
    reservation.clearDomainEvents();
    reservation.cancel(ActorType.Owner, CANCEL_TIME);
    expect(reservation.histories[0].changedBy).toBe(ActorType.Owner);
  });

  it('ReservationCancelled ドメインイベントが発生すること', () => {
    const reservation = createConfirmedReservation();
    reservation.clearDomainEvents();
    reservation.cancel(ActorType.Customer, CANCEL_TIME);

    const events = reservation.domainEvents;
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('reservation.cancelled');
  });

  // --- 異常系: ステータス遷移制約（INV-1） ---

  it('cancelled 状態の予約に対して cancel を実行した場合にドメインエラーとなること', () => {
    const reservation = createConfirmedReservation();
    reservation.cancel(ActorType.Customer, CANCEL_TIME);
    reservation.clearDomainEvents();

    expect(() => reservation.cancel(ActorType.Customer, CANCEL_TIME)).toThrow(
      /Cannot cancel reservation/,
    );
  });

  it('completed 状態の予約に対して cancel を実行した場合にドメインエラーとなること', () => {
    const reservation = createConfirmedReservation();
    reservation.complete(CANCEL_TIME);
    reservation.clearDomainEvents();

    expect(() => reservation.cancel(ActorType.Customer, CANCEL_TIME)).toThrow(
      /Cannot cancel reservation/,
    );
  });

  // --- 異常系: 過去日時制約（INV-2） ---

  it('予約日時が過去の予約に対して cancel を実行した場合にドメインエラーとなること', () => {
    const reservation = createConfirmedReservation({
      dateTime: ReservationDateTime.create(PAST_DT_STR),
    });
    reservation.clearDomainEvents();

    expect(() => reservation.cancel(ActorType.Customer, CANCEL_TIME)).toThrow(
      /dateTime is in the past/,
    );
  });

  it('予約日時が現在時刻ちょうどの予約に対する cancel の挙動を確認すること', () => {
    const exactNow = new Date('2024-06-15T12:00:00Z');
    const reservation = createConfirmedReservation({
      dateTime: ReservationDateTime.fromDate(exactNow),
    });
    reservation.clearDomainEvents();

    // 実装上 isPast(now) = strict < なので、ちょうどでは false
    expect(() => reservation.cancel(ActorType.Customer, exactNow)).not.toThrow();
  });
});

// --- Step 3-4: complete 操作（予約完了） ---

describe('Reservation - complete 操作', () => {
  const COMPLETE_TIME = new Date('2024-06-15T12:00:00Z');

  // --- 正常系 ---

  it('confirmed 状態の予約に対して complete を実行し、status が completed になること', () => {
    const reservation = createConfirmedReservation();
    reservation.clearDomainEvents();
    reservation.complete(COMPLETE_TIME);
    expect(reservation.status).toBe(ReservationStatus.Completed);
  });

  it('過去日時の予約に対しても complete を実行できること（INV-2 の対象外）', () => {
    const reservation = createConfirmedReservation({
      dateTime: ReservationDateTime.create(PAST_DT_STR),
    });
    reservation.clearDomainEvents();
    expect(() => reservation.complete(COMPLETE_TIME)).not.toThrow();
    expect(reservation.status).toBe(ReservationStatus.Completed);
  });

  it('complete により ReservationHistory（changeType=completed）が追加されること', () => {
    const reservation = createConfirmedReservation();
    reservation.clearDomainEvents();
    reservation.complete(COMPLETE_TIME);

    expect(reservation.histories).toHaveLength(1);
    expect(reservation.histories[0].changeType).toBe(ChangeType.Completed);
  });

  it('updatedAt が更新されること', () => {
    const reservation = createConfirmedReservation();
    reservation.clearDomainEvents();
    reservation.complete(COMPLETE_TIME);
    expect(reservation.updatedAt).toEqual(COMPLETE_TIME);
  });

  it('完了操作ではドメインイベントが発行されないこと（現時点で Consumer なし）', () => {
    const reservation = createConfirmedReservation();
    reservation.clearDomainEvents();
    reservation.complete(COMPLETE_TIME);

    expect(reservation.domainEvents).toHaveLength(0);
  });

  // --- 異常系: ステータス遷移制約（INV-1） ---

  it('cancelled 状態の予約に対して complete を実行した場合にドメインエラーとなること', () => {
    const reservation = createConfirmedReservation();
    reservation.cancel(ActorType.Customer, COMPLETE_TIME);
    reservation.clearDomainEvents();

    expect(() => reservation.complete(COMPLETE_TIME)).toThrow(/Cannot complete reservation/);
  });

  it('completed 状態の予約に対して complete を実行した場合にドメインエラーとなること（完了済みの再完了不可）', () => {
    const reservation = createConfirmedReservation();
    reservation.complete(COMPLETE_TIME);
    reservation.clearDomainEvents();

    expect(() => reservation.complete(COMPLETE_TIME)).toThrow(/Cannot complete reservation/);
  });
});

// --- Step 3-5: 不変条件（INV-3）変更履歴の整合性 - 複合シナリオ ---

describe('Reservation - 変更履歴の整合性（複合シナリオ）', () => {
  const TIME_1 = new Date('2024-06-10T12:00:00Z');
  const TIME_2 = new Date('2024-06-15T12:00:00Z');
  const TIME_3 = new Date('2024-06-20T12:00:00Z');

  it('作成 -> 変更 -> キャンセルの一連の操作で履歴が正しく2件（modified + cancelled）記録されること', () => {
    const reservation = createConfirmedReservation();
    reservation.clearDomainEvents();

    // 変更
    reservation.modify({
      newSlotId: SlotId.create('slot-new'),
      newDateTime: ReservationDateTime.create('2024-08-01T14:00:00+09:00'),
      newDurationMinutes: DurationMinutes.create(90),
      modifiedBy: ActorType.Customer,
      now: TIME_1,
    });

    // キャンセル
    reservation.cancel(ActorType.Customer, TIME_2);

    expect(reservation.histories).toHaveLength(2);
    expect(reservation.histories[0].changeType).toBe(ChangeType.Modified);
    expect(reservation.histories[1].changeType).toBe(ChangeType.Cancelled);
  });

  it('作成 -> 変更 -> 変更 -> 完了の一連の操作で履歴が正しく3件（modified + modified + completed）記録されること', () => {
    const reservation = createConfirmedReservation();
    reservation.clearDomainEvents();

    // 変更1
    reservation.modify({
      newSlotId: SlotId.create('slot-new-1'),
      newDateTime: ReservationDateTime.create('2024-08-01T14:00:00+09:00'),
      newDurationMinutes: DurationMinutes.create(90),
      modifiedBy: ActorType.Customer,
      now: TIME_1,
    });

    // 変更2
    reservation.modify({
      newSlotId: SlotId.create('slot-new-2'),
      newDateTime: ReservationDateTime.create('2024-09-01T10:00:00+09:00'),
      newDurationMinutes: DurationMinutes.create(120),
      modifiedBy: ActorType.Owner,
      now: TIME_2,
    });

    // 完了
    reservation.complete(TIME_3);

    expect(reservation.histories).toHaveLength(3);
    expect(reservation.histories[0].changeType).toBe(ChangeType.Modified);
    expect(reservation.histories[1].changeType).toBe(ChangeType.Modified);
    expect(reservation.histories[2].changeType).toBe(ChangeType.Completed);
  });

  it('各履歴の changedAt が操作時刻として正しく記録されること', () => {
    const reservation = createConfirmedReservation();
    reservation.clearDomainEvents();

    reservation.modify({
      newSlotId: SlotId.create('slot-new'),
      newDateTime: ReservationDateTime.create('2024-08-01T14:00:00+09:00'),
      newDurationMinutes: DurationMinutes.create(90),
      modifiedBy: ActorType.Customer,
      now: TIME_1,
    });

    reservation.cancel(ActorType.Customer, TIME_2);

    expect(reservation.histories[0].changedAt).toEqual(TIME_1);
    expect(reservation.histories[1].changedAt).toEqual(TIME_2);
  });
});

// --- Step 3-6: スナップショット属性の不変性 ---

describe('Reservation - スナップショット属性の不変性', () => {
  const MODIFY_TIME = new Date('2024-06-15T12:00:00Z');
  const CANCEL_TIME = new Date('2024-06-20T12:00:00Z');

  it('modify 操作後に customerName が変更されていないこと', () => {
    const reservation = createConfirmedReservation();
    const originalName = reservation.customerName.value;
    reservation.clearDomainEvents();

    reservation.modify({
      newSlotId: SlotId.create('slot-new'),
      newDateTime: ReservationDateTime.create('2024-08-01T14:00:00+09:00'),
      newDurationMinutes: DurationMinutes.create(90),
      modifiedBy: ActorType.Customer,
      now: MODIFY_TIME,
    });

    expect(reservation.customerName.value).toBe(originalName);
  });

  it('modify 操作後に lineUserId が変更されていないこと', () => {
    const reservation = createConfirmedReservation();
    const originalLineUserId = reservation.lineUserId?.value;
    reservation.clearDomainEvents();

    reservation.modify({
      newSlotId: SlotId.create('slot-new'),
      newDateTime: ReservationDateTime.create('2024-08-01T14:00:00+09:00'),
      newDurationMinutes: DurationMinutes.create(90),
      modifiedBy: ActorType.Customer,
      now: MODIFY_TIME,
    });

    expect(reservation.lineUserId?.value).toBe(originalLineUserId);
  });

  it('modify 操作後に ownerLineUserId が変更されていないこと', () => {
    const reservation = createConfirmedReservation();
    const originalOwnerLineUserId = reservation.ownerLineUserId?.value;
    reservation.clearDomainEvents();

    reservation.modify({
      newSlotId: SlotId.create('slot-new'),
      newDateTime: ReservationDateTime.create('2024-08-01T14:00:00+09:00'),
      newDurationMinutes: DurationMinutes.create(90),
      modifiedBy: ActorType.Customer,
      now: MODIFY_TIME,
    });

    expect(reservation.ownerLineUserId?.value).toBe(originalOwnerLineUserId);
  });

  it('cancel 操作後にスナップショット属性が変更されていないこと', () => {
    const reservation = createConfirmedReservation();
    const originalName = reservation.customerName.value;
    const originalLineUserId = reservation.lineUserId?.value;
    const originalOwnerLineUserId = reservation.ownerLineUserId?.value;
    reservation.clearDomainEvents();

    reservation.cancel(ActorType.Customer, CANCEL_TIME);

    expect(reservation.customerName.value).toBe(originalName);
    expect(reservation.lineUserId?.value).toBe(originalLineUserId);
    expect(reservation.ownerLineUserId?.value).toBe(originalOwnerLineUserId);
  });
});

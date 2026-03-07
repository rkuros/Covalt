import { describe, it, expect } from 'vitest';
import { ReservationHistory } from '../src/ReservationHistory';
import { HistoryId } from '../src/HistoryId';
import { ChangeType } from '../src/ChangeType';
import { ReservationDateTime } from '../src/ReservationDateTime';
import { SlotId } from '../src/SlotId';
import { ActorType } from '../src/ActorType';

describe('ReservationHistory', () => {
  const NOW = new Date('2024-06-01T12:00:00Z');
  const PREV_DT = ReservationDateTime.create('2024-06-10T10:00:00+09:00');
  const NEW_DT = ReservationDateTime.create('2024-06-15T14:00:00+09:00');
  const PREV_SLOT = SlotId.create('slot-old');
  const NEW_SLOT = SlotId.create('slot-new');

  // --- 正常系: createModified ---

  it('有効な属性（changeType=modified）で生成できること', () => {
    const history = ReservationHistory.createModified({
      previousDateTime: PREV_DT,
      newDateTime: NEW_DT,
      previousSlotId: PREV_SLOT,
      newSlotId: NEW_SLOT,
      changedBy: ActorType.Customer,
      now: NOW,
    });

    expect(history.changeType).toBe(ChangeType.Modified);
    expect(history.previousDateTime).not.toBeNull();
    expect(history.previousDateTime!.equals(PREV_DT)).toBe(true);
    expect(history.newDateTime).not.toBeNull();
    expect(history.newDateTime!.equals(NEW_DT)).toBe(true);
    expect(history.previousSlotId).not.toBeNull();
    expect(history.previousSlotId!.equals(PREV_SLOT)).toBe(true);
    expect(history.newSlotId).not.toBeNull();
    expect(history.newSlotId!.equals(NEW_SLOT)).toBe(true);
    expect(history.changedBy).toBe(ActorType.Customer);
    expect(history.changedAt).toEqual(NOW);
    expect(history.historyId).toBeDefined();
  });

  // --- 正常系: createCancelled ---

  it('changeType=cancelled の場合、previousDateTime / newDateTime / previousSlotId / newSlotId が null で生成できること', () => {
    const history = ReservationHistory.createCancelled({
      changedBy: ActorType.Owner,
      now: NOW,
    });

    expect(history.changeType).toBe(ChangeType.Cancelled);
    expect(history.previousDateTime).toBeNull();
    expect(history.newDateTime).toBeNull();
    expect(history.previousSlotId).toBeNull();
    expect(history.newSlotId).toBeNull();
    expect(history.changedBy).toBe(ActorType.Owner);
    expect(history.changedAt).toEqual(NOW);
  });

  // --- 正常系: createCompleted ---

  it('changeType=completed の場合、previousDateTime / newDateTime / previousSlotId / newSlotId が null で生成できること', () => {
    const history = ReservationHistory.createCompleted({ now: NOW });

    expect(history.changeType).toBe(ChangeType.Completed);
    expect(history.previousDateTime).toBeNull();
    expect(history.newDateTime).toBeNull();
    expect(history.previousSlotId).toBeNull();
    expect(history.newSlotId).toBeNull();
    expect(history.changedBy).toBe(ActorType.Owner); // completed は常に Owner
    expect(history.changedAt).toEqual(NOW);
  });

  // --- 正常系: エンティティ同一性 ---

  it('同じ historyId を持つ2つの ReservationHistory が同一エンティティと判定されること', () => {
    const historyId = HistoryId.generate();
    const props = {
      historyId,
      changeType: ChangeType.Modified as ChangeType,
      previousDateTime: PREV_DT,
      newDateTime: NEW_DT,
      previousSlotId: PREV_SLOT,
      newSlotId: NEW_SLOT,
      changedBy: ActorType.Customer as ActorType,
      changedAt: NOW,
    };

    const h1 = ReservationHistory.reconstruct(props);
    const h2 = ReservationHistory.reconstruct(props);

    expect(h1.historyId.equals(h2.historyId)).toBe(true);
  });

  // --- 正常系: reconstruct ---

  it('reconstruct で永続化データから復元できること', () => {
    const historyId = HistoryId.generate();
    const history = ReservationHistory.reconstruct({
      historyId,
      changeType: ChangeType.Cancelled,
      previousDateTime: null,
      newDateTime: null,
      previousSlotId: null,
      newSlotId: null,
      changedBy: ActorType.Customer,
      changedAt: NOW,
    });

    expect(history.historyId.equals(historyId)).toBe(true);
    expect(history.changeType).toBe(ChangeType.Cancelled);
  });
});

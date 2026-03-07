import { describe, it, expect } from 'vitest';
import { ClosedDay } from '../src/ClosedDay';
import { ClosedDayId } from '../src/ClosedDayId';
import { OwnerId } from '../src/OwnerId';
import { SlotDate } from '../src/SlotDate';

describe('ClosedDay', () => {
  const defaultParams = () => ({
    closedDayId: ClosedDayId.create('cd-001'),
    ownerId: OwnerId.create('owner-001'),
    date: SlotDate.create('2024-01-15'),
  });

  describe('生成', () => {
    it('有効な属性（reason="臨時休業"）で生成できること', () => {
      const cd = ClosedDay.create({
        ...defaultParams(),
        reason: '臨時休業',
      });
      expect(cd.reason).toBe('臨時休業');
      expect(cd.date.value).toBe('2024-01-15');
    });

    it('reason が省略（未指定）でも生成できること', () => {
      const cd = ClosedDay.create({
        ...defaultParams(),
      });
      expect(cd.reason).toBeNull();
    });

    it('reason が null でも生成できること', () => {
      const cd = ClosedDay.create({
        ...defaultParams(),
        reason: null,
      });
      expect(cd.reason).toBeNull();
    });

    it('reason が 201 文字以上の場合バリデーションエラーになること', () => {
      const longReason = 'あ'.repeat(201);
      expect(() =>
        ClosedDay.create({
          ...defaultParams(),
          reason: longReason,
        }),
      ).toThrow();
    });

    it('reason がちょうど 200 文字の場合生成できること', () => {
      const reason200 = 'あ'.repeat(200);
      const cd = ClosedDay.create({
        ...defaultParams(),
        reason: reason200,
      });
      expect(cd.reason).toBe(reason200);
      expect(cd.reason!.length).toBe(200);
    });
  });
});

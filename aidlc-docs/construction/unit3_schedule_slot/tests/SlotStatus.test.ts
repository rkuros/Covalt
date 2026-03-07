import { describe, it, expect } from 'vitest';
import { SlotStatus, SlotStatusEnum } from '../src/SlotStatus';

describe('SlotStatus', () => {
  // 正常系
  it('AVAILABLE で生成できること', () => {
    const status = SlotStatus.create(SlotStatusEnum.AVAILABLE);
    expect(status.value).toBe(SlotStatusEnum.AVAILABLE);
    expect(status.isAvailable()).toBe(true);
  });

  it('BOOKED で生成できること', () => {
    const status = SlotStatus.create(SlotStatusEnum.BOOKED);
    expect(status.value).toBe(SlotStatusEnum.BOOKED);
    expect(status.isBooked()).toBe(true);
  });

  // 異常系
  it('AVAILABLE / BOOKED 以外の値で生成するとバリデーションエラーになること', () => {
    expect(() => SlotStatus.create('CANCELLED' as SlotStatusEnum)).toThrow();
  });

  // PACT対応シリアライズ
  it('AVAILABLE は "available" にシリアライズされること', () => {
    const status = SlotStatus.available();
    expect(status.toPact()).toBe('available');
  });

  it('BOOKED は "booked" にシリアライズされること', () => {
    const status = SlotStatus.booked();
    expect(status.toPact()).toBe('booked');
  });

  // 等価性
  it('同一の value は等価であること', () => {
    const a = SlotStatus.available();
    const b = SlotStatus.available();
    expect(a.equals(b)).toBe(true);
  });

  it('AVAILABLE と BOOKED は等価でないこと', () => {
    const a = SlotStatus.available();
    const b = SlotStatus.booked();
    expect(a.equals(b)).toBe(false);
  });
});

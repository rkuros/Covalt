import { describe, it, expect } from 'vitest';
import { ReservationStatus, canTransition, isTerminal } from '../src/ReservationStatus';

describe('ReservationStatus', () => {
  // --- 正常系 ---

  it('confirmed で生成できること', () => {
    const status: ReservationStatus = ReservationStatus.Confirmed;
    expect(status).toBe('confirmed');
  });

  it('cancelled で生成できること', () => {
    const status: ReservationStatus = ReservationStatus.Cancelled;
    expect(status).toBe('cancelled');
  });

  it('completed で生成できること', () => {
    const status: ReservationStatus = ReservationStatus.Completed;
    expect(status).toBe('completed');
  });

  it('同じ値を持つ2つの ReservationStatus が等価と判定されること', () => {
    const s1: ReservationStatus = ReservationStatus.Confirmed;
    const s2: ReservationStatus = ReservationStatus.Confirmed;
    expect(s1).toBe(s2);
  });

  // --- 異常系（TypeScript の列挙型は型システムで防がれるが、ランタイムで値を検証するテスト） ---

  it('定義外の文字列（例: pending）は ReservationStatus の値に含まれないこと', () => {
    const validValues = Object.values(ReservationStatus);
    expect(validValues).not.toContain('pending');
    expect(validValues).not.toContain('modified');
  });

  it('null は ReservationStatus の値に含まれないこと', () => {
    const validValues = Object.values(ReservationStatus);
    expect(validValues).not.toContain(null);
  });

  it('空文字は ReservationStatus の値に含まれないこと', () => {
    const validValues = Object.values(ReservationStatus);
    expect(validValues).not.toContain('');
  });

  // --- canTransition ---

  describe('canTransition', () => {
    it('confirmed -> cancelled への遷移が許可されること', () => {
      expect(canTransition(ReservationStatus.Confirmed, ReservationStatus.Cancelled)).toBe(true);
    });

    it('confirmed -> completed への遷移が許可されること', () => {
      expect(canTransition(ReservationStatus.Confirmed, ReservationStatus.Completed)).toBe(true);
    });

    it('cancelled -> confirmed への遷移が許可されないこと', () => {
      expect(canTransition(ReservationStatus.Cancelled, ReservationStatus.Confirmed)).toBe(false);
    });

    it('cancelled -> completed への遷移が許可されないこと', () => {
      expect(canTransition(ReservationStatus.Cancelled, ReservationStatus.Completed)).toBe(false);
    });

    it('completed -> confirmed への遷移が許可されないこと', () => {
      expect(canTransition(ReservationStatus.Completed, ReservationStatus.Confirmed)).toBe(false);
    });

    it('completed -> cancelled への遷移が許可されないこと', () => {
      expect(canTransition(ReservationStatus.Completed, ReservationStatus.Cancelled)).toBe(false);
    });
  });

  // --- isTerminal ---

  describe('isTerminal', () => {
    it('cancelled は終端状態であること', () => {
      expect(isTerminal(ReservationStatus.Cancelled)).toBe(true);
    });

    it('completed は終端状態であること', () => {
      expect(isTerminal(ReservationStatus.Completed)).toBe(true);
    });

    it('confirmed は終端状態でないこと', () => {
      expect(isTerminal(ReservationStatus.Confirmed)).toBe(false);
    });
  });
});

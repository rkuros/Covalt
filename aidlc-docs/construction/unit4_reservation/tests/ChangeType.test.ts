import { describe, it, expect } from 'vitest';
import { ChangeType } from '../src/ChangeType';

describe('ChangeType', () => {
  // --- 正常系 ---

  it('modified で生成できること', () => {
    const ct: ChangeType = ChangeType.Modified;
    expect(ct).toBe('modified');
  });

  it('cancelled で生成できること', () => {
    const ct: ChangeType = ChangeType.Cancelled;
    expect(ct).toBe('cancelled');
  });

  it('completed で生成できること', () => {
    const ct: ChangeType = ChangeType.Completed;
    expect(ct).toBe('completed');
  });

  // --- 異常系 ---

  it('定義外の文字列（例: created, deleted）は ChangeType の値に含まれないこと', () => {
    const validValues = Object.values(ChangeType);
    expect(validValues).not.toContain('created');
    expect(validValues).not.toContain('deleted');
  });

  it('null は ChangeType の値に含まれないこと', () => {
    const validValues = Object.values(ChangeType);
    expect(validValues).not.toContain(null);
  });
});

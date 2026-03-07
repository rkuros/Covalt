import { describe, it, expect } from 'vitest';
import { ActorType } from '../src/ActorType';

describe('ActorType', () => {
  // --- 正常系 ---

  it('customer で生成できること', () => {
    const actor: ActorType = ActorType.Customer;
    expect(actor).toBe('customer');
  });

  it('owner で生成できること', () => {
    const actor: ActorType = ActorType.Owner;
    expect(actor).toBe('owner');
  });

  it('同じ値を持つ2つの ActorType が等価と判定されること', () => {
    const a1: ActorType = ActorType.Customer;
    const a2: ActorType = ActorType.Customer;
    expect(a1).toBe(a2);
  });

  // --- 異常系 ---

  it('定義外の文字列（例: admin, system）は ActorType の値に含まれないこと', () => {
    const validValues = Object.values(ActorType);
    expect(validValues).not.toContain('admin');
    expect(validValues).not.toContain('system');
  });

  it('null は ActorType の値に含まれないこと', () => {
    const validValues = Object.values(ActorType);
    expect(validValues).not.toContain(null);
  });
});

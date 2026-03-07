import { describe, it, expect, vi } from 'vitest';
import type { LiffGateway, LiffVerifyResult } from '../src/LiffGateway';

/**
 * LiffGateway インターフェースのテスト。
 * Gateway インターフェースの実装自体はモックとし、インターフェース契約を vi.fn() で確認する。
 */
describe('LiffGateway インターフェース', () => {
  const VALID_LINE_USER_ID = 'U1234567890abcdef1234567890abcdef';

  const SAMPLE_LIFF_RESULT: LiffVerifyResult = {
    lineUserId: VALID_LINE_USER_ID,
    displayName: '田中太郎',
  };

  function createMockLiffGateway(overrides: Partial<LiffGateway> = {}): LiffGateway {
    return {
      verifyLiffToken: vi.fn().mockResolvedValue(SAMPLE_LIFF_RESULT),
      ...overrides,
    };
  }

  it('verifyLiffToken が有効なトークンに対して LiffVerifyResult を返すこと', async () => {
    const gateway = createMockLiffGateway();
    const result = await gateway.verifyLiffToken('valid-liff-token');

    expect(result.lineUserId).toBe(VALID_LINE_USER_ID);
    expect(result.displayName).toBe('田中太郎');
  });

  it('LiffVerifyResult.lineUserId が U + 32桁hex の形式であること', async () => {
    const gateway = createMockLiffGateway();
    const result = await gateway.verifyLiffToken('valid-liff-token');

    expect(result.lineUserId).toMatch(/^U[0-9a-f]{32}$/);
  });

  it('verifyLiffToken が無効なトークンに対して INVALID_LIFF_TOKEN エラーを返すこと', async () => {
    const gateway = createMockLiffGateway({
      verifyLiffToken: vi.fn().mockRejectedValue(new Error('INVALID_LIFF_TOKEN')),
    });

    await expect(gateway.verifyLiffToken('invalid-token')).rejects.toThrow(
      'INVALID_LIFF_TOKEN',
    );
  });
});

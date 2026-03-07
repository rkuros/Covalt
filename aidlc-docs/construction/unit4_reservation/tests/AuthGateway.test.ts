import { describe, it, expect, vi } from 'vitest';
import type { AuthGateway, AuthResult } from '../src/AuthGateway';

/**
 * AuthGateway インターフェースのテスト。
 * Gateway インターフェースの実装自体はモックとし、インターフェース契約を vi.fn() で確認する。
 */
describe('AuthGateway インターフェース', () => {
  const SAMPLE_AUTH_RESULT: AuthResult = {
    ownerId: 'owner-001',
    email: 'owner@example.com',
    role: 'owner',
  };

  function createMockAuthGateway(overrides: Partial<AuthGateway> = {}): AuthGateway {
    return {
      verifyToken: vi.fn().mockResolvedValue(SAMPLE_AUTH_RESULT),
      ...overrides,
    };
  }

  it('verifyToken が有効なトークンに対して AuthResult を返すこと', async () => {
    const gateway = createMockAuthGateway();
    const result = await gateway.verifyToken('valid-token');

    expect(result.ownerId).toBe('owner-001');
    expect(result.email).toBe('owner@example.com');
    expect(result.role).toBe('owner');
  });

  it('verifyToken が無効なトークンに対して UNAUTHORIZED エラーを返すこと', async () => {
    const gateway = createMockAuthGateway({
      verifyToken: vi.fn().mockRejectedValue(new Error('UNAUTHORIZED')),
    });

    await expect(gateway.verifyToken('invalid-token')).rejects.toThrow('UNAUTHORIZED');
  });

  it('verifyToken が無効化されたアカウントに対して ACCOUNT_DISABLED エラーを返すこと', async () => {
    const gateway = createMockAuthGateway({
      verifyToken: vi.fn().mockRejectedValue(new Error('ACCOUNT_DISABLED')),
    });

    await expect(gateway.verifyToken('disabled-account-token')).rejects.toThrow(
      'ACCOUNT_DISABLED',
    );
  });
});

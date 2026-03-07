import { describe, it, expect } from "vitest";
import { PasswordResetToken } from "../src/PasswordResetToken";
import { AuthToken } from "../src/AuthToken";

describe("PasswordResetToken", () => {
  // --- 正常系 ---

  it("必要な属性で生成できること", () => {
    const resetToken = PasswordResetToken.create("owner-id-1");

    expect(resetToken.tokenId).toBeTruthy();
    expect(resetToken.ownerId).toBe("owner-id-1");
    expect(resetToken.token).toBeTruthy();
    expect(resetToken.token.value.length).toBeGreaterThan(0);
    expect(resetToken.expiresAt).toBeInstanceOf(Date);
    expect(resetToken.usedAt).toBeNull();
  });

  it("有効期限内かつ未使用のトークンが有効と判定されること", () => {
    const resetToken = PasswordResetToken.create("owner-id-1");
    expect(resetToken.isValid()).toBe(true);
  });

  it("有効期限が 24 時間後に設定されること", () => {
    const before = new Date();
    const resetToken = PasswordResetToken.create("owner-id-1");
    const after = new Date();

    const expectedMin = before.getTime() + 24 * 60 * 60 * 1000;
    const expectedMax = after.getTime() + 24 * 60 * 60 * 1000;

    expect(resetToken.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMin);
    expect(resetToken.expiresAt.getTime()).toBeLessThanOrEqual(expectedMax);
  });

  it("トークンを使用済みに変更できること（usedAt が設定されること）", () => {
    const resetToken = PasswordResetToken.create("owner-id-1");
    expect(resetToken.usedAt).toBeNull();

    resetToken.markAsUsed();

    expect(resetToken.usedAt).toBeInstanceOf(Date);
    expect(resetToken.usedAt).not.toBeNull();
  });

  it("reconstruct でリポジトリからの復元ができること", () => {
    const token = AuthToken.create("test-token-value");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const resetToken = PasswordResetToken.reconstruct(
      "token-id-1",
      "owner-id-1",
      token,
      expiresAt,
      null,
    );

    expect(resetToken.tokenId).toBe("token-id-1");
    expect(resetToken.ownerId).toBe("owner-id-1");
    expect(resetToken.token.value).toBe("test-token-value");
    expect(resetToken.expiresAt).toBe(expiresAt);
    expect(resetToken.usedAt).toBeNull();
  });

  // --- 異常系 ---

  it("有効期限切れのトークンが無効と判定されること (BR-07)", () => {
    const token = AuthToken.create("expired-token");
    const pastDate = new Date(Date.now() - 1000);

    const resetToken = PasswordResetToken.reconstruct(
      "token-id-1",
      "owner-id-1",
      token,
      pastDate,
      null,
    );

    expect(resetToken.isValid()).toBe(false);
  });

  it("使用済みのトークンが無効と判定されること（ワンタイム性の保証）", () => {
    const token = AuthToken.create("used-token");
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const usedAt = new Date();

    const resetToken = PasswordResetToken.reconstruct(
      "token-id-1",
      "owner-id-1",
      token,
      futureDate,
      usedAt,
    );

    expect(resetToken.isValid()).toBe(false);
  });

  it("無効なトークンに対して markAsUsed を呼ぶとエラーになること", () => {
    const token = AuthToken.create("expired-token");
    const pastDate = new Date(Date.now() - 1000);

    const resetToken = PasswordResetToken.reconstruct(
      "token-id-1",
      "owner-id-1",
      token,
      pastDate,
      null,
    );

    expect(() => resetToken.markAsUsed()).toThrow(
      "無効または使用済みのリセットトークンです",
    );
  });

  it("使用済みトークンに対して markAsUsed を呼ぶとエラーになること", () => {
    const resetToken = PasswordResetToken.create("owner-id-1");
    resetToken.markAsUsed();

    expect(() => resetToken.markAsUsed()).toThrow(
      "無効または使用済みのリセットトークンです",
    );
  });

  // --- 境界値 ---

  it("有効期限のちょうど境界（現在時刻 == expiresAt）の場合に無効と判定されること", () => {
    const token = AuthToken.create("boundary-token");
    // expiresAt を現在時刻に設定（now < expiresAt でないので無効）
    const now = new Date();

    const resetToken = PasswordResetToken.reconstruct(
      "token-id-1",
      "owner-id-1",
      token,
      now,
      null,
    );

    // isValid は now < expiresAt で判定するため、now == expiresAt は無効
    expect(resetToken.isValid()).toBe(false);
  });
});

import { describe, it, expect } from "vitest";
import { Session } from "../src/Session";
import { AuthToken } from "../src/AuthToken";

describe("Session", () => {
  // --- 正常系 ---

  it("必要な属性で生成できること", () => {
    const session = Session.create("owner-id-1");

    expect(session.sessionId).toBeTruthy();
    expect(session.ownerId).toBe("owner-id-1");
    expect(session.token).toBeTruthy();
    expect(session.token.value.length).toBeGreaterThan(0);
    expect(session.createdAt).toBeInstanceOf(Date);
    expect(session.expiresAt).toBeInstanceOf(Date);
  });

  it("有効期限内のセッションが有効と判定されること", () => {
    const session = Session.create("owner-id-1");
    expect(session.isValid()).toBe(true);
  });

  it("セッションの有効期限が 24 時間後に設定されること", () => {
    const before = new Date();
    const session = Session.create("owner-id-1");
    const after = new Date();

    const expectedMin = before.getTime() + 24 * 60 * 60 * 1000;
    const expectedMax = after.getTime() + 24 * 60 * 60 * 1000;

    expect(session.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMin);
    expect(session.expiresAt.getTime()).toBeLessThanOrEqual(expectedMax);
  });

  it("セッションから認証トークンを取得できること", () => {
    const session = Session.create("owner-id-1");
    expect(session.token).toBeInstanceOf(AuthToken);
    expect(session.token.value.length).toBeGreaterThan(0);
  });

  it("reconstruct でリポジトリからの復元ができること", () => {
    const token = AuthToken.create("session-token");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const session = Session.reconstruct(
      "session-id-1",
      "owner-id-1",
      token,
      now,
      expiresAt,
    );

    expect(session.sessionId).toBe("session-id-1");
    expect(session.ownerId).toBe("owner-id-1");
    expect(session.token.value).toBe("session-token");
    expect(session.createdAt).toBe(now);
    expect(session.expiresAt).toBe(expiresAt);
  });

  // --- 異常系 ---

  it("有効期限切れのセッションが無効と判定されること (BR-05)", () => {
    const token = AuthToken.create("expired-session-token");
    const past = new Date(Date.now() - 1000);
    const expiredAt = new Date(Date.now() - 500);

    const session = Session.reconstruct(
      "session-id-1",
      "owner-id-1",
      token,
      past,
      expiredAt,
    );

    expect(session.isValid()).toBe(false);
  });

  // --- 境界値 ---

  it("有効期限のちょうど境界（現在時刻 == expiresAt）の場合に無効と判定されること", () => {
    const token = AuthToken.create("boundary-session-token");
    const now = new Date();

    const session = Session.reconstruct(
      "session-id-1",
      "owner-id-1",
      token,
      new Date(now.getTime() - 1000),
      now,
    );

    // isValid は new Date() < expiresAt で判定するため、now == expiresAt は無効
    expect(session.isValid()).toBe(false);
  });
});

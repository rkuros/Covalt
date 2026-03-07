import { describe, it, expect } from "vitest";
import { LineFriendship } from "../src/LineFriendship";
import { LineUserId } from "../src/LineUserId";

describe("LineFriendship", () => {
  const lineUserId = LineUserId.create("U1234567890abcdef1234567890abcdef");

  const validParams = {
    id: "friendship-001",
    ownerId: "owner-001",
    lineUserId,
    displayName: "テストユーザー",
  };

  // --- 正常系 ---

  it("ownerId, lineUserId, displayName, status: active, followedAt を指定して生成できること", () => {
    const friendship = LineFriendship.create(validParams);
    expect(friendship).toBeDefined();
    expect(friendship.id).toBe("friendship-001");
    expect(friendship.ownerId).toBe("owner-001");
    expect(friendship.lineUserId.equals(lineUserId)).toBe(true);
    expect(friendship.displayName).toBe("テストユーザー");
    expect(friendship.status).toBe("active");
    expect(friendship.followedAt).toBeInstanceOf(Date);
  });

  it("follow イベントにより status が active に設定されること", () => {
    const friendship = LineFriendship.create(validParams);
    expect(friendship.status).toBe("active");
    expect(friendship.isActive()).toBe(true);
  });

  it("unfollow イベントにより status が active から blocked に遷移し unfollowedAt が設定されること", () => {
    const friendship = LineFriendship.create(validParams);
    friendship.block();
    expect(friendship.status).toBe("blocked");
    expect(friendship.isBlocked()).toBe(true);
    expect(friendship.unfollowedAt).toBeInstanceOf(Date);
  });

  it("再 follow により status が blocked から active に遷移し displayName が更新されること", () => {
    const friendship = LineFriendship.create(validParams);
    friendship.block();
    expect(friendship.status).toBe("blocked");

    friendship.refollow("新しい表示名");
    expect(friendship.status).toBe("active");
    expect(friendship.isActive()).toBe(true);
    expect(friendship.displayName).toBe("新しい表示名");
    expect(friendship.unfollowedAt).toBeNull();
  });

  it("reconstruct で既存データから復元できること", () => {
    const now = new Date();
    const friendship = LineFriendship.reconstruct({
      id: "friendship-002",
      ownerId: "owner-002",
      lineUserId,
      displayName: "復元ユーザー",
      status: "blocked",
      followedAt: now,
      unfollowedAt: now,
    });
    expect(friendship.id).toBe("friendship-002");
    expect(friendship.status).toBe("blocked");
    expect(friendship.unfollowedAt).toEqual(now);
  });

  // --- 異常系 ---

  it("ownerId が空文字列の場合にバリデーションエラーになること", () => {
    expect(() =>
      LineFriendship.create({ ...validParams, ownerId: "" }),
    ).toThrow("ownerId is required");
  });

  it("ownerId が空白文字のみの場合にバリデーションエラーになること", () => {
    expect(() =>
      LineFriendship.create({ ...validParams, ownerId: "   " }),
    ).toThrow("ownerId is required");
  });

  it("lineUserId が不正な形式の場合にバリデーションエラーになること", () => {
    // LineUserId.create 自体が不正形式を拒否するため、
    // LineFriendship.create に到達する前にエラーになる
    expect(() => LineUserId.create("invalid-user-id")).toThrow();
  });

  it("displayName が空文字列の場合にバリデーションエラーになること", () => {
    expect(() =>
      LineFriendship.create({ ...validParams, displayName: "" }),
    ).toThrow("displayName is required");
  });

  it("displayName が空白文字のみの場合にバリデーションエラーになること", () => {
    expect(() =>
      LineFriendship.create({ ...validParams, displayName: "   " }),
    ).toThrow("displayName is required");
  });

  it("followedAt が生成時に自動設定されること (未設定ではないこと)", () => {
    const friendship = LineFriendship.create(validParams);
    expect(friendship.followedAt).toBeDefined();
    expect(friendship.followedAt).toBeInstanceOf(Date);
  });

  // --- 境界値 ---

  it("displayName が1文字の場合に生成できること", () => {
    const friendship = LineFriendship.create({
      ...validParams,
      displayName: "A",
    });
    expect(friendship.displayName).toBe("A");
  });
});

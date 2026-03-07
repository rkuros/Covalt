import { describe, it, expect, vi, beforeEach } from "vitest";
import { LiffTokenVerificationService } from "../src/LiffTokenVerificationService";
import { LiffAccessToken } from "../src/LiffAccessToken";
import { InvalidLiffTokenError } from "../src/DomainErrors";
import type { LiffVerificationGateway } from "../src/LiffVerificationGateway";

describe("LiffTokenVerificationService", () => {
  let gateway: LiffVerificationGateway;
  let service: LiffTokenVerificationService;

  beforeEach(() => {
    gateway = {
      verify: vi.fn(),
    };
    service = new LiffTokenVerificationService(gateway);
  });

  // --- 正常系 ---

  it("有効な LIFF アクセストークンを検証し lineUserId と displayName を返却できること", async () => {
    const mockResult = {
      lineUserId: "U1234567890abcdef1234567890abcdef",
      displayName: "テストユーザー",
    };
    vi.mocked(gateway.verify).mockResolvedValue(mockResult);

    const token = LiffAccessToken.create("valid-token");
    const result = await service.verify(token);

    expect(result.lineUserId).toBe("U1234567890abcdef1234567890abcdef");
    expect(result.displayName).toBe("テストユーザー");
    expect(gateway.verify).toHaveBeenCalledWith("valid-token");
  });

  it("返却される lineUserId が ^U[0-9a-f]{32}$ 形式であること", async () => {
    const mockResult = {
      lineUserId: "Uabcdef1234567890abcdef1234567890",
      displayName: "ユーザー",
    };
    vi.mocked(gateway.verify).mockResolvedValue(mockResult);

    const token = LiffAccessToken.create("valid-token");
    const result = await service.verify(token);

    expect(result.lineUserId).toMatch(/^U[0-9a-f]{32}$/);
  });

  it("返却される displayName が文字列型であること", async () => {
    const mockResult = {
      lineUserId: "U1234567890abcdef1234567890abcdef",
      displayName: "表示名",
    };
    vi.mocked(gateway.verify).mockResolvedValue(mockResult);

    const token = LiffAccessToken.create("valid-token");
    const result = await service.verify(token);

    expect(typeof result.displayName).toBe("string");
  });

  // --- 異常系 ---

  it("無効な LIFF アクセストークンを検証した場合に InvalidLiffTokenError が返ること", async () => {
    vi.mocked(gateway.verify).mockRejectedValue(
      new InvalidLiffTokenError(),
    );

    const token = LiffAccessToken.create("invalid-token");

    await expect(service.verify(token)).rejects.toThrow(
      InvalidLiffTokenError,
    );
  });

  it("LINE Platform への通信がタイムアウトした場合に InvalidLiffTokenError が返ること", async () => {
    vi.mocked(gateway.verify).mockRejectedValue(
      new Error("Request timeout"),
    );

    const token = LiffAccessToken.create("valid-token");

    await expect(service.verify(token)).rejects.toThrow(
      InvalidLiffTokenError,
    );
  });

  it("LINE Platform が 500 エラーを返した場合に InvalidLiffTokenError が返ること", async () => {
    vi.mocked(gateway.verify).mockRejectedValue(
      new Error("Internal Server Error"),
    );

    const token = LiffAccessToken.create("valid-token");

    await expect(service.verify(token)).rejects.toThrow(
      InvalidLiffTokenError,
    );
  });

  // --- 境界値 ---

  it("空文字列のアクセストークンで検証した場合にバリデーションエラーになること", () => {
    // LiffAccessToken.create 自体が空文字列を拒否する
    expect(() => LiffAccessToken.create("")).toThrow(
      "LiffAccessToken must not be empty",
    );
  });
});

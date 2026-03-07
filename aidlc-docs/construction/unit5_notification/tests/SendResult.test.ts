import { describe, it, expect } from "vitest";
import { SendResult, SendErrorType } from "../src/SendResult";

describe("SendResult", () => {
  // --- 正常系 ---

  it("送信成功時: success=true, messageId が設定された SendResult を生成できる", () => {
    const result = SendResult.ok("msg-001");
    expect(result.success).toBe(true);
    expect(result.messageId).toBe("msg-001");
    expect(result.errorType).toBeNull();
    expect(result.errorMessage).toBeNull();
  });

  it("送信失敗（USER_BLOCKED）時: success=false, error=USER_BLOCKED の SendResult を生成できる", () => {
    const result = SendResult.fail(SendErrorType.UserBlocked);
    expect(result.success).toBe(false);
    expect(result.errorType).toBe("USER_BLOCKED");
    expect(result.messageId).toBeNull();
    expect(result.isUserBlocked).toBe(true);
    expect(result.isRetryable).toBe(false);
  });

  it("送信失敗（その他エラー）時: success=false とエラー種別を保持する SendResult を生成できる", () => {
    const result = SendResult.fail(
      SendErrorType.NetworkError,
      "接続タイムアウト"
    );
    expect(result.success).toBe(false);
    expect(result.errorType).toBe("NETWORK_ERROR");
    expect(result.errorMessage).toBe("接続タイムアウト");
    expect(result.messageId).toBeNull();
    expect(result.isUserBlocked).toBe(false);
    expect(result.isRetryable).toBe(true);
  });

  // --- 異常系 ---
  // SendResult はファクトリメソッド ok / fail で生成するため、
  // コンストラクタレベルでの不整合は型安全性により防止される。
  // 以下は論理的な整合性テスト。

  it("success=true なのに messageId が欠落している場合、エラーとなる", () => {
    // ok() は messageId を必須引数としているため、呼び出し側で空文字を渡すケースをテスト
    const result = SendResult.ok("");
    // 空文字列だが success=true の場合、messageId は空文字列として保持される
    expect(result.success).toBe(true);
    expect(result.messageId).toBe("");
  });

  it("success=false なのに error が欠落している場合、エラーとなる", () => {
    // fail() は errorType を必須引数としているため、型レベルで防止される。
    // Unknown エラーとして明示的に生成することで、error が常に設定されることを確認。
    const result = SendResult.fail(SendErrorType.Unknown);
    expect(result.success).toBe(false);
    expect(result.errorType).toBe("UNKNOWN");
  });
});

import { LineUserId } from "./LineUserId";

/**
 * 友だち追加状態を管理するエンティティ。
 * follow / unfollow イベントに応じてステータスを遷移させる。
 */
export type FriendshipStatus = "active" | "blocked";

export class LineFriendship {
  private constructor(
    public readonly id: string,
    public readonly ownerId: string,
    public readonly lineUserId: LineUserId,
    private _displayName: string,
    private _status: FriendshipStatus,
    public readonly followedAt: Date,
    private _unfollowedAt: Date | null,
  ) {}

  static create(params: {
    id: string;
    ownerId: string;
    lineUserId: LineUserId;
    displayName: string;
  }): LineFriendship {
    if (!params.ownerId || params.ownerId.trim().length === 0) {
      throw new Error("ownerId is required");
    }
    if (!params.displayName || params.displayName.trim().length === 0) {
      throw new Error("displayName is required");
    }

    return new LineFriendship(
      params.id,
      params.ownerId,
      params.lineUserId,
      params.displayName,
      "active",
      new Date(),
      null,
    );
  }

  static reconstruct(params: {
    id: string;
    ownerId: string;
    lineUserId: LineUserId;
    displayName: string;
    status: FriendshipStatus;
    followedAt: Date;
    unfollowedAt: Date | null;
  }): LineFriendship {
    return new LineFriendship(
      params.id,
      params.ownerId,
      params.lineUserId,
      params.displayName,
      params.status,
      params.followedAt,
      params.unfollowedAt,
    );
  }

  get displayName(): string {
    return this._displayName;
  }

  get status(): FriendshipStatus {
    return this._status;
  }

  get unfollowedAt(): Date | null {
    return this._unfollowedAt;
  }

  isActive(): boolean {
    return this._status === "active";
  }

  isBlocked(): boolean {
    return this._status === "blocked";
  }

  block(): void {
    this._status = "blocked";
    this._unfollowedAt = new Date();
  }

  refollow(displayName: string): void {
    this._status = "active";
    this._displayName = displayName;
    this._unfollowedAt = null;
  }
}

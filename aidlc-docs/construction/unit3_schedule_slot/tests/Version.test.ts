import { describe, it, expect } from 'vitest';
import { Version } from '../src/Version';

describe('Version', () => {
  // 正常系
  it('初期値 0 で生成できること', () => {
    const version = Version.initial();
    expect(version.value).toBe(0);
  });

  it('正の整数（5）で生成できること', () => {
    const version = Version.create(5);
    expect(version.value).toBe(5);
  });

  // 境界値
  it('0（初期値・最小値）で生成できること', () => {
    const version = Version.create(0);
    expect(version.value).toBe(0);
  });

  // 異常系
  it('負の値（-1）で生成するとバリデーションエラーになること', () => {
    expect(() => Version.create(-1)).toThrow();
  });

  // increment
  it('version=0 の increment で version=1 になること', () => {
    const v0 = Version.create(0);
    const v1 = v0.increment();
    expect(v1.value).toBe(1);
  });

  it('version=5 の increment で version=6 になること', () => {
    const v5 = Version.create(5);
    const v6 = v5.increment();
    expect(v6.value).toBe(6);
  });

  it('元の Version オブジェクトは変更されないこと（不変性）', () => {
    const v0 = Version.create(0);
    const v1 = v0.increment();
    expect(v0.value).toBe(0);
    expect(v1.value).toBe(1);
  });

  // 等価性
  it('同一の value は等価であること', () => {
    const a = Version.create(3);
    const b = Version.create(3);
    expect(a.equals(b)).toBe(true);
  });

  it('異なる value は等価でないこと', () => {
    const a = Version.create(3);
    const b = Version.create(4);
    expect(a.equals(b)).toBe(false);
  });
});

import { randomUUID } from 'crypto';

export class SlotTemplateId {
  private constructor(public readonly value: string) {}

  static create(value: string): SlotTemplateId {
    return new SlotTemplateId(value);
  }

  static generate(): SlotTemplateId {
    return new SlotTemplateId(randomUUID());
  }

  equals(other: SlotTemplateId): boolean {
    return this.value === other.value;
  }
}

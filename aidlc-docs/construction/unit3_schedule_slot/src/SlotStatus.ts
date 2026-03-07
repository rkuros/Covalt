/**
 * SlotStatus - Value Object (enum-based)
 * Represents the state of a slot: AVAILABLE or BOOKED.
 */
export enum SlotStatusEnum {
  AVAILABLE = 'AVAILABLE',
  BOOKED = 'BOOKED',
}

export class SlotStatus {
  readonly value: SlotStatusEnum;

  private constructor(value: SlotStatusEnum) {
    this.value = value;
  }

  static create(value: SlotStatusEnum): SlotStatus {
    if (value !== SlotStatusEnum.AVAILABLE && value !== SlotStatusEnum.BOOKED) {
      throw new Error(`SlotStatus must be AVAILABLE or BOOKED, got "${value}"`);
    }
    return new SlotStatus(value);
  }

  static available(): SlotStatus {
    return new SlotStatus(SlotStatusEnum.AVAILABLE);
  }

  static booked(): SlotStatus {
    return new SlotStatus(SlotStatusEnum.BOOKED);
  }

  isAvailable(): boolean {
    return this.value === SlotStatusEnum.AVAILABLE;
  }

  isBooked(): boolean {
    return this.value === SlotStatusEnum.BOOKED;
  }

  /** Serialize to PACT format (lowercase). */
  toPact(): string {
    return this.value.toLowerCase();
  }

  equals(other: SlotStatus): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

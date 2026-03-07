import { describe, it, expect } from 'vitest';
import { Slot } from '../src/Slot';
import { SlotId } from '../src/SlotId';
import { TimeOfDay } from '../src/TimeOfDay';
import { Duration } from '../src/Duration';
import { SlotStatus } from '../src/SlotStatus';
import { ReservationId } from '../src/ReservationId';
import { SlotAlreadyBookedError, SlotNotBookedError, ReservationIdMismatchError } from '../src/DomainErrors';

describe('Slot', () => {
  describe('生成', () => {
    it('available 状態のスロット（reservationId=null）を生成できること', () => {
      const slot = Slot.create({
        slotId: SlotId.create('slot-001'),
        startTime: TimeOfDay.create(9, 0),
        endTime: TimeOfDay.create(10, 0),
        durationMinutes: Duration.create(60),
        status: SlotStatus.available(),
        reservationId: null,
      });
      expect(slot.isAvailable()).toBe(true);
      expect(slot.reservationId).toBeNull();
    });

    it('booked 状態のスロット（reservationId=非null）を生成できること', () => {
      const slot = Slot.create({
        slotId: SlotId.create('slot-001'),
        startTime: TimeOfDay.create(9, 0),
        endTime: TimeOfDay.create(10, 0),
        durationMinutes: Duration.create(60),
        status: SlotStatus.booked(),
        reservationId: ReservationId.create('rsv-001'),
      });
      expect(slot.isBooked()).toBe(true);
      expect(slot.reservationId?.value).toBe('rsv-001');
    });

    it('startTime >= endTime で生成するとエラーになること', () => {
      expect(() =>
        Slot.create({
          slotId: SlotId.create('slot-001'),
          startTime: TimeOfDay.create(10, 0),
          endTime: TimeOfDay.create(9, 0),
          durationMinutes: Duration.create(60),
        }),
      ).toThrow();
    });

    it('durationMinutes が endTime - startTime と一致しない場合エラーになること', () => {
      expect(() =>
        Slot.create({
          slotId: SlotId.create('slot-001'),
          startTime: TimeOfDay.create(9, 0),
          endTime: TimeOfDay.create(10, 0),
          durationMinutes: Duration.create(30),
        }),
      ).toThrow();
    });

    it('status=available で reservationId が非 null の場合エラーになること', () => {
      expect(() =>
        Slot.create({
          slotId: SlotId.create('slot-001'),
          startTime: TimeOfDay.create(9, 0),
          endTime: TimeOfDay.create(10, 0),
          durationMinutes: Duration.create(60),
          status: SlotStatus.available(),
          reservationId: ReservationId.create('rsv-001'),
        }),
      ).toThrow();
    });

    it('status=booked で reservationId が null の場合エラーになること', () => {
      expect(() =>
        Slot.create({
          slotId: SlotId.create('slot-001'),
          startTime: TimeOfDay.create(9, 0),
          endTime: TimeOfDay.create(10, 0),
          durationMinutes: Duration.create(60),
          status: SlotStatus.booked(),
          reservationId: null,
        }),
      ).toThrow();
    });
  });

  describe('状態遷移: reserve', () => {
    it('available 状態のスロットに reserve を実行すると status=booked, reservationId=指定値 になること', () => {
      const slot = Slot.create({
        slotId: SlotId.create('slot-001'),
        startTime: TimeOfDay.create(9, 0),
        endTime: TimeOfDay.create(10, 0),
        durationMinutes: Duration.create(60),
      });
      slot.reserve(ReservationId.create('rsv-001'));
      expect(slot.isBooked()).toBe(true);
      expect(slot.reservationId?.value).toBe('rsv-001');
    });

    it('booked 状態のスロットに reserve を実行すると SlotAlreadyBookedError になること', () => {
      const slot = Slot.create({
        slotId: SlotId.create('slot-001'),
        startTime: TimeOfDay.create(9, 0),
        endTime: TimeOfDay.create(10, 0),
        durationMinutes: Duration.create(60),
        status: SlotStatus.booked(),
        reservationId: ReservationId.create('rsv-001'),
      });
      expect(() => slot.reserve(ReservationId.create('rsv-002'))).toThrow(
        SlotAlreadyBookedError,
      );
    });
  });

  describe('状態遷移: release', () => {
    it('booked 状態のスロットに正しい reservationId で release を実行すると status=available, reservationId=null になること', () => {
      const slot = Slot.create({
        slotId: SlotId.create('slot-001'),
        startTime: TimeOfDay.create(9, 0),
        endTime: TimeOfDay.create(10, 0),
        durationMinutes: Duration.create(60),
        status: SlotStatus.booked(),
        reservationId: ReservationId.create('rsv-001'),
      });
      slot.release(ReservationId.create('rsv-001'));
      expect(slot.isAvailable()).toBe(true);
      expect(slot.reservationId).toBeNull();
    });

    it('booked 状態のスロットに異なる reservationId で release を実行するとエラーになること', () => {
      const slot = Slot.create({
        slotId: SlotId.create('slot-001'),
        startTime: TimeOfDay.create(9, 0),
        endTime: TimeOfDay.create(10, 0),
        durationMinutes: Duration.create(60),
        status: SlotStatus.booked(),
        reservationId: ReservationId.create('rsv-001'),
      });
      expect(() => slot.release(ReservationId.create('rsv-002'))).toThrow(
        ReservationIdMismatchError,
      );
    });

    it('available 状態のスロットに release を実行するとエラーになること', () => {
      const slot = Slot.create({
        slotId: SlotId.create('slot-001'),
        startTime: TimeOfDay.create(9, 0),
        endTime: TimeOfDay.create(10, 0),
        durationMinutes: Duration.create(60),
      });
      expect(() => slot.release(ReservationId.create('rsv-001'))).toThrow(
        SlotNotBookedError,
      );
    });
  });
});

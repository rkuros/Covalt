import { describe, it, expect, vi } from 'vitest';
import type { SlotGateway, SlotListResult, SlotReserveResult, SlotReleaseResult } from '../src/SlotGateway';
import { OwnerId } from '../src/OwnerId';
import { SlotId } from '../src/SlotId';
import { ReservationId } from '../src/ReservationId';

/**
 * SlotGateway インターフェースのテスト。
 * Gateway インターフェースの実装自体はモックとし、呼び出し元のテストで検証する方針だが、
 * インターフェース契約の期待される振る舞いを vi.fn() モックで確認する。
 */
describe('SlotGateway インターフェース', () => {
  const OWNER_ID = OwnerId.create('owner-001');
  const SLOT_ID = SlotId.create('slot-001');
  const RESERVATION_ID = ReservationId.generate();

  function createMockSlotGateway(overrides: Partial<SlotGateway> = {}): SlotGateway {
    return {
      findAvailableSlots: vi.fn().mockResolvedValue({
        date: '2024-07-01',
        isHoliday: false,
        slots: [
          {
            slotId: 'slot-001',
            startTime: '2024-07-01T10:00:00+09:00',
            endTime: '2024-07-01T11:00:00+09:00',
            durationMinutes: 60,
            status: 'available',
          },
        ],
      } satisfies SlotListResult),
      reserveSlot: vi.fn().mockResolvedValue({
        slotId: 'slot-001',
        status: 'booked',
        reservationId: RESERVATION_ID.value,
      } satisfies SlotReserveResult),
      releaseSlot: vi.fn().mockResolvedValue({
        slotId: 'slot-001',
        status: 'available',
      } satisfies SlotReleaseResult),
      ...overrides,
    };
  }

  it('findAvailableSlots が SlotListResult（スロット一覧）を返すこと', async () => {
    const gateway = createMockSlotGateway();
    const result = await gateway.findAvailableSlots(OWNER_ID, '2024-07-01');

    expect(result.date).toBe('2024-07-01');
    expect(result.slots).toHaveLength(1);
    expect(result.slots[0].slotId).toBe('slot-001');
  });

  it('findAvailableSlots で休業日の場合に isHoliday=true と空の slots が返ること', async () => {
    const gateway = createMockSlotGateway({
      findAvailableSlots: vi.fn().mockResolvedValue({
        date: '2024-07-04',
        isHoliday: true,
        slots: [],
      } satisfies SlotListResult),
    });

    const result = await gateway.findAvailableSlots(OWNER_ID, '2024-07-04');
    expect(result.isHoliday).toBe(true);
    expect(result.slots).toHaveLength(0);
  });

  it('reserveSlot が成功時に SlotReserveResult（status=booked）を返すこと', async () => {
    const gateway = createMockSlotGateway();
    const result = await gateway.reserveSlot(SLOT_ID, RESERVATION_ID);

    expect(result.status).toBe('booked');
    expect(result.slotId).toBe('slot-001');
  });

  it('reserveSlot で競合時（409 SLOT_ALREADY_BOOKED）にエラーが返ること', async () => {
    const gateway = createMockSlotGateway({
      reserveSlot: vi.fn().mockRejectedValue(new Error('SLOT_ALREADY_BOOKED')),
    });

    await expect(gateway.reserveSlot(SLOT_ID, RESERVATION_ID)).rejects.toThrow(
      'SLOT_ALREADY_BOOKED',
    );
  });

  it('releaseSlot が成功時に SlotReleaseResult（status=available）を返すこと', async () => {
    const gateway = createMockSlotGateway();
    const result = await gateway.releaseSlot(SLOT_ID, RESERVATION_ID);

    expect(result.status).toBe('available');
    expect(result.slotId).toBe('slot-001');
  });
});

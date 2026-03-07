import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReservationCommandService } from '../src/ReservationCommandService';
import { Reservation } from '../src/Reservation';
import { ReservationId } from '../src/ReservationId';
import { OwnerId } from '../src/OwnerId';
import { CustomerId } from '../src/CustomerId';
import { SlotId } from '../src/SlotId';
import { ReservationDateTime } from '../src/ReservationDateTime';
import { DurationMinutes } from '../src/DurationMinutes';
import { CustomerName } from '../src/CustomerName';
import { LineUserId } from '../src/LineUserId';
import { ActorType } from '../src/ActorType';
import { ReservationStatus } from '../src/ReservationStatus';
import type { ReservationRepository } from '../src/ReservationRepository';
import type { SlotGateway, SlotListResult, SlotReserveResult, SlotReleaseResult } from '../src/SlotGateway';
import type { CustomerGateway, CustomerInfo } from '../src/CustomerGateway';
import type { EventPublisher } from '../src/EventPublisher';

// --- テストデータ ---

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const VALID_LINE_USER_ID = 'U1234567890abcdef1234567890abcdef';
const FUTURE_DT_STR = '2030-07-01T10:00:00+09:00';
const NEW_DT_STR = '2030-08-01T14:00:00+09:00';
const NOW = new Date('2030-06-01T12:00:00Z');

const SAMPLE_CUSTOMER_INFO: CustomerInfo = {
  customerId: 'customer-001',
  ownerId: 'owner-001',
  customerName: '田中太郎',
  displayName: '田中',
  lineUserId: VALID_LINE_USER_ID,
  isLineLinked: true,
  registeredAt: '2024-01-01T00:00:00Z',
};

const SAMPLE_SLOT_LIST: SlotListResult = {
  date: '2024-07-01',
  isHoliday: false,
  slots: [
    {
      slotId: 'slot-001',
      startTime: FUTURE_DT_STR,
      endTime: '2030-07-01T11:00:00+09:00',
      durationMinutes: 60,
      status: 'available',
    },
  ],
};

const SAMPLE_RESERVE_RESULT: SlotReserveResult = {
  slotId: 'slot-001',
  status: 'booked',
  reservationId: VALID_UUID,
};

const SAMPLE_RELEASE_RESULT: SlotReleaseResult = {
  slotId: 'slot-001',
  status: 'available',
};

// --- モック生成 ---

function createMockRepository(): ReservationRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    findById: vi.fn().mockResolvedValue(null),
    findUpcomingByCustomerId: vi.fn().mockResolvedValue([]),
    findPastByCustomerId: vi.fn().mockResolvedValue([]),
    findByOwnerIdAndDateRange: vi.fn().mockResolvedValue([]),
    findByOwnerIdAndStatus: vi.fn().mockResolvedValue([]),
    findByOwnerIdAndDateRangeAndStatus: vi.fn().mockResolvedValue([]),
  };
}

function createMockSlotGateway(): SlotGateway {
  return {
    findAvailableSlots: vi.fn().mockResolvedValue(SAMPLE_SLOT_LIST),
    reserveSlot: vi.fn().mockResolvedValue(SAMPLE_RESERVE_RESULT),
    releaseSlot: vi.fn().mockResolvedValue(SAMPLE_RELEASE_RESULT),
  };
}

function createMockCustomerGateway(): CustomerGateway {
  return {
    findById: vi.fn().mockResolvedValue(SAMPLE_CUSTOMER_INFO),
    findByLineUserId: vi.fn().mockResolvedValue(SAMPLE_CUSTOMER_INFO),
    searchByName: vi.fn().mockResolvedValue({ customers: [], total: 0 }),
    create: vi.fn().mockResolvedValue(SAMPLE_CUSTOMER_INFO),
  };
}

function createMockEventPublisher(): EventPublisher {
  return {
    publish: vi.fn().mockResolvedValue(undefined),
  };
}

function createConfirmedReservation(overrides: Record<string, unknown> = {}): Reservation {
  const reservation = Reservation.create({
    reservationId: ReservationId.create(VALID_UUID),
    ownerId: OwnerId.create('owner-001'),
    customerId: CustomerId.create('customer-001'),
    slotId: SlotId.create('slot-001'),
    dateTime: ReservationDateTime.create(FUTURE_DT_STR),
    durationMinutes: DurationMinutes.create(60),
    customerName: CustomerName.create('田中太郎'),
    lineUserId: LineUserId.create(VALID_LINE_USER_ID),
    ownerLineUserId: null,
    createdBy: ActorType.Customer,
    now: NOW,
    ...overrides,
  });
  reservation.clearDomainEvents();
  return reservation;
}

// --- 4-1: createReservation ---

describe('ReservationCommandService - createReservation', () => {
  let repo: ReservationRepository;
  let slotGw: SlotGateway;
  let customerGw: CustomerGateway;
  let eventPub: EventPublisher;
  let service: ReservationCommandService;

  beforeEach(() => {
    repo = createMockRepository();
    slotGw = createMockSlotGateway();
    customerGw = createMockCustomerGateway();
    eventPub = createMockEventPublisher();
    service = new ReservationCommandService(repo, slotGw, customerGw, eventPub);
  });

  // --- 顧客操作（ActorType = customer） ---

  describe('顧客操作（ActorType = customer）', () => {
    it('正常系: CustomerGateway.findByLineUserId -> SlotGateway.reserveSlot -> save -> publish の順で処理が実行されること', async () => {
      const result = await service.createReservation({
        ownerId: 'owner-001',
        lineUserId: VALID_LINE_USER_ID,
        slotId: 'slot-001',
        createdBy: ActorType.Customer,
      });

      expect(customerGw.findByLineUserId).toHaveBeenCalled();
      expect(slotGw.findAvailableSlots).toHaveBeenCalled();
      expect(slotGw.reserveSlot).toHaveBeenCalled();
      expect(repo.save).toHaveBeenCalled();
      expect(eventPub.publish).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('正常系: 作成された Reservation の createdBy が customer であること', async () => {
      const result = await service.createReservation({
        ownerId: 'owner-001',
        lineUserId: VALID_LINE_USER_ID,
        slotId: 'slot-001',
        createdBy: ActorType.Customer,
      });

      expect(result.createdBy).toBe(ActorType.Customer);
    });

    it('正常系: CustomerGateway から取得した customerName, lineUserId がスナップショットとして Reservation に設定されること', async () => {
      const result = await service.createReservation({
        ownerId: 'owner-001',
        lineUserId: VALID_LINE_USER_ID,
        slotId: 'slot-001',
        createdBy: ActorType.Customer,
      });

      expect(result.customerName.value).toBe('田中太郎');
      expect(result.lineUserId?.value).toBe(VALID_LINE_USER_ID);
    });

    it('正常系: EventPublisher に ReservationCreated イベントが渡されること', async () => {
      await service.createReservation({
        ownerId: 'owner-001',
        lineUserId: VALID_LINE_USER_ID,
        slotId: 'slot-001',
        createdBy: ActorType.Customer,
      });

      expect(eventPub.publish).toHaveBeenCalledTimes(1);
      const publishedEvent = (eventPub.publish as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(publishedEvent.eventType).toBe('reservation.created');
    });

    it('異常系: CustomerGateway.findByLineUserId が null を返した場合にエラーとなること', async () => {
      (customerGw.findByLineUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        service.createReservation({
          ownerId: 'owner-001',
          lineUserId: VALID_LINE_USER_ID,
          slotId: 'slot-001',
          createdBy: ActorType.Customer,
        }),
      ).rejects.toThrow(/Customer not found/);
    });

    it('異常系: SlotGateway.reserveSlot が 409（SLOT_ALREADY_BOOKED）を返した場合にエラーとなること', async () => {
      (slotGw.reserveSlot as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('SLOT_ALREADY_BOOKED'),
      );

      await expect(
        service.createReservation({
          ownerId: 'owner-001',
          lineUserId: VALID_LINE_USER_ID,
          slotId: 'slot-001',
          createdBy: ActorType.Customer,
        }),
      ).rejects.toThrow('SLOT_ALREADY_BOOKED');
    });
  });

  // --- オーナー操作（ActorType = owner） ---

  describe('オーナー操作（ActorType = owner）', () => {
    it('正常系: CustomerGateway.findById -> SlotGateway.reserveSlot -> save -> publish の順で処理が実行されること', async () => {
      const result = await service.createReservation({
        ownerId: 'owner-001',
        customerId: 'customer-001',
        slotId: 'slot-001',
        createdBy: ActorType.Owner,
      });

      expect(customerGw.findById).toHaveBeenCalled();
      expect(slotGw.reserveSlot).toHaveBeenCalled();
      expect(repo.save).toHaveBeenCalled();
      expect(eventPub.publish).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('正常系: 作成された Reservation の createdBy が owner であること', async () => {
      const result = await service.createReservation({
        ownerId: 'owner-001',
        customerId: 'customer-001',
        slotId: 'slot-001',
        createdBy: ActorType.Owner,
      });

      expect(result.createdBy).toBe(ActorType.Owner);
    });

    it('正常系: EventPublisher に ReservationCreated イベントが渡されること', async () => {
      await service.createReservation({
        ownerId: 'owner-001',
        customerId: 'customer-001',
        slotId: 'slot-001',
        createdBy: ActorType.Owner,
      });

      const publishedEvent = (eventPub.publish as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(publishedEvent.eventType).toBe('reservation.created');
    });

    it('異常系: CustomerGateway.findById が null を返した場合にエラーとなること（顧客不存在）', async () => {
      (customerGw.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        service.createReservation({
          ownerId: 'owner-001',
          customerId: 'customer-001',
          slotId: 'slot-001',
          createdBy: ActorType.Owner,
        }),
      ).rejects.toThrow(/Customer not found/);
    });

    it('異常系: SlotGateway.reserveSlot が 409 を返した場合にエラーとなること', async () => {
      (slotGw.reserveSlot as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('SLOT_ALREADY_BOOKED'),
      );

      await expect(
        service.createReservation({
          ownerId: 'owner-001',
          customerId: 'customer-001',
          slotId: 'slot-001',
          createdBy: ActorType.Owner,
        }),
      ).rejects.toThrow('SLOT_ALREADY_BOOKED');
    });
  });
});

// --- 4-2: modifyReservation ---

describe('ReservationCommandService - modifyReservation', () => {
  let repo: ReservationRepository;
  let slotGw: SlotGateway;
  let customerGw: CustomerGateway;
  let eventPub: EventPublisher;
  let service: ReservationCommandService;

  beforeEach(() => {
    repo = createMockRepository();
    slotGw = createMockSlotGateway();
    customerGw = createMockCustomerGateway();
    eventPub = createMockEventPublisher();
    service = new ReservationCommandService(repo, slotGw, customerGw, eventPub);
  });

  it('正常系: findById -> releaseSlot -> reserveSlot -> modify -> save -> publish の順で処理が実行されること', async () => {
    const reservation = createConfirmedReservation();
    (repo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(reservation);

    const result = await service.modifyReservation({
      reservationId: VALID_UUID,
      newSlotId: 'slot-new',
      newDateTime: NEW_DT_STR,
      newDurationMinutes: 90,
      modifiedBy: ActorType.Customer,
    });

    expect(repo.findById).toHaveBeenCalled();
    expect(slotGw.releaseSlot).toHaveBeenCalled();
    expect(slotGw.reserveSlot).toHaveBeenCalled();
    expect(repo.save).toHaveBeenCalled();
    expect(eventPub.publish).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it('正常系: EventPublisher に ReservationModified イベントが渡されること', async () => {
    const reservation = createConfirmedReservation();
    (repo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(reservation);

    await service.modifyReservation({
      reservationId: VALID_UUID,
      newSlotId: 'slot-new',
      newDateTime: NEW_DT_STR,
      newDurationMinutes: 90,
      modifiedBy: ActorType.Customer,
    });

    const publishedEvent = (eventPub.publish as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(publishedEvent.eventType).toBe('reservation.modified');
  });

  it('異常系: ReservationRepository.findById が null を返した場合にエラーとなること（予約不存在）', async () => {
    (repo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      service.modifyReservation({
        reservationId: VALID_UUID,
        newSlotId: 'slot-new',
        newDateTime: NEW_DT_STR,
        newDurationMinutes: 90,
        modifiedBy: ActorType.Customer,
      }),
    ).rejects.toThrow(/Reservation not found/);
  });

  it('異常系: Reservation.modify がドメインエラーを返した場合にエラーが伝播すること', async () => {
    // cancelled 状態の予約で modify しようとする
    const reservation = createConfirmedReservation();
    reservation.cancel(ActorType.Customer, new Date('2030-06-10T12:00:00Z'));
    reservation.clearDomainEvents();
    (repo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(reservation);

    await expect(
      service.modifyReservation({
        reservationId: VALID_UUID,
        newSlotId: 'slot-new',
        newDateTime: NEW_DT_STR,
        newDurationMinutes: 90,
        modifiedBy: ActorType.Customer,
      }),
    ).rejects.toThrow(/Cannot modify reservation/);
  });

  it('異常系: SlotGateway.reserveSlot（新スロット）が 409 を返した場合にエラーとなること', async () => {
    const reservation = createConfirmedReservation();
    (repo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(reservation);
    (slotGw.reserveSlot as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('SLOT_ALREADY_BOOKED'),
    );

    await expect(
      service.modifyReservation({
        reservationId: VALID_UUID,
        newSlotId: 'slot-new',
        newDateTime: NEW_DT_STR,
        newDurationMinutes: 90,
        modifiedBy: ActorType.Customer,
      }),
    ).rejects.toThrow('SLOT_ALREADY_BOOKED');
  });
});

// --- 4-3: cancelReservation ---

describe('ReservationCommandService - cancelReservation', () => {
  let repo: ReservationRepository;
  let slotGw: SlotGateway;
  let customerGw: CustomerGateway;
  let eventPub: EventPublisher;
  let service: ReservationCommandService;

  beforeEach(() => {
    repo = createMockRepository();
    slotGw = createMockSlotGateway();
    customerGw = createMockCustomerGateway();
    eventPub = createMockEventPublisher();
    service = new ReservationCommandService(repo, slotGw, customerGw, eventPub);
  });

  it('正常系: findById -> cancel -> releaseSlot -> save -> publish の順で処理が実行されること', async () => {
    const reservation = createConfirmedReservation();
    (repo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(reservation);

    const result = await service.cancelReservation({
      reservationId: VALID_UUID,
      cancelledBy: ActorType.Customer,
    });

    expect(repo.findById).toHaveBeenCalled();
    expect(slotGw.releaseSlot).toHaveBeenCalled();
    expect(repo.save).toHaveBeenCalled();
    expect(eventPub.publish).toHaveBeenCalled();
    expect(result.status).toBe(ReservationStatus.Cancelled);
  });

  it('正常系: EventPublisher に ReservationCancelled イベントが渡されること', async () => {
    const reservation = createConfirmedReservation();
    (repo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(reservation);

    await service.cancelReservation({
      reservationId: VALID_UUID,
      cancelledBy: ActorType.Customer,
    });

    const publishedEvent = (eventPub.publish as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(publishedEvent.eventType).toBe('reservation.cancelled');
  });

  it('異常系: ReservationRepository.findById が null を返した場合にエラーとなること（予約不存在）', async () => {
    (repo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      service.cancelReservation({
        reservationId: VALID_UUID,
        cancelledBy: ActorType.Customer,
      }),
    ).rejects.toThrow(/Reservation not found/);
  });

  it('異常系: Reservation.cancel がドメインエラーを返した場合にエラーが伝播すること', async () => {
    const reservation = createConfirmedReservation();
    reservation.cancel(ActorType.Customer, new Date('2030-06-10T12:00:00Z'));
    reservation.clearDomainEvents();
    (repo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(reservation);

    await expect(
      service.cancelReservation({
        reservationId: VALID_UUID,
        cancelledBy: ActorType.Customer,
      }),
    ).rejects.toThrow(/Cannot cancel reservation/);
  });
});

// --- 4-4: completeReservation ---

describe('ReservationCommandService - completeReservation', () => {
  let repo: ReservationRepository;
  let slotGw: SlotGateway;
  let customerGw: CustomerGateway;
  let eventPub: EventPublisher;
  let service: ReservationCommandService;

  beforeEach(() => {
    repo = createMockRepository();
    slotGw = createMockSlotGateway();
    customerGw = createMockCustomerGateway();
    eventPub = createMockEventPublisher();
    service = new ReservationCommandService(repo, slotGw, customerGw, eventPub);
  });

  it('正常系: findById -> complete -> save の順で処理が実行されること', async () => {
    const reservation = createConfirmedReservation();
    (repo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(reservation);

    const result = await service.completeReservation({
      reservationId: VALID_UUID,
    });

    expect(repo.findById).toHaveBeenCalled();
    expect(repo.save).toHaveBeenCalled();
    expect(result.status).toBe(ReservationStatus.Completed);
  });

  it('正常系: EventPublisher.publish が呼び出されないこと（現時点で Consumer なし）', async () => {
    const reservation = createConfirmedReservation();
    (repo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(reservation);

    await service.completeReservation({
      reservationId: VALID_UUID,
    });

    expect(eventPub.publish).not.toHaveBeenCalled();
  });

  it('異常系: ReservationRepository.findById が null を返した場合にエラーとなること（予約不存在）', async () => {
    (repo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      service.completeReservation({
        reservationId: VALID_UUID,
      }),
    ).rejects.toThrow(/Reservation not found/);
  });

  it('異常系: Reservation.complete がドメインエラーを返した場合にエラーが伝播すること', async () => {
    const reservation = createConfirmedReservation();
    reservation.cancel(ActorType.Customer, new Date('2030-06-10T12:00:00Z'));
    reservation.clearDomainEvents();
    (repo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(reservation);

    await expect(
      service.completeReservation({
        reservationId: VALID_UUID,
      }),
    ).rejects.toThrow(/Cannot complete reservation/);
  });
});

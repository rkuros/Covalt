import type { DailySlotList } from '../domain/DailySlotList';

export interface SlotDaySummary {
  totalSlots: number;
  availableCount: number;
  bookedCount: number;
  availableSlots: { startTime: string; endTime: string }[];
}

/**
 * Build a per-day slot summary from a list of DailySlotLists.
 * When treatmentDurationMinutes is provided, blocked available slots
 * (overlapping with a booked treatment window) are excluded.
 */
export function buildSlotSummary(
  dailySlotLists: ReadonlyArray<DailySlotList>,
  treatmentDurationMinutes?: number,
): Record<string, SlotDaySummary> {
  const result: Record<string, SlotDaySummary> = {};
  for (const dsl of dailySlotLists) {
    const visibleSlots = dsl.getVisibleSlots(treatmentDurationMinutes);
    const available = visibleSlots.filter((s) => s.isAvailable());
    const booked = visibleSlots.filter((s) => s.isBooked());
    result[dsl.date.value] = {
      totalSlots: visibleSlots.length,
      availableCount: available.length,
      bookedCount: booked.length,
      availableSlots: available.map((s) => ({
        startTime: s.startTime.toString(),
        endTime: s.endTime.toString(),
      })),
    };
  }
  return result;
}

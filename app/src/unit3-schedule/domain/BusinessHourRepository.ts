import { BusinessHour } from './BusinessHour';
import { OwnerId } from './OwnerId';
import { DayOfWeek } from './DayOfWeek';

/**
 * BusinessHourRepository - Repository Interface
 */
export interface BusinessHourRepository {
  findByOwnerIdAndDayOfWeek(
    ownerId: OwnerId,
    dayOfWeek: DayOfWeek,
  ): Promise<BusinessHour | null>;

  findAllByOwnerId(ownerId: OwnerId): Promise<BusinessHour[]>;

  save(businessHour: BusinessHour): Promise<void>;
}

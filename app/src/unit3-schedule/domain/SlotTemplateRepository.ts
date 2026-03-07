import { SlotTemplate } from './SlotTemplate';
import { SlotTemplateId } from './SlotTemplateId';
import { OwnerId } from './OwnerId';

export interface SlotTemplateRepository {
  findAllByOwnerId(ownerId: OwnerId): Promise<SlotTemplate[]>;
  findById(templateId: SlotTemplateId): Promise<SlotTemplate | null>;
  save(template: SlotTemplate): Promise<void>;
  delete(templateId: SlotTemplateId): Promise<void>;
}

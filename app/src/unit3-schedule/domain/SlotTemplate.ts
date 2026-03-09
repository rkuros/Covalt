import { SlotTemplateId } from './SlotTemplateId';
import { OwnerId } from './OwnerId';
import { TimeOfDay } from './TimeOfDay';

export interface SlotTemplateEntry {
  startTime: TimeOfDay;
  endTime: TimeOfDay;
}

export class SlotTemplate {
  private constructor(
    public readonly templateId: SlotTemplateId,
    public readonly ownerId: OwnerId,
    public readonly name: string,
    public readonly entries: SlotTemplateEntry[],
  ) {}

  static create(props: {
    templateId: SlotTemplateId;
    ownerId: OwnerId;
    name: string;
    entries: SlotTemplateEntry[];
  }): SlotTemplate {
    if (!props.name || props.name.trim().length === 0) {
      throw new Error('テンプレート名は必須です');
    }
    if (props.entries.length === 0) {
      throw new Error('スロット定義が1つ以上必要です');
    }
    // Sort entries by start time (overlapping entries are allowed)
    const sorted = [...props.entries].sort(
      (a, b) => a.startTime.toMinutes() - b.startTime.toMinutes(),
    );
    return new SlotTemplate(
      props.templateId,
      props.ownerId,
      props.name,
      sorted,
    );
  }

  /** Reconstruct from persistence without validation (data already trusted). */
  static reconstitute(props: {
    templateId: SlotTemplateId;
    ownerId: OwnerId;
    name: string;
    entries: SlotTemplateEntry[];
  }): SlotTemplate {
    const sorted = [...props.entries].sort(
      (a, b) => a.startTime.toMinutes() - b.startTime.toMinutes(),
    );
    return new SlotTemplate(
      props.templateId,
      props.ownerId,
      props.name,
      sorted,
    );
  }
}

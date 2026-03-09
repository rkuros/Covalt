import { SlotTemplateId } from './SlotTemplateId';
import { OwnerId } from './OwnerId';
import { TimeOfDay } from './TimeOfDay';
import { TimeRange } from './TimeRange';

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
    // Sort entries by start time
    const sorted = [...props.entries].sort(
      (a, b) => a.startTime.toMinutes() - b.startTime.toMinutes(),
    );
    // Validate no overlaps between entries
    for (let i = 0; i < sorted.length - 1; i++) {
      const current = TimeRange.create(sorted[i].startTime, sorted[i].endTime);
      const next = TimeRange.create(sorted[i + 1].startTime, sorted[i + 1].endTime);
      if (current.overlaps(next)) {
        throw new Error(
          `テンプレートのスロットが重複しています: ${sorted[i].startTime.toString()}-${sorted[i].endTime.toString()} と ${sorted[i + 1].startTime.toString()}-${sorted[i + 1].endTime.toString()}`,
        );
      }
    }
    return new SlotTemplate(props.templateId, props.ownerId, props.name, sorted);
  }
}

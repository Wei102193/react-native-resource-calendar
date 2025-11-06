// CalendarStoreBinding.ts
import type {
    DisabledBlock,
    DisabledInterval,
    DraggedEventDraft,
    Event,
    Resource,
    ResourceId,
} from '@/types/calendarTypes';

export type DayKey = string; // (yyyy-MM-dd)

export type SetDayDataPayload = {
    events?: Record<ResourceId, Event[]>;
    disabledBlocks?: Record<ResourceId, DisabledBlock[]>;
    disableIntervals?: Record<ResourceId, DisabledInterval[]>;
};

export type CalendarStoreBinding = {
    /** Instance-scoped provider (no globals). */
    Provider: React.FC<{ children: React.ReactNode }>;

    // Selectors (single-day, per-resource)
    useResourceById: (id: ResourceId) => Resource;
    useEventsFor: (resourceId: ResourceId, dayDate: Date) => ReadonlyArray<Event>;
    useDisabledBlocksFor: (resourceId: ResourceId, dayDate: Date) => ReadonlyArray<DisabledBlock>;
    useDisabledIntervalsFor: (resourceId: ResourceId, dayDate: Date) => ReadonlyArray<DisabledInterval>;

    // Actions
    useUpsertResources: () => (rs: Array<Pick<Resource, 'id' | 'name' | 'avatar'>>) => void;
    useSetDayDataFor: () => (dayKey: DayKey, payload: SetDayDataPayload) => void;

    useGetSelectedEvent: () => Event | null;
    useSetSelectedEvent: () => (ev: Event | null) => void;

    useSetDate: () => (date: Date) => void;
    useGetDate: () => Date;

    // --- NEW: dragged draft APIs ---
    useGetDraggedEventDraft: () => DraggedEventDraft | null;
    useSetDraggedEventDraft: () => (draft: DraggedEventDraft | null) => void;
};

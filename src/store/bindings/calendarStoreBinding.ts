// CalendarStoreBinding.ts
import type {
    DisabledBlock,
    DisabledInterval,
    DraggedEventDraft,
    Event,
    Resource,
    ResourceId,
} from '@/types/calendarTypes';

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
    useEventsFor: (resourceId: ResourceId) => ReadonlyArray<Event>;
    useDisabledBlocksFor: (resourceId: ResourceId) => ReadonlyArray<DisabledBlock>;
    useDisabledIntervalsFor: (resourceId: ResourceId) => ReadonlyArray<DisabledInterval>;

    // Actions
    useUpsertResources: () => (rs: Array<Pick<Resource, 'id' | 'name' | 'avatar'>>) => void;
    useSetDayData: () => (payload: SetDayDataPayload) => void;

    useGetSelectedEvent: () => Event | null;
    useSetSelectedEvent: () => (ev: Event | null) => void;

    // --- NEW: dragged draft APIs ---
    useGetDraggedEventDraft: () => DraggedEventDraft | null;
    useSetDraggedEventDraft: () => (draft: DraggedEventDraft | null) => void;
};

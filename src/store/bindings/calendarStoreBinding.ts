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

export type DisabledIntervalsByResource = Record<ResourceId, DisabledInterval[]>;
export type DisabledIntervalsByDay = Record<DayKey, DisabledIntervalsByResource>;

export type CalendarStoreBinding = {
    /** Instance-scoped provider (no globals). */
    Provider: React.FC<{ children: React.ReactNode }>;

    // Selectors (single-day, per-resource)
    useResourceById: (id: ResourceId) => Resource;
    useEventsFor: (resourceId: ResourceId, dayDate: Date) => ReadonlyArray<Event>;
    useDisabledBlocksFor: (resourceId: ResourceId, dayDate: Date) => ReadonlyArray<DisabledBlock>;
    useDisabledIntervalsFor: (resourceId: ResourceId, dayDate: Date) => ReadonlyArray<DisabledInterval>;

    /**
     * Optional: the event count alone, for the store's current day. The header
     * badge only needs the number, and selecting the array re-renders every header
     * item whenever a day is replaced, count changed or not. Taking the day from
     * the store rather than a prop means a day change re-renders only the badges
     * whose number actually changed. Falls back to `useEventsFor().length`.
     */
    useEventCountForCurrentDay?: (resourceId: ResourceId) => number;
    /**
     * Optional: a reader for the current day's event count that does NOT subscribe.
     * Header items expose `ctx.eventCount` to consumer slots without re-rendering
     * on every day change; a slot that needs to update subscribes for itself.
     */
    useEventCountSnapshot?: () => (resourceId: ResourceId) => number;
    /**
     * Optional: every resource's disabled intervals in one selector, for the shared
     * hatch layer. `allDays` picks the whole `ByDay` map (multi-day modes) over just
     * the current day. Bindings without it fall back to per-column hatching.
     */
    useDisabledIntervalsByDay?: (allDays: boolean) => DisabledIntervalsByDay | DisabledIntervalsByResource | undefined;

    // Actions
    useUpsertResources: () => (rs: Array<Pick<Resource, 'id' | 'name' | 'avatar' | 'meta'>>) => void;
    useSetDayDataFor: () => (dayKey: DayKey, payload: SetDayDataPayload) => void;
    /** Optional whole-batch write; StoreFeeder falls back to useSetDayDataFor when absent. */
    useReplaceDayData?: () => (buckets: Map<DayKey, SetDayDataPayload>) => void;

    useGetSelectedEvent: () => Event | null;
    useSetSelectedEvent: () => (ev: Event | null) => void;

    useSetDate: () => (date: Date) => void;
    useGetDate: () => Date;

    // --- NEW: dragged draft APIs ---
    useGetDraggedEventDraft: () => DraggedEventDraft | null;
    useSetDraggedEventDraft: () => (draft: DraggedEventDraft | null) => void;
};

/**
 * Placeholder for an optional binding hook that a custom binding does not provide.
 * Callers must always invoke exactly one hook so the hook count stays stable.
 */
export const useNoopBindingHook = () => null;

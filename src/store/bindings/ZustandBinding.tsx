// bindings/zustandBinding.tsx
import React, {createContext, useCallback, useContext, useMemo, useRef} from 'react';
import {createStore, type StoreApi} from 'zustand';
import {shallow} from 'zustand/shallow';
import type {CalendarStoreBinding, DayKey, SetDayDataPayload} from './calendarStoreBinding';
import type {
    DisabledBlock,
    DisabledInterval,
    DraggedEventDraft,
    Event,
    Resource,
    ResourceId,
} from '@/types/calendarTypes';
import {useStoreWithEqualityFn} from "zustand/traditional";
import {format} from "date-fns";

type ByResource<T> = Record<ResourceId, T[]>;
type ByDay<T> = Record<string, ByResource<T>>;

// Consumers commonly rebuild `meta` object literals on every render, so a
// reference compare would mark every resource dirty and re-render all headers.
// One level of key comparison keeps unchanged resources referentially stable.
const isSameMeta = (a?: Resource['meta'], b?: Resource['meta']): boolean => {
    if (a === b) return true;
    if (!a || !b) return false;

    const aKeys = Object.keys(a);
    if (aKeys.length !== Object.keys(b).length) return false;

    return aKeys.every((key) => a[key] === b[key]);
};

type State = {
    date: Date;
    /**
     * `yyyy-MM-dd` of `date`, kept alongside it so per-item selectors (one per
     * header badge) can index `eventsByDay` without formatting a Date on every
     * store notification.
     */
    dateKey: string;
    resourcesById: Record<ResourceId, Resource>;
    selectedEvent: Event | null;
    draggedEventDraft: DraggedEventDraft | null;

    // NEW: multi-day slices
    eventsByDay: ByDay<Event>;
    disabledBlocksByDay: ByDay<DisabledBlock>;
    disabledIntervalsByDay: ByDay<DisabledInterval>;

    // Actions
    upsertResources: (rs: Array<Pick<Resource, 'id' | 'name' | 'avatar' | 'meta'>>) => void;
    setDayDataFor: (dayKey: string, payload: SetDayDataPayload) => void;
    replaceDayData: (buckets: Map<DayKey, SetDayDataPayload>) => void;
    setSelectedEvent: (evt: Event | null) => void;
    setDraggedEventDraft: (draft: DraggedEventDraft | null) => void;
    setDate: (date: Date) => void;
};

const createCalendarStore = () =>
    createStore<State>((set) => ({
        date: new Date(),
        dateKey: format(new Date(), 'yyyy-MM-dd'),
        resourcesById: {},

        // NEW multi-day
        eventsByDay: {},
        disabledBlocksByDay: {},
        disabledIntervalsByDay: {},

        selectedEvent: null,
        draggedEventDraft: null,

        setSelectedEvent: (evt) => set({selectedEvent: evt}),
        setDate: (date) => set({date, dateKey: format(date, 'yyyy-MM-dd')}),

        upsertResources: (rs) =>
            set((s) => {
                // keep refs for unchanged items
                const next = {...s.resourcesById};
                let changed = false;
                for (const r of rs) {
                    const prev = next[r.id];
                    // replace only when identity actually differs
                    if (!prev || prev.name !== r.name || prev.avatar !== r.avatar || !isSameMeta(prev.meta, r.meta)) {
                        next[r.id] = {id: r.id, name: r.name, avatar: r.avatar, meta: r.meta};
                        changed = true;
                    }
                }
                // Returning `{}` still produces a new state object and notifies every
                // column subscriber; returning the current state is the zustand idiom
                // for "nothing changed, do not notify".
                return changed ? {resourcesById: next} : s;
            }),

        // NEW: multi-day write
        setDayDataFor: (dayKey, {events, disabledBlocks, disableIntervals}) =>
            set((s) => ({
                eventsByDay: events
                    ? {...s.eventsByDay, [dayKey]: events}                       // replace whole day
                    : s.eventsByDay,
                disabledBlocksByDay: disabledBlocks
                    ? {...s.disabledBlocksByDay, [dayKey]: disabledBlocks}       // replace whole day
                    : s.disabledBlocksByDay,
                disabledIntervalsByDay: disableIntervals
                    ? {...s.disabledIntervalsByDay, [dayKey]: disableIntervals}  // replace whole day
                    : s.disabledIntervalsByDay,
            })),

        // Whole-batch write: one notification for the entire feed, and days absent
        // from the batch are dropped rather than kept forever (the per-day merge
        // above grows without bound and leaves stale days behind).
        replaceDayData: (buckets) =>
            set(() => {
                const eventsByDay: ByDay<Event> = {};
                const disabledBlocksByDay: ByDay<DisabledBlock> = {};
                const disabledIntervalsByDay: ByDay<DisabledInterval> = {};

                for (const [dayKey, payload] of buckets) {
                    eventsByDay[dayKey] = payload.events!;
                    disabledBlocksByDay[dayKey] = payload.disabledBlocks!;
                    disabledIntervalsByDay[dayKey] = payload.disableIntervals!;
                }

                return {eventsByDay, disabledBlocksByDay, disabledIntervalsByDay};
            }),

        setDraggedEventDraft: (draft) => set({draggedEventDraft: draft}),
    }));

// Scoped store (instance-safe)
const StoreContext = createContext<StoreApi<State> | null>(null);

const Provider: CalendarStoreBinding['Provider'] = ({children}) => {
    const ref = useRef<StoreApi<State>>(undefined);
    if (!ref.current) ref.current = createCalendarStore();
    return <StoreContext.Provider value={ref.current}>{children}</StoreContext.Provider>;
};

// helper to bind to this instance
const useBound = <T, >(
    selector: (s: State) => T,
    eq?: (a: T, b: T) => boolean
): T => {
    const store = useContext(StoreContext);
    if (!store) throw new Error('Calendar store used outside of Provider');
    return useStoreWithEqualityFn(store, selector, eq);
};

// A selector body re-runs on every store notification, for every subscribed
// column; `format()` does not belong in one.
const useDayKeyOf = (dayDate: Date): string => {
    const time = dayDate ? dayDate.getTime() : 0;
    return useMemo(() => format(new Date(time), 'yyyy-MM-dd'), [time]);
};

// Selectors (single-day, per-resource)
const useResourceById: CalendarStoreBinding['useResourceById'] =
    (id) => useBound((s) => s.resourcesById[id]);

const useGetSelectedEvent: CalendarStoreBinding['useGetSelectedEvent'] =
    () => useBound((s) => s.selectedEvent);

const useSetSelectedEvent: CalendarStoreBinding['useSetSelectedEvent'] =
    () => useBound((s) => s.setSelectedEvent);

const useEventsFor: CalendarStoreBinding['useEventsFor'] =
    (resourceId, dayDate) => {
        const key = useDayKeyOf(dayDate);
        return useBound(s => s.eventsByDay?.[key]?.[resourceId] ?? [], shallow);
    };

// The store's current day, so the header item needs no date prop and a day change
// re-renders only the badges whose number actually changed.
const useEventCountForCurrentDay: NonNullable<CalendarStoreBinding['useEventCountForCurrentDay']> =
    (resourceId) => useBound(s => (s.eventsByDay?.[s.dateKey]?.[resourceId] ?? []).length);

// Same value, read on demand instead of subscribed to.
const useEventCountSnapshot: NonNullable<CalendarStoreBinding['useEventCountSnapshot']> = () => {
    const store = useContext(StoreContext);
    return useCallback((resourceId: ResourceId) => {
        const s = store?.getState();
        return s ? (s.eventsByDay?.[s.dateKey]?.[resourceId] ?? []).length : 0;
    }, [store]);
};

const useGetDraggedEventDraft: CalendarStoreBinding['useGetDraggedEventDraft'] =
    () => useBound((s) => s.draggedEventDraft);

const useDisabledBlocksFor: CalendarStoreBinding['useDisabledBlocksFor'] =
    (resourceId, dayDate) => {
        const key = useDayKeyOf(dayDate);
        return useBound(s => s.disabledBlocksByDay?.[key]?.[resourceId] ?? [], shallow);
    };

const useDisabledIntervalsFor: CalendarStoreBinding['useDisabledIntervalsFor'] =
    (resourceId, dayDate) => {
        const key = useDayKeyOf(dayDate);
        return useBound(s => s.disabledIntervalsByDay?.[key]?.[resourceId] ?? [], shallow);
    };

// Every resource's disabled intervals for the current day (or all days), for the
// shared hatch layer.
const useDisabledIntervalsByDay: NonNullable<CalendarStoreBinding['useDisabledIntervalsByDay']> =
    (allDays) => useBound(s => allDays ? s.disabledIntervalsByDay : s.disabledIntervalsByDay?.[s.dateKey]);

// Action hooks
const useUpsertResources: CalendarStoreBinding['useUpsertResources'] =
    () => useBound((s) => s.upsertResources);

const useSetDayDataFor: CalendarStoreBinding['useSetDayDataFor'] =
    () => useBound((s) => s.setDayDataFor);

const useReplaceDayData: NonNullable<CalendarStoreBinding['useReplaceDayData']> =
    () => useBound((s) => s.replaceDayData);

const useSetDraggedEventDraft: CalendarStoreBinding['useSetDraggedEventDraft'] =
    () => useBound((s) => s.setDraggedEventDraft);

const useSetDate: CalendarStoreBinding['useSetDate'] =
    () => useBound((s) => s.setDate);

const useGetDate: CalendarStoreBinding['useGetDate'] =
    () => useBound((s) => s.date);
// Export the binding
export const zustandBinding: CalendarStoreBinding = {
    Provider,
    useResourceById,
    useEventsFor,
    useEventCountForCurrentDay,
    useEventCountSnapshot,
    useDisabledBlocksFor,
    useDisabledIntervalsFor,
    useDisabledIntervalsByDay,
    useUpsertResources,
    useSetDate,
    useGetDate,
    useSetDayDataFor,
    useReplaceDayData,
    useGetSelectedEvent,
    useSetSelectedEvent,
    useGetDraggedEventDraft,
    useSetDraggedEventDraft
};

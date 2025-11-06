// bindings/zustandBinding.tsx
import React, {createContext, useContext, useRef} from 'react';
import {createStore, type StoreApi} from 'zustand';
import {shallow} from 'zustand/shallow';
import type {CalendarStoreBinding, SetDayDataPayload} from './calendarStoreBinding';
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

type State = {
    date: Date;
    resourcesById: Record<ResourceId, Resource>;
    selectedEvent: Event | null;
    draggedEventDraft: DraggedEventDraft | null;

    // NEW: multi-day slices
    eventsByDay: ByDay<Event>;
    disabledBlocksByDay: ByDay<DisabledBlock>;
    disabledIntervalsByDay: ByDay<DisabledInterval>;

    // Actions
    upsertResources: (rs: Array<Pick<Resource, 'id' | 'name' | 'avatar'>>) => void;
    setDayDataFor: (dayKey: string, payload: SetDayDataPayload) => void;
    setSelectedEvent: (evt: Event | null) => void;
    setDraggedEventDraft: (draft: DraggedEventDraft | null) => void;
    setDate: (date: Date) => void;
};

const createCalendarStore = () =>
    createStore<State>((set) => ({
        date: new Date(),
        resourcesById: {},

        // NEW multi-day
        eventsByDay: {},
        disabledBlocksByDay: {},
        disabledIntervalsByDay: {},

        selectedEvent: null,
        draggedEventDraft: null,

        setSelectedEvent: (evt) => set({selectedEvent: evt}),
        setDate: (date) => set({date}),

        upsertResources: (rs) =>
            set((s) => {
                // keep refs for unchanged items
                const next = {...s.resourcesById};
                let changed = false;
                for (const r of rs) {
                    const prev = next[r.id];
                    // replace only when identity actually differs
                    if (!prev || prev.name !== r.name || prev.avatar !== r.avatar) {
                        next[r.id] = {id: r.id, name: r.name, avatar: r.avatar};
                        changed = true;
                    }
                }
                return changed ? {resourcesById: next} : {};
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

// Selectors (single-day, per-resource)
const useResourceById: CalendarStoreBinding['useResourceById'] =
    (id) => useBound((s) => s.resourcesById[id]);

const useGetSelectedEvent: CalendarStoreBinding['useGetSelectedEvent'] =
    () => useBound((s) => s.selectedEvent);

const useSetSelectedEvent: CalendarStoreBinding['useSetSelectedEvent'] =
    () => useBound((s) => s.setSelectedEvent);

const useEventsFor: CalendarStoreBinding['useEventsFor'] =
    (resourceId, dayDate) => useBound(s => {
        const key = format(dayDate, 'yyyy-MM-dd');
        return s.eventsByDay?.[key]?.[resourceId] ?? [];
    }, shallow);

const useGetDraggedEventDraft: CalendarStoreBinding['useGetDraggedEventDraft'] =
    () => useBound((s) => s.draggedEventDraft);

const useDisabledBlocksFor: CalendarStoreBinding['useDisabledBlocksFor'] =
    (resourceId, dayDate) => useBound(s => {
        const key = format(dayDate, 'yyyy-MM-dd');
        return s.disabledBlocksByDay?.[key]?.[resourceId] ?? [];
    }, shallow);

const useDisabledIntervalsFor: CalendarStoreBinding['useDisabledIntervalsFor'] =
    (resourceId, dayDate) => useBound(s => {
        const key = format(dayDate, 'yyyy-MM-dd');
        return s.disabledIntervalsByDay?.[key]?.[resourceId] ?? []
    }, shallow);

// Action hooks
const useUpsertResources: CalendarStoreBinding['useUpsertResources'] =
    () => useBound((s) => s.upsertResources);

const useSetDayDataFor: CalendarStoreBinding['useSetDayDataFor'] =
    () => useBound((s) => s.setDayDataFor);

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
    useDisabledBlocksFor,
    useDisabledIntervalsFor,
    useUpsertResources,
    useSetDate,
    useGetDate,
    useSetDayDataFor,
    useGetSelectedEvent,
    useSetSelectedEvent,
    useGetDraggedEventDraft,
    useSetDraggedEventDraft
};

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
} from '../../types/calendarTypes';
import {useStoreWithEqualityFn} from "zustand/traditional";

type ByResource<T> = Record<ResourceId, T[]>;

type State = {
    // Single-day slices
    resourcesById: Record<ResourceId, Resource>;
    eventsByResource: ByResource<Event>;
    disabledBlocksByResource: ByResource<DisabledBlock>;
    disabledIntervalsByResource: ByResource<DisabledInterval>;
    selectedEvent: Event | null;
    draggedEventDraft: DraggedEventDraft | null;

    // Actions
    upsertResources: (rs: Array<Pick<Resource, 'id' | 'name' | 'avatar'>>) => void;
    setDayData: (payload: SetDayDataPayload) => void;
    setSelectedEvent: (evt: Event | null) => void;
    clearDay: () => void;
    setDraggedEventDraft: (draft: DraggedEventDraft | null) => void;
};

const createCalendarStore = () =>
    createStore<State>((set) => ({
        resourcesById: {},
        eventsByResource: {},
        disabledBlocksByResource: {},
        disabledIntervalsByResource: {},
        selectedEvent: null,
        draggedEventDraft: null,

        setSelectedEvent: (evt) => set({selectedEvent: evt}),

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

        setDayData: ({events, disabledBlocks, disableIntervals}) =>
            set((s) => ({
                eventsByResource: events ?? s.eventsByResource,
                disabledBlocksByResource: disabledBlocks ?? s.disabledBlocksByResource,
                disabledIntervalsByResource: disableIntervals ?? s.disabledIntervalsByResource,
            })),

        setDraggedEventDraft: (draft) => set({draggedEventDraft: draft}),

        clearDay: () =>
            set({
                eventsByResource: {},
                disabledBlocksByResource: {},
                disabledIntervalsByResource: {},
            }),
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
    (resourceId) => useBound((s) => s.eventsByResource[resourceId] ?? [], shallow);

const useGetDraggedEventDraft: CalendarStoreBinding['useGetDraggedEventDraft'] =
    () => useBound((s) => s.draggedEventDraft);

const useDisabledBlocksFor: CalendarStoreBinding['useDisabledBlocksFor'] =
    (resourceId) => useBound((s) => s.disabledBlocksByResource[resourceId] ?? [], shallow);

const useDisabledIntervalsFor: CalendarStoreBinding['useDisabledIntervalsFor'] =
    (resourceId) => useBound((s) => s.disabledIntervalsByResource[resourceId] ?? [], shallow);

// Action hooks
const useUpsertResources: CalendarStoreBinding['useUpsertResources'] =
    () => useBound((s) => s.upsertResources);

const useSetDayData: CalendarStoreBinding['useSetDayData'] =
    () => useBound((s) => s.setDayData);

const useSetDraggedEventDraft: CalendarStoreBinding['useSetDraggedEventDraft'] =
    () => useBound((s) => s.setDraggedEventDraft);

// Export the binding
export const zustandBinding: CalendarStoreBinding = {
    Provider,
    useResourceById,
    useEventsFor,
    useDisabledBlocksFor,
    useDisabledIntervalsFor,
    useUpsertResources,
    useSetDayData,
    useGetSelectedEvent,
    useSetSelectedEvent,
    useGetDraggedEventDraft,
    useSetDraggedEventDraft
};

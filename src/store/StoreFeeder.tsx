// StoreFeeder.tsx
import React, {useEffect} from 'react';
import type {CalendarStoreBinding} from './bindings/calendarStoreBinding';
import {DisabledBlock, DisabledInterval, Event, Resource, ResourceId,} from '../types/calendarTypes';

type Props = {
    store: CalendarStoreBinding;
    resources: Array<
        Resource & {
        events?: Event[];
        disabledBlocks?: DisabledBlock[];
        disableIntervals?: DisabledInterval[];
    }>;
};

export const StoreFeeder: React.FC<Props> = ({store, resources}) => {
    const upsertResources = store.useUpsertResources();
    const setDayData = store.useSetDayData();

    useEffect(() => {
        // 1) Directory of resources (id/name/avatar only)
        upsertResources(resources.map(r => ({id: r.id, name: r.name, avatar: r.avatar})));

        // 2) Build single-day per-resource maps
        const eventsByResource: Record<ResourceId, Event[]> = {};
        const blocksByResource: Record<ResourceId, DisabledBlock[]> = {};
        const intervalsByResource: Record<ResourceId, DisabledInterval[]> = {};

        for (const r of resources) {
            if (r.events?.length) eventsByResource[r.id] = r.events;
            if (r.disabledBlocks?.length) blocksByResource[r.id] = r.disabledBlocks;
            if (r.disableIntervals?.length) intervalsByResource[r.id] = r.disableIntervals;
        }

        setDayData({
            events: eventsByResource,
            disabledBlocks: blocksByResource,
            disableIntervals: intervalsByResource,
        });
    }, [resources, upsertResources, setDayData]);

    return null;
};

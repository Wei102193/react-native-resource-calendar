import React, {useEffect, useMemo} from 'react';
import type {CalendarStoreBinding} from './bindings/calendarStoreBinding';
import {DisabledBlock, DisabledInterval, Event, Resource,} from '@/types/calendarTypes';
import {format} from "date-fns";

type Props = {
    store: CalendarStoreBinding;
    resources: Array<
        Resource & {
        events?: Event[];
        disabledBlocks?: DisabledBlock[];
        disableIntervals?: DisabledInterval[];
    }>;
    baseDate: Date; // the "single-day" fallback date
};

export const StoreFeeder: React.FC<Props> = ({store, resources, baseDate}) => {
    const upsertResources = store.useUpsertResources();
    const setDayDataFor = store.useSetDayDataFor();
    const setDate = store.useSetDate();
    const baseDateKey = useMemo(() => format(baseDate, 'yyyy-MM-dd')!, [baseDate]);

    useEffect(() => {
        setDate(baseDate);
        // 1) Directory of resources (id/name/avatar only)
        upsertResources(resources.map(r => ({id: r.id, name: r.name, avatar: r.avatar})));

        // 2) Build single-day per-resource maps
        const dayBuckets = new Map<
            string,
            {
                events: Record<number, Event[]>;
                disabledBlocks: Record<number, DisabledBlock[]>;
                disableIntervals: Record<number, DisabledInterval[]>;
            }
        >();

        for (const r of resources) {
            const push = <T extends Event | DisabledBlock | DisabledInterval>(
                items: T[] | undefined,
                field: "events" | "disabledBlocks" | "disableIntervals"
            ) => {
                if (!items?.length) return;
                for (const it of items) {
                    const key = it.date ?? baseDateKey;
                    const bucket =
                        dayBuckets.get(key) ??
                        dayBuckets.set(key, {events: {}, disabledBlocks: {}, disableIntervals: {}}).get(key)!;

                    const m = bucket[field] as Record<number, T[]>;
                    (m[r.id] ||= []).push(it);
                }
            };

            push(r.events, "events");
            push(r.disabledBlocks, "disabledBlocks");
            push(r.disableIntervals, "disableIntervals");
        }

        for (const [dayKey, payload] of dayBuckets) {
            setDayDataFor(dayKey, payload);
        }
    }, [resources, upsertResources, setDayDataFor, baseDateKey]);

    return null;
};

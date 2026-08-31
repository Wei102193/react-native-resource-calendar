import React, {useDeferredValue, useEffect, useMemo, useRef, useState} from "react";
import {SharedValue} from "react-native-reanimated";
import {useCalendarBinding} from "@/store/bindings/BindingProvider";
import {Event, LayoutMode} from "@/types/calendarTypes";
import {EventFonts, EventRenderer} from "./EventBlock";
import {computeEventFrames} from "@/utilities/helpers";
import {useResolvedFont} from "@/theme/ThemeContext";

type FlagFn = (event: Event) => boolean;

interface EventBlocksProps {
    id: number;
    EVENT_BLOCK_WIDTH: number;
    hourHeight: number;
    onLongPress: (evt: Event) => void;
    onPress: (evt: Event) => void;
    eventRenderer: EventRenderer;
    isEventSelected?: FlagFn;
    isEventDisabled?: FlagFn;
    mode: LayoutMode;
    date?: Date;
    /** Placement of this column, used to prioritise a day change. Optional. */
    columnIndex?: number;
    numberOfColumns?: number;
    scrollX?: SharedValue<number>;
}

const TIER2_DELAY_MS = 48;

/**
 * The value now (tier 0), one deferred render later (tier 1), or a couple of frames
 * later (tier 2). A column's tier changes as the list scrolls; while it is not tier 2
 * the late slot simply tracks the value.
 */
const useTieredValue = <T, >(value: T, tier: 0 | 1 | 2): T => {
    const deferred = useDeferredValue(value);
    const lateRef = useRef(value);
    const [, bump] = useState(0);

    if (tier !== 2) lateRef.current = value;

    useEffect(() => {
        if (tier !== 2 || lateRef.current === value) return;
        const t = setTimeout(() => {
            lateRef.current = value;
            bump(n => n + 1);
        }, TIER2_DELAY_MS);
        return () => clearTimeout(t);
    }, [value, tier]);

    return tier === 0 ? value : tier === 1 ? deferred : lateRef.current;
};

const EventBlocks: React.FC<EventBlocksProps> = React.memo(({
                                                                id,
                                                                onLongPress,
                                                                onPress,
                                                                hourHeight,
                                                                EVENT_BLOCK_WIDTH,
                                                                eventRenderer,
                                                                isEventDisabled, isEventSelected,
                                                                mode,
                                                                date: dateProp,
                                                                columnIndex,
                                                                numberOfColumns,
                                                                scrollX
                                                            }) => {

    const {useEventsFor, useGetDate, useGetSelectedEvent} =
        useCalendarBinding();
    const date = useGetDate();
    const selectedEvent = useGetSelectedEvent();
    const liveEvents = useEventsFor(id, dateProp ?? date);

    const columnTitleFace = useResolvedFont({fontWeight: '700'});
    const columnTimeFace = useResolvedFont({fontWeight: '600'});

    // A day change replaces the events of every mounted column at once, but only the
    // columns inside the viewport are visible; the buffered ones (FlashList
    // drawDistance) can take theirs in a follow-up, lower-priority render. On a
    // 9-column landscape terminal a day change re-rendered ~63 cards in one ~600 ms
    // block; splitting it centre-out makes the screen start updating within the first
    // chunk. Columns with no placement info (custom hosts) are never deferred.
    //
    // Tier 0: the centre columns of the viewport, committed at once.
    // Tier 1: the remaining visible columns, one deferred render later.
    // Tier 2: FlashList's offscreen buffer, a couple of frames later — an offscreen
    //         column keeps the previous day's cards for those frames, which nobody sees.
    let tier: 0 | 1 | 2 = 0;
    if (scrollX && columnIndex != null && numberOfColumns != null && EVENT_BLOCK_WIDTH > 0) {
        const first = Math.floor((scrollX.value || 0) / EVENT_BLOCK_WIDTH + 1e-3);
        if (columnIndex < first || columnIndex >= first + numberOfColumns) {
            tier = 2;
        } else if (numberOfColumns > 3) {
            const centre = first + (numberOfColumns - 1) / 2;
            tier = Math.abs(columnIndex - centre) <= 1 ? 0 : 1;
        }
    }
    const events = useTieredValue(liveEvents, tier);

    const fonts = useMemo<EventFonts>(
        () => ({titleFace: columnTitleFace, timeFace: columnTimeFace}),
        [columnTitleFace, columnTimeFace]
    );

    const anyEventSelected = !!selectedEvent;
    const frameMap = useMemo(
        () => computeEventFrames(events, EVENT_BLOCK_WIDTH, mode),
        [events, mode, EVENT_BLOCK_WIDTH]
    );

    const Renderer = eventRenderer;

    return (events?.map((evt: Event, index: number) => {
                const selected = isEventSelected?.(evt) ?? false;
                const disabled = isEventDisabled?.(evt) ?? false;

                return <Renderer
                    // Slot index, not event identity: a cell reassigned to another column
                    // (and a day change) then UPDATES the existing EventBlock instances and
                    // their native views in place, instead of unmounting and creating ~12
                    // native nodes per card; only the count delta mounts. Events arrive
                    // sorted by start, so slot i changes little between neighbouring columns.
                    key={index}
                    event={evt}
                    onLongPress={onLongPress}
                    onPress={onPress}
                    hourHeight={hourHeight}
                    frame={frameMap.get(evt.id)!}
                    selected={selected}
                    disabled={disabled}
                    anyEventSelected={anyEventSelected}
                    fonts={fonts}
                />
            }
        )
    );
});

export default EventBlocks;

import React, {useEffect, useState} from "react";
import {Platform, StyleSheet, View} from "react-native";
import {SharedValue} from "react-native-reanimated";
import {DisabledBlock, Event, LayoutMode, ResourceId} from "@/types/calendarTypes";
import {EventGridBlocks} from "./EventGridBlocks";
import DisabledIntervals from "./DisabledIntervals";
import DisabledBlocks from "./DisabledBlocks";
import EventBlocks from "./EventBlocks";
import {EventRenderer} from "./EventBlock";
import {COLUMN_SEPARATOR_COLOR, GRID_ROWS} from "./gridConstants";
import type {ColumnScrollState} from "./columnScrollState";

type FlagFn = (event: Event) => boolean;

type Props = {
    rid: ResourceId;
    dayDate?: Date;
    dateRef: React.RefObject<Date>;
    hourHeight: number;
    APPOINTMENT_BLOCK_WIDTH: number;
    onBlockPress: (resourceId: ResourceId, isoDateTime: string) => void;
    onBlockLongPress: (resourceId: ResourceId, isoDateTime: string) => void;
    onDisabledBlockPress: (block: DisabledBlock) => void;
    tapThrough?: boolean;
    onPress: (evt: Event) => void;
    onLongPress: (evt: Event) => void;
    isEventSelected?: FlagFn;
    isEventDisabled?: FlagFn;
    eventRenderer: EventRenderer;
    mode: LayoutMode;
    scrollState: ColumnScrollState;
    columnIndex: number;
    numberOfColumns: number;
    scrollX: SharedValue<number>;
};

/**
 * One FlashList cell = one column. Cells are recycled, so `rid` / `dayDate` change on
 * the same instance.
 *
 * Cards are the expensive part of a column. While the list is in a momentum fling
 * (Android; on iOS the scroll handler never reports one) a cell that gets (re)assigned
 * renders only its frame — grid gesture layer, hatched intervals, disabled blocks —
 * and its cards mount when the fling settles, one column per animation frame,
 * centre-out. Cells assigned while the list is at rest (calendar entry, filter /
 * location / day change, a one-column swipe onto the pre-rendered neighbour) render
 * their cards immediately, so none of those flash.
 */
const ColumnCell: React.FC<Props> = React.memo(({
                                                    rid,
                                                    dayDate,
                                                    dateRef,
                                                    hourHeight,
                                                    APPOINTMENT_BLOCK_WIDTH,
                                                    onBlockPress,
                                                    onBlockLongPress,
                                                    onDisabledBlockPress,
                                                    tapThrough,
                                                    onPress,
                                                    onLongPress,
                                                    isEventSelected,
                                                    isEventDisabled,
                                                    eventRenderer,
                                                    mode,
                                                    scrollState,
                                                    columnIndex,
                                                    numberOfColumns,
                                                    scrollX
                                                }) => {
    const latchKey = rid + '|' + (dayDate ? dayDate.getTime() : 0);

    // The key and the flag live in ONE state value so a render React throws away
    // cannot advance the key while leaving the flag behind (a ref written during
    // render could).
    const [cards, setCards] = useState(() => ({key: latchKey, show: scrollState.settled}));

    if (cards.key !== latchKey) {
        // Recycled to another column: start over from the current scroll state.
        // Setting own state during render is React's getDerivedStateFromProps
        // pattern; React re-runs this render immediately.
        setCards({key: latchKey, show: scrollState.settled});
    }

    const showCards = cards.key === latchKey && cards.show;

    useEffect(() => {
        if (showCards) return;

        const reveal = () => {
            setCards(c => (c.key === latchKey && !c.show ? {key: latchKey, show: true} : c));
        };

        if (scrollState.settled) {
            reveal();
            return;
        }

        // On settle the n-th nearest-to-centre waiting column reveals n frames later.
        let frame: number | null = null;
        const unsubscribe = scrollState.subscribe((position) => {
            if (frame !== null || !scrollState.settled) return;
            let remaining = position;
            const tick = () => {
                if (remaining-- <= 0) {
                    frame = null;
                    reveal();
                    return;
                }
                frame = requestAnimationFrame(tick);
            };
            frame = requestAnimationFrame(tick);
        }, columnIndex);

        return () => {
            unsubscribe();
            if (frame !== null) cancelAnimationFrame(frame);
        };
    }, [showCards, latchKey, scrollState, columnIndex]);

    // Explicit cell height (= the 24 h the grid child would produce anyway).
    // FlashList sizes a horizontal list from the tallest MEASURED cell and pins every
    // cell to it (LinearLayoutManager.normalizeLayoutHeights); with the height derived
    // through a height:'100%' indirection, one bad measurement during a busy frame
    // pinned all columns to half height once. A fixed height makes it deterministic.
    return (
        <View style={{width: APPOINTMENT_BLOCK_WIDTH, height: (hourHeight / 4) * GRID_ROWS}}>
            <View style={styles.timelineContainer}>
                <EventGridBlocks
                    rid={rid}
                    dayDate={dayDate}
                    dateRef={dateRef}
                    hourHeight={hourHeight}
                    APPOINTMENT_BLOCK_WIDTH={APPOINTMENT_BLOCK_WIDTH}
                    onBlockPress={onBlockPress}
                    onBlockLongPress={onBlockLongPress}
                />
                <DisabledIntervals
                    id={rid}
                    date={dayDate}
                    APPOINTMENT_BLOCK_WIDTH={APPOINTMENT_BLOCK_WIDTH}
                    hourHeight={hourHeight}
                    columnIndex={columnIndex}
                />
                <DisabledBlocks
                    id={rid}
                    date={dayDate}
                    APPOINTMENT_BLOCK_WIDTH={APPOINTMENT_BLOCK_WIDTH}
                    hourHeight={hourHeight}
                    onDisabledBlockPress={onDisabledBlockPress}
                    tapThrough={tapThrough}
                />
                {showCards && <EventBlocks
                    id={rid}
                    date={dayDate}
                    EVENT_BLOCK_WIDTH={APPOINTMENT_BLOCK_WIDTH}
                    hourHeight={hourHeight}
                    onPress={onPress}
                    onLongPress={onLongPress}
                    isEventSelected={isEventSelected}
                    isEventDisabled={isEventDisabled}
                    eventRenderer={eventRenderer}
                    mode={mode}
                    columnIndex={columnIndex}
                    numberOfColumns={numberOfColumns}
                    scrollX={scrollX}
                />}
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    timelineContainer: {
        // Android: the right border is drawn once by ColumnSeparators, not per cell.
        // iOS: per-cell border as before, in the colour the old border reached the
        // screen with once the grid canvas had composited over it.
        ...(Platform.OS === 'android' ? null : {
            borderColor: COLUMN_SEPARATOR_COLOR,
            borderRightWidth: 1,
        }),
        position: 'relative',
        height: "100%",
    }
});

export default ColumnCell;

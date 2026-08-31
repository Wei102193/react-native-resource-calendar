import * as React from 'react';
import {useMemo} from 'react';
import {Platform, View} from 'react-native';
import Animated, {SharedValue, useAnimatedStyle, useSharedValue} from 'react-native-reanimated';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import {scheduleOnRN} from 'react-native-worklets';
import {ResourceId} from '../types/calendarTypes';
import {combineDateAndTime, TIME_LABEL_WIDTH} from '../utilities/helpers';
import {COLUMN_SEPARATOR_COLOR, GRID_FILL, GRID_LINE, GRID_PRESSED_FILL, GRID_ROWS} from './gridConstants';

type Props = {
    /** Resource this column belongs to. */
    rid: ResourceId;
    /** Day this column represents (multi-day modes); falls back to `dateRef`. */
    dayDate?: Date;
    /** Latest base date, kept in a ref so it never invalidates this component. */
    dateRef: React.RefObject<Date>;
    onBlockPress: (resourceId: ResourceId, isoDateTime: string) => void;
    onBlockLongPress: (resourceId: ResourceId, isoDateTime: string) => void;
    APPOINTMENT_BLOCK_WIDTH: number;
    hourHeight: number;
};

/**
 * The grid behind every column: 96 quarter-hour rows spanning the visible timeline
 * width, mounted once for the whole calendar.
 *
 * It used to be a Skia `<Canvas>` per column. Each canvas is a TextureView with its
 * own GPU surface painted asynchronously on the Skia thread, so on a low-end Android
 * device the columns showed up white and filled in one by one on mount, on FlashList
 * recycling and on every day change.
 *
 * The rows are horizontal, so this layer does not need to follow the horizontal
 * column scroll at all.
 */
export const GridBackdrop = React.memo(({width, hourHeight}: { width: number; hourHeight: number }) => {
    const rowHeight = hourHeight / 4;

    const rowStyle = useMemo(() => ({
        height: rowHeight,
        backgroundColor: GRID_FILL,
        borderBottomWidth: 1,
        borderBottomColor: GRID_LINE,
    }), [rowHeight]);

    const rows = useMemo(
        () => Array.from({length: GRID_ROWS}, (_, i) => <View key={i} style={rowStyle}/>),
        [rowStyle]
    );

    return (
        <View
            pointerEvents="none"
            style={{
                position: 'absolute',
                top: 0,
                left: TIME_LABEL_WIDTH,
                width,
                height: rowHeight * GRID_ROWS,
            }}
        >
            {rows}
        </View>
    );
});

type ColumnSeparatorsProps = {
    columnWidth: number;
    /** Columns that fit on screen. */
    numberOfColumns: number;
    /** Columns that exist. */
    columnCount: number;
    hourHeight: number;
    scrollX: SharedValue<number>;
};

/**
 * Column separators used to be a `borderRight` on every column cell, so on a fast
 * fling they only appeared once the JS thread had rendered the incoming cell.
 *
 * Every column has the same width, so the lines are periodic: draw
 * `numberOfColumns + 2` of them once and slide the layer by `scrollX mod width` on
 * the UI thread. Constant view count for any number of resources, and never behind
 * the scroll. Mounted below the FlashList so hatched intervals paint over the line
 * exactly as the old border did. Not RTL-aware.
 *
 * Android only. On iOS the cell keeps its own `borderRight`: iOS mounts a column
 * within the frame anyway, and a layer driven by the `scrollX` shared value was seen
 * sitting 4 pt off the real cell edge on an iPad after a programmatic scroll (stale
 * `scrollX`), which read as hatching that overshot the grid line. A border on the
 * cell cannot drift from the cell.
 */
export const ColumnSeparators = React.memo(({
                                                columnWidth,
                                                numberOfColumns,
                                                columnCount,
                                                hourHeight,
                                                scrollX
                                            }: ColumnSeparatorsProps) => {
    const height = (hourHeight / 4) * GRID_ROWS;

    // Fewer columns than fit on screen: the list cannot scroll, so draw exactly one
    // line per column and nothing past the last one. Otherwise the periodic layer
    // needs two spare lines to cover the phase shift.
    const count = columnCount < numberOfColumns ? columnCount : numberOfColumns + 2;

    const animatedStyle = useAnimatedStyle(() => {
        'worklet';
        // The double modulo keeps the phase in [0, W) for negative offsets too, so the
        // lines follow an overscroll bounce instead of freezing at the edge.
        const x = scrollX.value || 0;
        const phase = ((x % columnWidth) + columnWidth) % columnWidth;
        return {transform: [{translateX: -phase}]};
    }, [columnWidth]);

    const lines = useMemo(
        () => Array.from({length: count}, (_, i) => (
            <View
                key={i}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: (i + 1) * columnWidth - 1,
                    width: 1,
                    height,
                    backgroundColor: COLUMN_SEPARATOR_COLOR,
                }}
            />
        )),
        [count, columnWidth, height]
    );

    if (Platform.OS !== 'android') return null;

    return (
        <Animated.View
            pointerEvents="none"
            style={[{
                position: 'absolute',
                top: 0,
                left: TIME_LABEL_WIDTH,
                width: count * columnWidth,
                height,
            }, animatedStyle]}
        >
            {lines}
        </Animated.View>
    );
});

/**
 * The per-column touch target for the 96 quarter-hour slots. It draws nothing but
 * the pressed-slot highlight — the grey rows and rules come from `GridBackdrop`.
 */
export const EventGridBlocks: React.FC<Props> = React.memo(({
                                                                rid,
                                                                dayDate,
                                                                dateRef,
                                                                onBlockPress,
                                                                onBlockLongPress,
                                                                hourHeight,
                                                                APPOINTMENT_BLOCK_WIDTH
                                                            }) => {
    // Cells are recycled: `rid` / `dayDate` change while this instance stays. Read
    // them through a ref so the slot handlers — and with them the gesture objects
    // below — keep their identity across a recycle; otherwise every recycle rebuilt
    // two RNGH gestures and re-attached the native handlers.
    const targetRef = React.useRef({rid, dayDate});
    targetRef.current.rid = rid;
    targetRef.current.dayDate = dayDate;

    const handleBlockPress = React.useCallback(
        (time: string) => onBlockPress(
            targetRef.current.rid,
            combineDateAndTime(targetRef.current.dayDate ?? dateRef.current, time)
        ),
        [onBlockPress, dateRef]
    );
    const handleBlockLongPress = React.useCallback(
        (time: string) => onBlockLongPress(
            targetRef.current.rid,
            combineDateAndTime(targetRef.current.dayDate ?? dateRef.current, time)
        ),
        [onBlockLongPress, dateRef]
    );

    const rowHeight = hourHeight / 4;

    // The pressed-row highlight lives on the UI thread. It used to be React state
    // set from the gesture's `onBegin`, which fires on every touch-down — including
    // the one that starts a scroll, so two commits (insert, then remove the
    // highlight view) landed exactly on the frame the list is expected to start
    // moving. Now one permanently mounted view is positioned and shown by a shared
    // value written inside the gesture worklets; no JS-thread work until the tap
    // actually completes.
    const pressedRow = useSharedValue(-1);
    const highlightStyle = useAnimatedStyle(() => ({
        opacity: pressedRow.value < 0 ? 0 : 1,
        transform: [{translateY: Math.max(0, pressedRow.value) * rowHeight}],
    }), [rowHeight]);

    // 96 quarter-hour labels, computed once
    const timeLabels = useMemo<string[]>(() => {
        const out: string[] = [];
        for (let h = 0; h < 24; h++) {
            for (let q = 0; q < 4; q++) {
                const m = q * 15;
                const hh = String(h).padStart(2, '0');
                const mm = String(m).padStart(2, '0');
                out.push(`${hh}:${mm}:00`);
            }
        }
        return out;
    }, []);

    const onSlotPress = React.useCallback(
        (row: number) => {
            const slot = timeLabels[row];
            if (slot) {
                handleBlockPress(slot);
            }
        },
        [handleBlockPress, timeLabels]
    );

    const onSlotLongPress = React.useCallback(
        (row: number) => {
            const slot = timeLabels[row];
            if (slot) {
                handleBlockLongPress(slot)
            }
        },
        [timeLabels, handleBlockLongPress]
    );

    const composedGesture = useMemo(() => {
        const longPressGesture = Gesture.LongPress()
            .minDuration(350)
            .onBegin((e) => {
                'worklet';
                pressedRow.value = Math.floor(e.y / rowHeight);
            })
            .onStart((e) => {
                'worklet';
                pressedRow.value = -1;
                scheduleOnRN(onSlotLongPress, Math.floor(e.y / rowHeight));
            })
            .onTouchesUp(() => {
                'worklet';
                pressedRow.value = -1;
            })
            .onTouchesCancelled(() => {
                'worklet';
                pressedRow.value = -1;
            })
            .onFinalize(() => {
                'worklet';
                pressedRow.value = -1;
            });

        const tapGesture = Gesture.Tap()
            .onBegin((e) => {
                'worklet';
                pressedRow.value = Math.floor(e.y / rowHeight);
            })
            .onEnd((e) => {
                'worklet';
                pressedRow.value = -1;
                scheduleOnRN(onSlotPress, Math.floor(e.y / rowHeight));
            })
            .onTouchesUp(() => {
                'worklet';
                pressedRow.value = -1;
            })
            .onTouchesCancelled(() => {
                'worklet';
                pressedRow.value = -1;
            })
            .onFinalize(() => {
                'worklet';
                pressedRow.value = -1;
            });

        // Whichever activates first (tap vs long press) wins
        return Gesture.Race(longPressGesture, tapGesture);
    }, [rowHeight, pressedRow, onSlotPress, onSlotLongPress]);

    return (
        <GestureDetector gesture={composedGesture}>
            {/* Transparent hit area only. */}
            <View style={{width: APPOINTMENT_BLOCK_WIDTH, height: rowHeight * GRID_ROWS}}>
                <Animated.View
                    pointerEvents="none"
                    style={[{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: 0,
                        height: rowHeight - 1,
                        backgroundColor: GRID_PRESSED_FILL,
                    }, highlightStyle]}
                />
            </View>
        </GestureDetector>
    );
});

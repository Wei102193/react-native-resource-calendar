import React, {createContext, useContext, useMemo, useRef} from "react";
import {Image, PixelRatio, Platform, StyleSheet, View} from "react-native";
import Animated, {SharedValue, useAnimatedStyle} from "react-native-reanimated";
import {Defs, Line, Pattern, Rect, Svg} from "react-native-svg";
import {format} from "date-fns";
import {useCalendarBinding} from "@/store/bindings/BindingProvider";
import type {
    DisabledIntervalsByDay,
    DisabledIntervalsByResource
} from "@/store/bindings/calendarStoreBinding";
import {scalePosition, TIME_LABEL_WIDTH} from "@/utilities/helpers";
import {
    getHatchTile,
    HATCH_BACKGROUND_COLOR,
    HATCH_STROKE_DP,
    HATCH_SVG_STROKE,
    HATCH_TILE_DP
} from "@/utilities/hatchTile";
import {CalendarColumn, DisabledInterval as DisabledIntervalType, ResourceId} from "@/types/calendarTypes";
import {COLUMN_SEPARATOR_COLOR, GRID_FILL, GRID_LINE, GRID_ROWS} from "./gridConstants";

interface DisabledIntervalsProp {
    id: number;
    APPOINTMENT_BLOCK_WIDTH: number;
    hourHeight: number;
    date?: Date;
    /** Index of this column, so the hatch can be phase-aligned to the timeline. */
    columnIndex?: number;
}

interface DisabledIntervalsProps {
    width: number;
    top: number;
    height: number;
    /** Distance from the timeline origin to this column's left edge. */
    xOffset: number;
}

type Span = { from: number; to: number };

/**
 * One hatched span.
 *
 * The hatch is phase-aligned to the timeline origin, not to each interval's own
 * corner: the pattern is shifted back by (column left, interval top) mod the tile
 * size, so neighbouring columns and stacked intervals continue the same diagonals
 * instead of restarting them at every column separator and interval edge. The
 * upstream per-`<Svg>` pattern restarted at each interval, which read as misaligned
 * hatching wherever the column width was not a multiple of the 10 dp tile.
 *
 * Android phases are computed in device pixels, not dp: the tile is
 * `round(10 * pixelRatio)` px, which on a 2.625x / 2.75x device is not exactly 10 dp,
 * and Yoga rounds the interval's own position to whole pixels the same way, so only a
 * pixel-domain modulo lines the tiles up on every device.
 */
const DisabledInterval: React.FC<DisabledIntervalsProps> = React.memo(({width, top, height, xOffset}) => {
    if (Platform.OS !== 'android') {
        const tile = HATCH_TILE_DP;
        const xPhase = ((xOffset % tile) + tile) % tile;
        const yPhase = ((top % tile) + tile) % tile;

        return <View pointerEvents="none" style={[styles.disabledBlock, {width, top, height}]}>
            <Svg width={width} height="100%">
                <Defs>
                    <Pattern id="diagonalHatch" patternUnits="userSpaceOnUse" x={-xPhase} y={-yPhase}
                             width={tile} height={tile}>
                        <Line x1="0" y1="0" x2={tile} y2={tile} stroke={HATCH_SVG_STROKE}
                              strokeWidth={HATCH_STROKE_DP}/>
                    </Pattern>
                </Defs>
                <Rect width={width} height="100%" fill={HATCH_BACKGROUND_COLOR}/>
                <Rect width={width} height="100%" fill="url(#diagonalHatch)"/>
            </Svg>
        </View>;
    }

    const source = getHatchTile();
    const pr = PixelRatio.get();
    const tilePx = source.width;
    const tileDp = tilePx / pr;
    const xPhase = ((Math.round(xOffset * pr) % tilePx) + tilePx) % tilePx / pr;
    const yPhase = ((Math.round(top * pr) % tilePx) + tilePx) % tilePx / pr;

    return <View
        pointerEvents="none"
        style={[styles.disabledBlock, {width, top, height, backgroundColor: HATCH_BACKGROUND_COLOR, overflow: "hidden"}]}
    >
        <Image
            source={source}
            resizeMode="repeat"
            fadeDuration={0}
            style={{
                position: "absolute",
                left: -xPhase,
                top: -yPhase,
                width: width + tileDp,
                height: height + tileDp,
            }}
        />
    </View>;
});

export type HatchCommon = { sig: string; intervals: Span[] };

/**
 * The interval set shared by most columns, published by `Calendar` and consumed by
 * every `DisabledIntervals` so a cell can draw only its difference from it.
 */
export const HatchCommonContext = createContext<HatchCommon | null>(null);

const hatchSignatureOf = (list?: ReadonlyArray<Span>): string => {
    if (!list || list.length === 0) return '';
    let sig = '';
    for (let i = 0; i < list.length; i++) sig += (i ? ',' : '') + list[i].from + '-' + list[i].to;
    return sig;
};

/** `a` minus the union of `b`; both sorted by `from` and non-overlapping. */
const subtractIntervals = (a: ReadonlyArray<Span>, b: ReadonlyArray<Span>): Span[] => {
    const out: Span[] = [];
    for (const x of a) {
        let from = x.from;
        const to = x.to;
        for (const y of b) {
            if (y.to <= from || y.from >= to) continue;
            if (y.from > from) out.push({from, to: y.from});
            from = Math.max(from, y.to);
            if (from >= to) break;
        }
        if (from < to) out.push({from, to});
    }
    return out;
};

/**
 * Chooses the interval set shared by the most columns. Below half the columns the
 * shared layer is not worth the covers it forces on the others, so it is dropped and
 * every cell hatches itself as before.
 */
export const useHatchCommon = (
    byDay: DisabledIntervalsByDay | DisabledIntervalsByResource | null | undefined,
    columns: ReadonlyArray<CalendarColumn>,
    activeResourceId: ResourceId
): HatchCommon | null => {
    const prevRef = useRef<HatchCommon | null>(null);

    return useMemo(() => {
        if (!byDay || !columns || columns.length === 0) return null;

        const counts = new Map<string, { n: number; list: ReadonlyArray<Span> }>();
        let best: { n: number; sig: string; list: ReadonlyArray<Span> } | null = null;

        for (const col of columns) {
            const list = col.kind === 'day'
                ? (byDay as DisabledIntervalsByDay)[format(col.dayDate, 'yyyy-MM-dd')]?.[activeResourceId]
                : (byDay as DisabledIntervalsByResource)[col.resourceId];

            const sig = hatchSignatureOf(list);
            const entry = counts.get(sig);
            const n = entry ? entry.n + 1 : 1;
            counts.set(sig, {n, list: list ?? []});
            if (!best || n > best.n) best = {n, sig, list: list ?? []};
        }

        if (!best || best.n * 2 < columns.length) return null;

        // Keep the identity stable while the winning set is unchanged, so the layer
        // and every cell's diff stay memoised across unrelated store notifications.
        const prev = prevRef.current;
        if (prev && prev.sig === best.sig) return prev;

        const next: HatchCommon = {sig: best.sig, intervals: best.list.map(i => ({from: i.from, to: i.to}))};
        prevRef.current = next;
        return next;
    }, [byDay, columns, activeResourceId]);
};

type HatchLayerProps = {
    width: number;
    hourHeight: number;
    scrollX: SharedValue<number>;
    common: HatchCommon | null;
};

/**
 * The hatch most columns have in common, drawn ONCE for the whole viewport instead of
 * inside every FlashList cell.
 *
 * Most resources share one set of disabled intervals (the store's business hours, or
 * the same weekly shift), and mounting that hatch per cell meant a fling painted it
 * column by column as cells arrived. The pattern is periodic (10 dp tile), so a
 * viewport-wide layer slid by `scrollX mod tile` on the UI thread is indistinguishable
 * from one that scrolls with the content, and its bitmap stays viewport-sized —
 * Fresco's repeat post-processor allocates the view's whole area, so a full-day layer
 * over 76 columns would have been hundreds of MB.
 *
 * Columns whose intervals differ draw only the difference: extra hatch for their own
 * intervals, plus a `HatchCover` repainting the grid where they are actually working.
 */
export const HatchLayer = React.memo(({width, hourHeight, scrollX, common}: HatchLayerProps) => {
    const isAndroid = Platform.OS === 'android';
    const pr = PixelRatio.get();
    // iOS keeps the whole thing in dp (SVG Pattern); Android snaps the phase to whole
    // device pixels so the tiled bitmap lands on the pixel grid Yoga rounds columns to.
    const tileDp = isAndroid ? getHatchTile().width / pr : HATCH_TILE_DP;
    const height = (hourHeight / 4) * GRID_ROWS;

    const animatedStyle = useAnimatedStyle(() => {
        'worklet';
        const x = scrollX.value || 0;
        if (!isAndroid) {
            const phase = ((x % tileDp) + tileDp) % tileDp;
            return {transform: [{translateX: -phase}]};
        }
        const tilePx = tileDp * pr;
        const phasePx = ((Math.round(x * pr) % tilePx) + tilePx) % tilePx;
        return {transform: [{translateX: -phasePx / pr}]};
    }, [pr, tileDp, isAndroid]);

    if (!common || common.intervals.length === 0 || width <= 0) return null;

    return (
        <View
            pointerEvents="none"
            style={{position: "absolute", top: 0, left: TIME_LABEL_WIDTH, width, height, overflow: "hidden"}}
        >
            <Animated.View style={[{position: "absolute", top: 0, left: 0, width: width + tileDp, height}, animatedStyle]}>
                {common.intervals.map(iv => (
                    <DisabledInterval
                        key={iv.from + '-' + iv.to}
                        width={width + tileDp}
                        top={scalePosition(iv.from, hourHeight)}
                        height={scalePosition(iv.to - iv.from, hourHeight)}
                        xOffset={0}
                    />
                ))}
            </Animated.View>
        </View>
    );
});

type HatchCoverProps = { width: number; from: number; to: number; hourHeight: number };

/**
 * Repaints the grid backdrop (rows, quarter-hour rules, column separator) over the
 * shared hatch for a working range of a column whose hours differ from the common
 * set. Pixel-for-pixel the same as `GridBackdrop` + `ColumnSeparators` underneath.
 */
const HatchCover: React.FC<HatchCoverProps> = React.memo(({width, from, to, hourHeight}) => {
    const rowHeight = hourHeight / 4;
    const top = scalePosition(from, hourHeight);
    const height = scalePosition(to - from, hourHeight);

    const lines: React.ReactNode[] = [];
    const firstRow = Math.floor(from / 15);
    const lastRow = Math.ceil(to / 15);
    for (let r = firstRow; r < lastRow; r++) {
        const y = (r + 1) * rowHeight - 1 - top;
        if (y < 0 || y >= height) continue;
        lines.push(<View key={r} style={{position: "absolute", left: 0, right: 0, top: y, height: 1, backgroundColor: GRID_LINE}}/>);
    }

    return (
        <View
            pointerEvents="none"
            style={[styles.disabledBlock, {width, top, height, overflow: "hidden", backgroundColor: GRID_FILL}]}
        >
            {lines}
            <View style={{position: "absolute", right: 0, top: 0, bottom: 0, width: 1, backgroundColor: COLUMN_SEPARATOR_COLOR}}/>
        </View>
    );
});

const DisabledIntervals: React.FC<DisabledIntervalsProp> = React.memo(({
                                                                          id,
                                                                          APPOINTMENT_BLOCK_WIDTH,
                                                                          hourHeight,
                                                                          date: dateProp,
                                                                          columnIndex
                                                                      }) => {
    const {useDisabledIntervalsFor, useGetDate} =
        useCalendarBinding();
    const date = useGetDate();
    const disabledIntervals: ReadonlyArray<DisabledIntervalType> = useDisabledIntervalsFor(id, dateProp ?? date);
    const common = useContext(HatchCommonContext);

    const {hatch, covers} = useMemo(() => {
        if (!common) return {hatch: disabledIntervals as ReadonlyArray<Span>, covers: null};
        return {
            hatch: subtractIntervals(disabledIntervals, common.intervals),
            covers: subtractIntervals(common.intervals, disabledIntervals),
        };
    }, [disabledIntervals, common]);

    return (
        <>
            {covers?.map(c => (
                <HatchCover
                    key={`c${c.from}-${c.to}`}
                    width={APPOINTMENT_BLOCK_WIDTH}
                    from={c.from}
                    to={c.to}
                    hourHeight={hourHeight}
                />
            ))}
            {hatch.map((disabledInterval, index) => {
                    return <DisabledInterval
                        key={`${index}-${disabledInterval.from}-${disabledInterval.to}`} // Updated key to include disabledInterval values
                        width={APPOINTMENT_BLOCK_WIDTH}
                        top={scalePosition(disabledInterval.from, hourHeight)}
                        height={scalePosition(disabledInterval.to - disabledInterval.from, hourHeight)}
                        xOffset={(columnIndex ?? 0) * APPOINTMENT_BLOCK_WIDTH}
                    />
                }
            )}
        </>
    );
});

const styles = StyleSheet.create({
    disabledBlock: {
        position: "absolute",
        zIndex: -10,
    },
});

export default DisabledIntervals;

// Function to group events into clusters based on overlap
import {toZonedTime} from "date-fns-tz";
import {format, getHours, getMinutes, set, setHours, setMinutes, setSeconds} from "date-fns";
import {DisabledBlock, Event, LayoutMode} from "@/types/calendarTypes";

export const TIME_LABEL_WIDTH = 50;
const groupEventsByOverlap = (events: ReadonlyArray<Event>): Event[][] => {
    return events.reduce((clusters: Event[][], appointment) => {
        const cluster = clusters.find((c) => c.some((e) => isOverlapping(e, appointment)));
        if (cluster) {
            cluster.push(appointment);
        } else {
            clusters.push([appointment]);
        }
        return clusters;
    }, []);
};

export function computeDisabledBlockColumns(
    disabledBlocks: ReadonlyArray<DisabledBlock>,
): Map<number, TimeOffLayout> {
    const groups = groupDisabledBlocksByOverlap(disabledBlocks);
    const res = new Map<number, TimeOffLayout>();

    for (const group of groups) {
        // Greedy interval partitioning → columns
        const byStart = [...group].sort((a, b) => a.from - b.from);
        const columns: DisabledBlock[][] = [];

        for (const evt of byStart) {
            let placed = false;
            for (const col of columns) {
                const last = col[col.length - 1];
                if (!isOverlappingDisabledBlock(last, evt)) {
                    col.push(evt);
                    placed = true;
                    break;
                }
            }
            if (!placed) columns.push([evt]);
        }

        // Column index for each event
        const colIndexByEvent = new Map<DisabledBlock, number>();
        columns.forEach((col, idx) => col.forEach(e => colIndexByEvent.set(e, idx)));

        const groupCols = columns.length;

        // Right-fill: expand into free consecutive columns to the RIGHT
        for (const evt of group) {
            const myCol = colIndexByEvent.get(evt)!;

            let span = 1;
            for (let c = myCol + 1; c < groupCols; c++) {
                const blocked = columns[c].some(e =>
                    e !== evt && isOverlappingDisabledBlock(e, evt)
                );
                if (blocked) break;
                span++;
            }

            const key = evt.id;
            res.set(key, {
                leftIndex: myCol,
                renderColumnCount: groupCols,
                spanColumns: span,
            });
        }
    }

    return res;
}

export const groupDisabledBlocksByOverlap = (disabledBlocks: ReadonlyArray<DisabledBlock>): DisabledBlock[][] => {
    return disabledBlocks.reduce((clusters: any[][], disabledBlock) => {
        const cluster = clusters.find((c) => c.some((e) => isOverlappingDisabledBlock(e, disabledBlock)));
        if (cluster) {
            cluster.push(disabledBlock);
        } else {
            clusters.push([disabledBlock]);
        }
        return clusters;
    }, []);
}

const isOverlappingDisabledBlock = (disabledBlockA: DisabledBlock, disabledBlockB: DisabledBlock): boolean => {
    return !(disabledBlockA.to <= disabledBlockB.from || disabledBlockA.from >= disabledBlockB.to); // If there's no gap, they overlap
}

export function computeEventColumns(
    events: ReadonlyArray<Event>,
): Map<number, ColumnsLayout> {
    const groups = groupEventsByOverlap(events);
    const out = new Map<number, ColumnsLayout>();

    for (const group of groups) {
        const byStart = [...group].sort(
            (a, b) => a.from - b.from
        );

        // Greedy interval partitioning -> columns
        const columns: Event[][] = [];
        for (const evt of byStart) {
            let placed = false;
            for (const col of columns) {
                const last = col[col.length - 1];
                if (!isOverlapping(last, evt)) {
                    col.push(evt);
                    placed = true;
                    break;
                }
            }
            if (!placed) columns.push([evt]);
        }

        const colIndex = new Map<Event, number>();
        columns.forEach((col, i) => col.forEach(e => colIndex.set(e, i)));

        const groupCols = columns.length;

        for (const evt of group) {
            const myCol = colIndex.get(evt)!;

            // How far can I expand to the RIGHT without hitting a column that overlaps me?
            let span = 1; // at least my own column
            for (let c = myCol + 1; c < groupCols; c++) {
                const blocked = columns[c].some(e =>
                    // exclude self; block if ANY event in col c overlaps me
                    (e !== evt && e.id !== evt.id && isOverlapping(e, evt))
                );
                if (blocked) break;
                span++;
            }

            out.set(evt.id!, {
                leftIndex: myCol,
                renderColumnCount: groupCols,
                spanColumns: span,
            });
        }
    }

    return out;
}

export type TimeOffLayout = {
    leftIndex: number;          // starting column (0-based)
    renderColumnCount: number;  // total columns in this overlap group
    spanColumns: number;        // how many columns this block can occupy (right-fill)
};


export const getTextSize = (size: number) => {
    switch (size) {
        case 60:
            return 10;
        case 80:
            return 12;
        case 100:
            return 12;
        default:
            return 12;
    }
}

const MINUTES_IN_DAY = 1440;

// Normalize ONLY when the interval truly wraps overnight.
// Keep half-open semantics: [start, end)
const normalizeOvernight = (startMin: number, endMin: number) => {
    if (endMin < startMin) endMin += MINUTES_IN_DAY; // wrap to next day
    return {startMin, endMin};
};

// Half-open overlap test: [a1,a2) intersects [b1,b2)  <=>  max(a1,b1) < min(a2,b2)
const intersects = (A: { startMin: number; endMin: number }, B: { startMin: number; endMin: number }) =>
    Math.max(A.startMin, B.startMin) < Math.min(A.endMin, B.endMin);

export const isOverlapping = (
    eventA: Event,
    eventB: Event,
): boolean => {
    // 0..1439 minutes
    const aStart0 = eventA.from;
    const aEnd0 = eventA.to;
    const bStart0 = eventB.from;
    const bEnd0 = eventB.to;

    // If either is zero-length, treat as non-blocking (never overlaps)
    if (aStart0 === aEnd0 || bStart0 === bEnd0) return false;

    // Normalize overnight intervals
    const A = normalizeOvernight(aStart0, aEnd0);
    const B = normalizeOvernight(bStart0, bEnd0);

    return intersects(A, B);
};

// Utility to get the current time in minutes since the start of the day
export const getCurrentTimeInMinutes = (timezone: string): number => {
    const now = toZonedTime(new Date(), timezone);
    const hours = getHours(now);
    const minutes = getMinutes(now);
    return hours * 60 + minutes;
};

// Convert time into Y-position
export const timeToYPosition = (minutes: number, TIME_LABEL_HEIGHT: number): number => minutes * (TIME_LABEL_HEIGHT / 60); // Scale factor of 1px per minute

export const scalePosition = (position: number, hourHeight: number) => {
    return position * (hourHeight / 60);
}

export const positionToMinutes = (position: number, TIME_LABEL_HEIGHT: number): number => {
    'worklet';
    return position / (TIME_LABEL_HEIGHT / 60);
}

export const combineDateAndTime = (date: Date, time: string) => {
    // Parse the time string into hours, minutes, and seconds
    const [hours, minutes, seconds] = time.split(':').map(Number);

    // Set hours, minutes, and seconds on the date
    const combinedDate = setSeconds(setMinutes(setHours(date, hours), minutes), seconds);

    // Format the combined date as "yyyy-MM-dd HH:mm:ss"
    return format(combinedDate, 'yyyy-MM-dd HH:mm:ss');
};

export const indexToDate = (index: number) => {
    // Set the date with a specific hour
    const dateWithHour = set(new Date(), {hours: index, minutes: 0, seconds: 0, milliseconds: 0});

    // Format the date in 'h:mm A' format
    return format(dateWithHour, 'h:mm a'); // 'a' is for AM/PM in lowercase
};

export const minutesToTime = (totalMinutes: number): string => {
    'worklet';

    const safeTotalMinutes = Math.max(0, Math.round(totalMinutes));
    const hours24 = Math.floor(safeTotalMinutes / 60);
    const minutes = safeTotalMinutes % 60;

    // Manually pad minutes with a leading zero if needed
    const paddedMins = minutes < 10 ? '0' + minutes : String(minutes);

// Convert to 12-hour format without AM/PM
    const hours12 = hours24 % 12 || 12;

// Return time in 'h:mm' format
    return `${hours12}:${paddedMins}`;
};

export type StackedLayout = {
    // absolute pixel offsets to feed straight into your block
    leftPx: number;
    widthPx: number;
    zIndex: number;     // draw later overlaps on top
};

export function computeStackedEventLayout(
    events: ReadonlyArray<Event>,
    containerWidthPx: number,
    {
        indentPx = 12,        // how much to nudge each overlap to the right
        rightPadPx = 0,       // visual breathing room on the right
        minWidthPx = 30,      // never let an event become thinner than this
        capIndentLevels = 4,  // after N levels, stop indenting (just stack via z-index)
    }: {
        indentPx?: number;
        rightPadPx?: number;
        minWidthPx?: number;
        capIndentLevels?: number;
    } = {}
): Map<number, StackedLayout> {
    // Group by mutual overlap first (same as your existing grouping)
    const groups = groupEventsByOverlap(events);

    const out = new Map<number, StackedLayout>();

    for (const group of groups) {
        // Sweep by start time
        const byStart = [...group].sort((a, b) => a.from - b.from);

        // Active overlap window (min-heap by end time would also work; here we keep a simple list)
        type Active = { e: Event; level: number; };
        const active: Active[] = [];

        // For quick removal
        const removeFinished = (currentFrom: number) => {
            for (let i = active.length - 1; i >= 0; i--) {
                if (!isOverlapping(active[i].e, {...active[i].e, from: currentFrom, to: currentFrom})) {
                    // More robust: if (active[i].e.to <= currentFrom) active.splice(i,1)
                    if (active[i].e.to <= currentFrom) active.splice(i, 1);
                }
            }
        };

        // Track which indent "levels" are free at any moment
        const findLowestFreeLevel = (): number => {
            // Gather occupied levels
            const used = new Set(active.map(a => a.level));
            let lvl = 0;
            while (used.has(lvl)) lvl++;
            return lvl;
        };

        for (const e of byStart) {
            // Drop anything that ended before this start
            removeFinished(e.from);

            // Assign the lowest available level in the *current* overlap window
            let level = findLowestFreeLevel();

            // Cap to avoid pushing too far right; after that we only change zIndex
            const visualLevel = Math.min(level, capIndentLevels);

            // Insert as active
            active.push({e, level});

            // Compute visual frame
            const leftPx = visualLevel * indentPx;
            // Width shrinks by how far we indented, but never below minWidth
            const available = containerWidthPx - leftPx - rightPadPx;
            const widthPx = Math.max(minWidthPx, available);

            // Draw later overlaps on top: z == start minute + level small bias
            const zIndex = 9999 + e.from * 10 + level; // stable tie-break

            out.set(e.id!, {leftPx, widthPx, zIndex});
        }
    }

    return out;
}

export type ColumnsLayout = {
    leftIndex: number;          // same as columnIndex (used for left offset)
    renderColumnCount: number;  // total columns in this overlap group
    spanColumns: number;        // how many columns I can occupy (right-fill)
};

export function columnsToPixels(
    columnMap: Map<number, ColumnsLayout>,
    containerWidthPx: number,
    {
        gutterPx = 2,     // spacing between columns
        padLeftPx = 0,
        padRightPx = 0,
    }: { gutterPx?: number; padLeftPx?: number; padRightPx?: number } = {}
): Map<number, EventFrame> {
    const out = new Map<number, EventFrame>();

    for (const [id, c] of columnMap) {
        const totalGutters = (c.renderColumnCount - 1) * gutterPx;
        const innerWidth = containerWidthPx - padLeftPx - padRightPx - totalGutters;
        const colWidth = innerWidth / c.renderColumnCount;

        const left =
            padLeftPx + c.leftIndex * (colWidth + gutterPx);

        const width =
            colWidth * c.spanColumns + gutterPx * (c.spanColumns - 1);

        out.set(id, {
            leftPx: left,
            widthPx: Math.max(0, width),
            // later columns on top slightly, but mostly rely on time-based z
            zIndex: 1000 + c.leftIndex,
        });
    }

    return out;
}

export type EventFrame = {
    leftPx: number;
    widthPx: number;
    zIndex: number;
};


export function computeEventFrames(
    events: ReadonlyArray<Event>,
    containerWidthPx: number,
    mode: LayoutMode,
    options?: {
        // columns
        gutterPx?: number; padLeftPx?: number; padRightPx?: number;
        // stacked
        indentPx?: number; rightPadPx?: number; minWidthPx?: number; capIndentLevels?: number;
    }
): Map<number, EventFrame> {
    if (mode === "columns") {
        const columnLayouts = computeEventColumns(events); // your existing function
        return columnsToPixels(columnLayouts, containerWidthPx, {
            gutterPx: options?.gutterPx,
            padLeftPx: options?.padLeftPx,
            padRightPx: options?.padRightPx,
        });
    } else {
        return computeStackedEventLayout(events, containerWidthPx, {
            indentPx: options?.indentPx,
            rightPadPx: options?.rightPadPx,
            minWidthPx: options?.minWidthPx,
            capIndentLevels: options?.capIndentLevels,
        });
    }
}

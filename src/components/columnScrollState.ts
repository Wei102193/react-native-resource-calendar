/**
 * Horizontal fling state shared between `Calendar` and the column cells.
 *
 * Deliberately NOT React state and NOT part of `extraData`: FlashList memoises cells
 * on `extraData` / `renderItem` identity, and Android emits a MomentumBegin /
 * MomentumEnd pair on every touch release, so routing this through props would
 * re-render every mounted column twice per swipe. Cells that are waiting for cards
 * subscribe instead, so settling re-renders only the cells the fling assigned.
 */

/** Android drops MomentumEnd when a new touch cancels a fling, and programmatic
 *  scrolls emit no momentum events at all; never leave cards hidden longer than this. */
export const FLING_SETTLE_TIMEOUT_MS = 1500;

/**
 * "Settled" means the list is visually at rest: fewer than this many px per frame for
 * this many consecutive UI frames. Android's own MomentumEnd waits for the offset to be
 * exactly still for 3 frames AFTER the snap animation has crawled to its end, which on
 * a slow phone is a long tail during which the user already sees a stopped list with
 * no cards on it.
 */
export const FLING_SETTLE_PX_PER_FRAME = 6;
export const FLING_SETTLE_STABLE_FRAMES = 2;

type Listener = { fn: (position: number) => void; columnIndex: number };

export type ColumnScrollState = {
    settled: boolean;
    listeners: Set<Listener>;
    timer: ReturnType<typeof setTimeout> | null;
    /** Centre column of the viewport at the moment the fling settled. */
    centre: number;
    set(settled: boolean): void;
    subscribe(fn: (position: number) => void, columnIndex: number): () => void;
};

export const createColumnScrollState = (): ColumnScrollState => ({
    settled: true,
    listeners: new Set<Listener>(),
    timer: null,
    centre: 0,

    set(settled: boolean) {
        if (this.settled === settled) return;
        this.settled = settled;
        if (!settled) return;

        // Wake the waiting cells nearest to the viewport centre first, and hand each
        // its rank so it can stagger its reveal by that many frames (one column of
        // cards per frame) instead of every card landing in one commit. On a slow
        // terminal one column is already a full frame budget.
        const waiting = Array.from(this.listeners).sort(
            (a, b) => Math.abs(a.columnIndex - this.centre) - Math.abs(b.columnIndex - this.centre)
        );
        for (let i = 0; i < waiting.length; i++) waiting[i].fn(i);
    },

    subscribe(fn: (position: number) => void, columnIndex: number) {
        const entry: Listener = {fn, columnIndex};
        this.listeners.add(entry);
        return () => {
            this.listeners.delete(entry);
        };
    },
});

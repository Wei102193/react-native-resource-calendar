/** Quarter-hour rows in a 24 h column. */
export const GRID_ROWS = 96;

/**
 * The grid used to be drawn per column as a Skia canvas of 96 translucent rects
 * (`rgba(240,240,240,0.6)`) over the white container. `GRID_FILL` is that colour
 * already composited, so the shared opaque backdrop reaches the screen with the
 * same value.
 */
export const GRID_FILL = '#f6f6f6';

/**
 * The pressed-slot highlight is drawn ABOVE the backdrop and above the hatched
 * intervals, so it is a translucent white rather than a lighter grey: over
 * `GRID_FILL` it yields the old pressed shade (#fafafa) and lets the hatch show
 * through half-faded, exactly as the old translucent Skia rect did.
 */
export const GRID_PRESSED_FILL = 'rgba(255,255,255,0.5)';

/** Quarter-hour rule between rows. */
export const GRID_LINE = '#ddd';

/**
 * The per-column border used to be `#ddd`, but the cell's 60 % grey Skia canvas
 * (width W, over a W-1 content box) painted over that pixel, so what reached the
 * screen was 240 * 0.6 + 221 * 0.4 = 232.4. Nothing covers the separator layer, so
 * it uses that composited value directly and stays pixel-identical.
 */
export const COLUMN_SEPARATOR_COLOR = '#e8e8e8';

import {PixelRatio, Platform} from 'react-native';

/**
 * The diagonal hatch drawn over disabled (non-working) intervals.
 *
 * The original was a `react-native-svg` `<Pattern>` inside every interval. On
 * Android each `<Svg>` is rasterised into a column-width x interval-height bitmap on
 * the UI thread, so a screen full of columns paid for one rasterisation per interval
 * per column. On Android the pattern is now a tiny tiled PNG built once at runtime;
 * iOS keeps the `<Pattern>`, which is drawn synchronously with the column (an
 * `<Image>` there goes through RCTImageLoader and lands a frame late).
 *
 * The SVG version was `rgba(120,120,120,0.10)` with `rgba(115,115,115,0.85)` lines,
 * but it sat UNDER the 60 % grey grid canvas (`zIndex: -10`), so what actually
 * reached the screen was much fainter: about 240.6 grey for the fill and 197.6 grey
 * on the lines. The hatch now sits above the opaque `GRID_FILL` backdrop, so the
 * alphas below are the ones that reproduce those on-screen values.
 */
export const HATCH_BACKGROUND_COLOR = 'rgba(120, 120, 120, 0.043)';
export const HATCH_TILE_DP = 10;
export const HATCH_STROKE_DP = 1;
export const HATCH_GREY = 115;
export const HATCH_ALPHA = 0.34;

export const HATCH_SVG_STROKE = `rgba(${HATCH_GREY}, ${HATCH_GREY}, ${HATCH_GREY}, ${HATCH_ALPHA})`;

export type HatchTile = {
    uri: string;
    width: number;
    height: number;
    scale: number;
};

// --- Minimal PNG writer (RGBA, stored deflate blocks) -----------------------
// Android's resizeMode "repeat" (ScaleTypeStartInside) tiles the bitmap at 1:1
// physical pixels and ignores `source.scale`, so the tile has to be generated in
// device pixels to come out as the 10 dp / 1 dp pattern the old <Pattern
// patternUnits="userSpaceOnUse"> drew. iOS honours scale.

let CRC_TABLE: Uint32Array | null = null;

const crc32 = (bytes: Uint8Array): number => {
    if (!CRC_TABLE) {
        CRC_TABLE = new Uint32Array(256);
        for (let n = 0; n < 256; n++) {
            let c = n;
            for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
            CRC_TABLE[n] = c >>> 0;
        }
    }
    let c = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
};

const adler32 = (bytes: Uint8Array): number => {
    let a = 1, b = 0;
    for (let i = 0; i < bytes.length; i++) {
        a = (a + bytes[i]) % 65521;
        b = (b + a) % 65521;
    }
    return ((b << 16) | a) >>> 0;
};

const be32 = (n: number): number[] => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];

const pngChunk = (type: string, data: number[]): number[] => {
    const typeBytes = Array.from(type, ch => ch.charCodeAt(0));
    const body = typeBytes.concat(data);
    return be32(data.length).concat(body, be32(crc32(Uint8Array.from(body))));
};

const storedDeflate = (raw: Uint8Array): number[] => {
    const out: number[] = [0x78, 0x01];
    for (let pos = 0; pos < raw.length; pos += 65535) {
        const len = Math.min(65535, raw.length - pos);
        const last = pos + len >= raw.length ? 1 : 0;
        out.push(last, len & 255, len >>> 8, ~len & 255, (~len >>> 8) & 255);
        for (let i = 0; i < len; i++) out.push(raw[pos + i]);
    }
    return out.concat(be32(adler32(raw)));
};

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const toBase64 = (bytes: number[]): string => {
    let out = '';
    for (let i = 0; i < bytes.length; i += 3) {
        const a = bytes[i], b = bytes[i + 1], c = bytes[i + 2];
        const n = (a << 16) | ((b || 0) << 8) | (c || 0);
        out += B64[(n >>> 18) & 63]
            + B64[(n >>> 12) & 63]
            + (b === undefined ? '=' : B64[(n >>> 6) & 63])
            + (c === undefined ? '=' : B64[n & 63]);
    }
    return out;
};

/**
 * One diagonal line along y = x through a size x size tile, anti-aliased by distance
 * to the line; tiled, it is the continuous 45-degree hatch of the old `<Pattern>`.
 * The endpoints sit on the tile corners so neighbouring tiles continue the stroke.
 */
const buildHatchTile = (pixelRatio: number): HatchTile => {
    const size = Math.max(1, Math.round(HATCH_TILE_DP * pixelRatio));
    const half = (HATCH_STROKE_DP * pixelRatio) / 2;

    const raw: number[] = [];
    for (let y = 0; y < size; y++) {
        raw.push(0); // PNG filter type 0 for this scanline
        for (let x = 0; x < size; x++) {
            const d = Math.abs((x + 0.5) - (y + 0.5)) / Math.SQRT2;
            const coverage = Math.max(0, Math.min(1, half - d + 0.5));
            raw.push(HATCH_GREY, HATCH_GREY, HATCH_GREY, Math.round(coverage * HATCH_ALPHA * 255));
        }
    }

    // RGBA (colour type 6). Greyscale+alpha (type 4) would halve the data, but on the
    // Android emulator the repeated tile came out as a flat fill with no strokes, so
    // that decoder path is not trusted with it.
    const ihdr = be32(size).concat(be32(size), [8, 6, 0, 0, 0]);
    const png = ([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] as number[]).concat(
        pngChunk('IHDR', ihdr),
        pngChunk('IDAT', storedDeflate(Uint8Array.from(raw))),
        pngChunk('IEND', [])
    );

    return {uri: 'data:image/png;base64,' + toBase64(png), width: size, height: size, scale: pixelRatio};
};

let HATCH_TILE: HatchTile | null = null;

export const getHatchTile = (): HatchTile => {
    if (!HATCH_TILE) HATCH_TILE = buildHatchTile(PixelRatio.get());
    return HATCH_TILE;
};

// Build the tile off the first-paint frame: otherwise the first disabled interval to
// render pays the (few ms) encode synchronously while the calendar mounts.
if (Platform.OS === 'android') {
    const idle = (globalThis as any).requestIdleCallback;
    if (typeof idle === 'function') idle(() => getHatchTile(), {timeout: 2000});
}

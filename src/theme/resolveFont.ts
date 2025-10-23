// theme/resolveFont.ts
export type FontWeightRN = '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';

export type ResolveFontArgs = {
    family?: string;
    weight?: FontWeightRN;
    italic?: boolean;
};

const WEIGHT_NAME_MAP: Record<FontWeightRN, string> = {
    '100': 'Thin',
    '200': 'ExtraLight',
    '300': 'Light',
    '400': 'Regular',
    '500': 'Medium',
    '600': 'SemiBold',
    '700': 'Bold',
    '800': 'ExtraBold',
    '900': 'Black',
};

/**
 * Builds Expo font key dynamically based on standard pattern
 * e.g. ("Inter", 700, true) => "Inter_700Bold_Italic"
 */
export function resolveFont({ family = 'System', weight = '400', italic = false }: ResolveFontArgs): string {
    // Ignore system fonts or arbitrary custom ones
    if (family === 'System' || family.includes('_')) return family;

    // Determine textual weight (Bold, Light, etc.)
    const weightName = WEIGHT_NAME_MAP[weight] ?? 'Regular';

    // Construct Expo font key: Inter_700Bold or Inter_700Bold_Italic
    const base = `${family}_${weight}${weightName}`;
    return italic ? `${base}_Italic` : base;
}

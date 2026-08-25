// store/themeContext.ts
import React, {createContext, useContext, useMemo} from 'react';
import {CalendarTheme} from "@/types/calendarTypes";
import {FontWeightRN, resolveFont} from "@/theme/resolveFont";

const defaultTheme: CalendarTheme = {
    typography: {
        fontFamily: 'System',
    },
};

const ThemeCtx = createContext<CalendarTheme>(defaultTheme);
export const useCalendarTheme = () => useContext(ThemeCtx);

export const useResolvedFont = (overrides?: {
    fontFamily?: string;
    fontWeight?: FontWeightRN;
    italic?: boolean;
}) => {
    const {typography} = useCalendarTheme(); // { fontFamily?, fontWeight? , italic? }
    const family = overrides?.fontFamily ?? typography?.fontFamily ?? 'System';
    const weight = overrides?.fontWeight ?? '400';
    const italic = overrides?.italic ?? false;

    return resolveFont({family, weight, italic});
};

export const CalendarThemeProvider: React.FC<{
    theme?: CalendarTheme;
    children: React.ReactNode;
}> = ({theme, children}) => {
    // Memoised so the context value keeps a stable identity — otherwise every
    // provider render invalidates all `useCalendarTheme` / `useResolvedFont`
    // consumers (every event block, every time label).
    const mergedTheme = useMemo<CalendarTheme>(() => ({
        ...defaultTheme,
        ...theme,
        typography: {...defaultTheme.typography, ...theme?.typography},
    }), [theme]);

    return <ThemeCtx.Provider value={mergedTheme}>{children}</ThemeCtx.Provider>;
};

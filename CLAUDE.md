# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build        # Build to dist/ via tsup (ESM + CJS + .d.ts)
npm run typecheck    # TypeScript check without emit
```

No test or lint scripts are configured. Build runs automatically on `npm prepare` and `npm publish`.

## Architecture

This is a React Native library that exports a `Calendar` component and (since v1.1.5) a `KanbanBoard` component. Source in `src/` compiles to `dist/` via tsup.

### State Management Pattern

Each `Calendar` instance gets its own **scoped Zustand store** via React Context — not a global singleton. This allows multiple calendars in the same app without state collisions.

```
<CalendarBindingProvider>   ← creates isolated store context
  <StoreFeeder />           ← converts props → store state
  <Calendar />              ← subscribes to store, renders UI
</CalendarBindingProvider>
```

`StoreFeeder` is a renderless component that keeps the store synchronized with incoming props. The store binding interface (`calendarStoreBinding.ts`) allows swapping out Zustand for another store implementation.

### Data Structure

Events and disabled blocks are indexed by day then resource for O(1) lookup:

```typescript
type ByResource<T> = Record<ResourceId, T[]>;
type ByDay<T> = Record<string, ByResource<T>>;
// eventsByDay["2025-04-02"][resourceId] → Event[]
```

### Layout Modes

- **Day mode** (`mode: 'day'`): columns = resources, one day visible
- **Multi-day modes** (`mode: '3days' | 'week'`): columns = days, one resource visible

**Overlap layout** (`overLappingLayoutMode`):
- `'columns'` — greedy interval partitioning, side-by-side (see `computeEventColumns`)
- `'stacked'` — indented levels with z-index (see `computeStackedEventLayout`)

Layout algorithms live in `src/utilities/helpers.ts`.

### Gesture / Reanimated Patterns

- Pan gesture uses **manual activation on Android** (`manualActivation(!isIOS)`) and auto-activates on iOS
- Android drag activation checks `hasDraggingCard.value` (SharedValue) inside `onTouchesMove` — **not** a closure variable
- Auto-scroll at edges: `useFrameCallback` + `scrollTo(animatedRef, x, y, true)` on the UI thread
- Bridge between React hooks and worklets: `useRef` caches values that worklets need (`hourHeightRef`, `resourcesRef`)
- Use `scheduleOnRN(fn, ...args)` from `react-native-worklets` to call back to the JS thread (not `runOnJS`)

### Kanban Component

Located in `src/components/Kanban/`. Drop detection algorithm:

```
absoluteX = panXAbs + boardScrollX
colIdx = clamp(floor((absoluteX - BOARD_PADDING) / (COLUMN_WIDTH + COLUMN_GAP)), 0, cols.length-1)
targetContentY = panYAbs - COLUMN_HEADER_HEIGHT - CARD_LIST_PADDING_TOP + columnScrollOffset[colIdx]
insertIndex = first card where card.y + card.height/2 > targetContentY
```

Constants: `BOARD_PADDING=12`, `COLUMN_GAP=12`, `DEFAULT_COLUMN_WIDTH=240`, `COLUMN_HEADER_HEIGHT=48`, `CARD_LIST_PADDING_TOP=10`

### Event Customization

Events support slot-based rendering without forking the library:

```typescript
eventSlots?: {
  TopRight?: React.ComponentType<{ event, ctx }>;
  Body?: React.ComponentType<{ event, ctx }>;
}
eventStyleOverrides?: StyleOverrides | ((event) => StyleOverrides)
```

### Path Alias

`@/*` maps to `src/*` in TypeScript. The tsup build does NOT resolve this alias — avoid using `@/` imports in source files; use relative paths instead.

## Key Files

| File | Role |
|------|------|
| `src/index.ts` | Public API surface |
| `src/components/Calendar.tsx` | Main orchestrator — gestures, scroll sync, drag logic (~844 lines) |
| `src/store/bindings/ZustandBinding.tsx` | Zustand store + selector hooks |
| `src/store/StoreFeeder.tsx` | Props → store state transformer |
| `src/utilities/helpers.ts` | Layout algorithms, overlap detection, time↔pixel conversion |
| `src/types/calendarTypes.ts` | All core TypeScript types |
| `src/theme/ThemeContext.tsx` | Theme provider with platform font resolution |
| `tsup.config.ts` | Build config — external peer deps, dual ESM/CJS output |

## Peer Dependencies

Must be installed by consumers. All are listed as `external` in tsup so they're never bundled:

- `react-native-reanimated ~4.1.1`
- `react-native-gesture-handler ~2.28.0`
- `react-native-worklets ^0.5.1`
- `@shopify/flash-list ~2.2.0`
- `@shopify/react-native-skia ~2.2.12`
- `react-native-svg ~15.12.1`
- `expo-haptics ~15.0.7` *(optional)*

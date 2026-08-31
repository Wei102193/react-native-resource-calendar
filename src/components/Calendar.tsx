import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Gesture, GestureDetector} from "react-native-gesture-handler";
import {scheduleOnRN} from 'react-native-worklets';
import Animated, {
    FrameInfo,
    scrollTo,
    SharedValue,
    useAnimatedRef,
    useAnimatedScrollHandler,
    useFrameCallback,
    useSharedValue,
    withSpring
} from "react-native-reanimated";
import {Dimensions, LayoutChangeEvent, Platform, StyleSheet, useWindowDimensions, View} from "react-native";
import {FlashList, FlashListRef} from "@shopify/flash-list";
import {
    findDayIndexFor,
    findResourceIndexFor,
    positionToMinutes,
    scalePosition,
    TIME_LABEL_WIDTH
} from '@/utilities/helpers';
import {TimeLabels} from './TimeLabels';
import {ResourcesComponent, ResourceSlots} from "./ResourcesComponent";
import {ColumnSeparators, GridBackdrop} from "./EventGridBlocks";
import {
    CalendarColumn,
    CalendarMode,
    CalendarTheme,
    DisabledBlock,
    DisabledInterval,
    Event,
    LayoutMode,
    Resource
} from '@/types/calendarTypes';
import {StoreFeeder} from '@/store/StoreFeeder';
import {useCalendarBinding} from '@/store/bindings/BindingProvider';
import {useNoopBindingHook} from '@/store/bindings/calendarStoreBinding';
import {HatchCommonContext, HatchLayer, useHatchCommon} from './DisabledIntervals';
import EventBlock, {EventRenderer, EventSlots, StyleOverrides} from "@/components/EventBlock";
import {DraggableEvent} from "@/components/DraggableEvent";
import {CalendarThemeProvider} from "@/theme/ThemeContext";
import ColumnCell from "@/components/ColumnCell";
import {
    createColumnScrollState,
    FLING_SETTLE_PX_PER_FRAME,
    FLING_SETTLE_STABLE_FRAMES,
    FLING_SETTLE_TIMEOUT_MS
} from "@/components/columnScrollState";
import {DaysComponent} from "@/components/DaysComponent";
import {addDays, format} from 'date-fns';

type FlagFn = (event: Event) => boolean;
type HapticStyle =
    | "Light"
    | "Medium"
    | "Heavy"
    | "Rigid"
    | "Soft";

interface CalendarProps {
    timezone?: string;
    date: Date;
    startMinutes?: number;
    resources: Array<Resource & {
        events: Event[];
        disabledBlocks?: DisabledBlock[];
        disableIntervals?: DisabledInterval[];
    }>;

    snapIntervalInMinutes?: number;
    numberOfColumns?: number;
    hourHeight?: number;

    onResourcePress?: (resource: Resource) => void;
    onBlockLongPress?: (resource: Resource, date: Date) => void;
    onBlockTap?: (resource: Resource, date: Date) => void;
    onDisabledBlockPress?: (block: DisabledBlock) => void;
    onEventPress?: (event: Event) => void;
    onEventLongPress?: (event: Event) => void;
    enableHapticFeedback?: boolean;
    eventSlots?: EventSlots;
    resourceSlots?: ResourceSlots;
    eventStyleOverrides?:
        | StyleOverrides
        | ((event: Event) => StyleOverrides | undefined);
    isEventSelected?: FlagFn;
    isEventDisabled?: FlagFn;
    // Return true to lock an event against drag/resize. Unlike `isEventDisabled`,
    // a locked event stays fully interactive: `onEventPress` and `onEventLongPress`
    // still fire, but the calendar skips its internal drag setup so no drag ghost
    // or action bar appears.
    isEventLocked?: FlagFn;
    // When true, disabled (time-off) blocks are dimmed and pass touches through to
    // the grid beneath, so a "select a time" flow can pick the slot under them.
    disabledBlocksTapThrough?: boolean;

    theme?: CalendarTheme;
    overLappingLayoutMode?: LayoutMode;

    mode?: CalendarMode;
    activeResourceId?: number;
    scrollsToTop?: boolean;
}

type Layout = {
    x: number;
    y: number;
    width: number;
    height: number;
};

const AnimatedFlashList = Animated.createAnimatedComponent(FlashList);
const DEFAULT_TIMEZONE = Intl?.DateTimeFormat()?.resolvedOptions()?.timeZone;

// expo-haptics is an optional peer. Resolve it once and cache the result: the drag
// gesture fires a haptic on every snap step, and the import used to be re-issued
// inside the handler each time. A structural type keeps the build (and the emitted
// .d.ts) working when the package is not installed.
type HapticsModule = {
    ImpactFeedbackStyle: Record<HapticStyle, unknown>;
    impactAsync: (style: unknown) => Promise<void>;
};

let hapticsPromise: Promise<HapticsModule | null> | null = null;

const getHaptics = (): Promise<HapticsModule | null> => {
    if (!hapticsPromise) {
        // @ts-ignore optional peer dependency: it may not be installed at build time
        hapticsPromise = import('expo-haptics')
            .then(m => m as unknown as HapticsModule)
            .catch(() => {
                // expo-haptics not installed → haptics stay off
                console.log("Haptics not available, skipping...");
                return null;
            });
    }
    return hapticsPromise;
};

const CalendarInner: React.FC<CalendarProps> = React.memo((props) => {
    const {width} = useWindowDimensions();
    const isIOS = Platform.OS === 'ios';
    const binding = useCalendarBinding();

    const {
        date,
        numberOfColumns: numberOfColumnsProp = 3,
        startMinutes,
        hourHeight = 120,
        snapIntervalInMinutes = 5,
        timezone = DEFAULT_TIMEZONE,
        resources,
        onResourcePress,
        onBlockLongPress,
        onBlockTap,
        onEventPress,
        onEventLongPress,
        onDisabledBlockPress,
        enableHapticFeedback = false,
        eventSlots,
        resourceSlots,
        eventStyleOverrides,
        overLappingLayoutMode = 'stacked',
        mode = 'day',
        activeResourceId,
        scrollsToTop = true,
    } = props;

    const numberOfColumns = mode === 'day' ? numberOfColumnsProp : (mode === 'week' ? 7 : 3);
    const isMultiDay = mode !== 'day';
    const visibleDayCount = isMultiDay ? (mode === 'week' ? 7 : 3) : 1;
    const days = useMemo(
        () => Array.from({length: visibleDayCount}, (_, i) => addDays(date, i)),
        [date, visibleDayCount]
    );

    const snapInterval = (hourHeight / 60) * snapIntervalInMinutes;
    const onPressRef = React.useRef(onEventPress);
    onPressRef.current = onEventPress;
    const onLongPressRef = React.useRef(onEventLongPress);
    onLongPressRef.current = onEventLongPress;
    const internalOnLongPress = useRef<((e: Event) => void) | null>(null);
    const onDisabledBlockPressRef = React.useRef(onDisabledBlockPress);
    onDisabledBlockPressRef.current = onDisabledBlockPress;

    const effectiveRenderer = useMemo<EventRenderer>(() => {
        return (p) => (
            <EventBlock
                {...p}
                slots={props.eventSlots}
                styleOverrides={props.eventStyleOverrides}
            />
        );
    }, [eventSlots, eventStyleOverrides]);

    const isEventSelectedStable = useCallback<FlagFn>(
        (ev) => props.isEventSelected?.(ev) ?? false, [props.isEventSelected]);

    const isEventDisabledStable = useCallback<FlagFn>(
        (ev) => props.isEventDisabled?.(ev) ?? false, [props.isEventDisabled]);

    // Read from a ref: the long-press handler is installed once in a [] effect,
    // so a closed-over prop would go stale.
    const isEventLockedRef = useRef(props.isEventLocked);
    isEventLockedRef.current = props.isEventLocked;

    const stableOnPress = React.useCallback((e: Event) => onPressRef.current?.(e), []);
    const stableOnDisabledBlockPress = React.useCallback((b: DisabledBlock) => onDisabledBlockPressRef.current?.(b), []);

    const {useGetSelectedEvent, useSetSelectedEvent, useSetDraggedEventDraft, useGetDraggedEventDraft} =
        useCalendarBinding();
    const selectedEvent = useGetSelectedEvent();
    const setSelectedEvent = useSetSelectedEvent();
    const setDraggedEventDraft = useSetDraggedEventDraft();

    const hourHeightRef = useRef(hourHeight);
    hourHeightRef.current = hourHeight;
    const resourcesRef = useRef(resources);
    resourcesRef.current = resources;
    const isMultiDayRef = useRef(isMultiDay);
    isMultiDayRef.current = isMultiDay;
    const daysRef = useRef(days);
    daysRef.current = days;

    useEffect(() => {
        if (!selectedEvent) {
            setDraggedEventDraft(null);
            setDragReady(false);
            hasSelectedEvent.value = false;
        }
    }, [selectedEvent, setSelectedEvent, setDraggedEventDraft]);

    useEffect(() => {
        scrollX.value = 0;
    }, [mode, numberOfColumns, width]);

    const verticalScrollViewRef = useAnimatedRef<Animated.ScrollView>();
    const headerScrollViewRef = useAnimatedRef<Animated.ScrollView>();

    const flashListRef = useRef<FlashListRef<any>>(null);
    const prevResourceIdsRef = useRef<(number)[]>([]);
    const [layout, setLayout] = useState<Layout | null>(null);
    const [dragReady, setDragReady] = useState(false);

    const APPOINTMENT_BLOCK_WIDTH = useMemo(
        () => ((layout?.width ?? width) - TIME_LABEL_WIDTH) / numberOfColumns,
        [layout?.width, width, numberOfColumns]
    );

    const apptWidthRef = useRef(APPOINTMENT_BLOCK_WIDTH);
    apptWidthRef.current = APPOINTMENT_BLOCK_WIDTH;

    const dateRef = useRef(date); // Store `date` in a ref to prevent re-renders
    dateRef.current = date;

    const eventStartedTop = useSharedValue(0);
    const eventHeight = useSharedValue(0);

    const panXAbs = useSharedValue(0);
    const panYAbs = useSharedValue(0);
    const isPulling = useSharedValue(false);
    const isDragging = useSharedValue(false);

    const scrollX = useSharedValue(0);
    const scrollY = useSharedValue(0);

    // Horizontal fling state read by ColumnCell; see columnScrollState.
    const listScrollStateRef = useRef<ReturnType<typeof createColumnScrollState> | null>(null);
    if (!listScrollStateRef.current) listScrollStateRef.current = createColumnScrollState();
    const listScrollState = listScrollStateRef.current;
    const settleWatchRef = useRef<{
        frame: { isActive: boolean; setActive: (v: boolean) => void };
        prev: SharedValue<number>;
        stable: SharedValue<number>;
        scrollX: SharedValue<number>;
        columnWidth: number;
        numberOfColumns: number;
    } | null>(null);

    const onFlingStart = useCallback(() => {
        listScrollState.set(false);

        const w = settleWatchRef.current;
        if (w) {
            w.prev.value = w.scrollX.value || 0;
            w.stable.value = 0;
            w.frame.setActive(true);
        }

        if (listScrollState.timer) clearTimeout(listScrollState.timer);
        listScrollState.timer = setTimeout(() => {
            listScrollState.timer = null;
            listScrollState.set(true);
        }, FLING_SETTLE_TIMEOUT_MS);
    }, [listScrollState]);

    const onFlingEnd = useCallback(() => {
        const w = settleWatchRef.current;
        if (w) {
            listScrollState.centre = ((w.scrollX.value || 0) / w.columnWidth) + (w.numberOfColumns - 1) / 2;
            if (w.frame.isActive) w.frame.setActive(false);
        }

        if (listScrollState.timer) {
            clearTimeout(listScrollState.timer);
            listScrollState.timer = null;
        }
        listScrollState.set(true);
    }, [listScrollState]);

    useEffect(() => () => {
        if (listScrollState.timer) clearTimeout(listScrollState.timer);
    }, [listScrollState]);

    const autoScrollSpeed = useSharedValue(0);
    const autoScrollXSpeed = useSharedValue(0);
    const lastHapticScrollY = useSharedValue(0);
    const lastXScrollTime = useSharedValue(0);

    const startedX = useSharedValue(0);
    const startedY = useSharedValue(0);
    const touchY = useSharedValue(0); // NEW
    const hasSelectedEvent = useSharedValue(false);

    const triggerHaptic = useCallback(
        async (style: HapticStyle = "Light") => {
            // Check the flag first: with haptics off this is the whole cost, where it
            // used to import the module and only then look at the flag.
            if (!enableHapticFeedback) return;
            const haptics = await getHaptics();
            if (!haptics) return;
            try {
                await haptics.impactAsync(haptics.ImpactFeedbackStyle[style]);
            } catch (e) {
                // Nobody awaits this call; swallow so it cannot become an
                // unhandled rejection.
            }
        },
        [enableHapticFeedback]
    );
    // Read the latest haptic fn from a ref so the once-mounted long-press handler
    // (set up in a [] effect below) doesn't capture a stale `enableHapticFeedback`.
    const triggerHapticRef = useRef(triggerHaptic);
    triggerHapticRef.current = triggerHaptic;

    const resourceIds = useMemo(() => {
        const ids = resources?.map(item => item?.id) || [];
        const prev = prevResourceIdsRef.current;
        const same = prev && prev.length === ids.length && prev.every((id, i) => id === ids[i]);
        if (!same) {
            prevResourceIdsRef.current = ids;
        }
        return prevResourceIdsRef.current;
    }, [resources]);

    const finalizeDrag = React.useCallback((
        colIndex: number,
        adjustedTop: number,
        height: number
    ) => {
        // decide what column means based on mode
        const isMultiDay = mode !== 'day';
        const landedResourceId = !isMultiDay
            ? resourceIds[colIndex]                     // day mode → resource column
            : (activeResourceId ?? resourceIds[0]);      // multi-day → fixed resource

        const landedDate = format(!isMultiDay
            ? date                   // day mode → resource column
            : days[colIndex], "yyyy-MM-dd")                             // day mode → constant day

        setDraggedEventDraft({
            event: selectedEvent!, // ensure this is not stale (store/ref)
            from: positionToMinutes(adjustedTop, hourHeight),
            to: positionToMinutes(adjustedTop + height, hourHeight),
            resourceId: landedResourceId,
            date: landedDate,
        });
    }, [mode, resourceIds, activeResourceId, selectedEvent, hourHeight, setDraggedEventDraft, days, date]);

    const columns: CalendarColumn[] = useMemo(() => {
        if (!isMultiDay) {
            // Day mode: one day x multiple resources (keep current behavior)
            return resourceIds.map(resourceId => ({kind: 'resource', resourceId}));
        }
        // Multi-day mode: multiple days x single active resource
        return days.map((dayDate, dayIndex) => ({kind: 'day', dayIndex, dayDate}));
    }, [isMultiDay, resourceIds, days]);

    const panGesture = Gesture.Pan()
        .manualActivation(!isIOS)
        .enabled(layout !== null)
        .shouldCancelWhenOutside(false)
        .onTouchesMove((_evt, stateManager) => {
            'worklet';
            if (isIOS) return;
            if (hasSelectedEvent.value)
                stateManager.activate();
            else stateManager.end();
        })
        .onUpdate((evt) => {
            'worklet';
            // Check if the event is draggable, only draggable if gesture is within the selected event block
            if (!evt || evt.y == null || evt.x == null) return;
            let draggable = false;
            let pullable = false;

            const draggableMinY = panYAbs.value - eventHeight.value / 2;
            const draggableMaxY = panYAbs.value + eventHeight.value / 2 - (eventHeight.value <= snapInterval * 3 * 2 ? snapInterval : snapInterval * 3);
            const pullableMaxY = panYAbs.value + eventHeight.value / 2;

            const blockMinX = panXAbs.value - APPOINTMENT_BLOCK_WIDTH / 2;
            const blockMaxX = panXAbs.value + APPOINTMENT_BLOCK_WIDTH / 2;

            touchY.value = evt.y; // NEW: always remember the last finger Y, for classic “finger parked on the edge” problem.

            if (evt.x >= blockMinX && evt.x <= blockMaxX) {
                draggable = evt.y >= draggableMinY && evt.y <= draggableMaxY;
                pullable = evt.y > draggableMaxY && evt.y <= pullableMaxY + snapInterval * 3;
            }

            if ((pullable && !isDragging.value) || isPulling.value) {
                isPulling.value = true;
                const onScreenTop = eventStartedTop.value - scrollY.value;
                const newHeight = evt.y - onScreenTop;
                const snappedHeight = Math.round(newHeight / snapInterval) * snapInterval;
                let finalHeight = Math.max(hourHeight / 4, snappedHeight);

                const totalDayHeight = 24 * hourHeight;
                const maxAllowedHeight = totalDayHeight - eventStartedTop.value;
                finalHeight = Math.min(finalHeight, maxAllowedHeight);

                if (finalHeight !== eventHeight.value) {
                    eventHeight.value = finalHeight;
                    panYAbs.value = onScreenTop + (finalHeight / 2);
                    scheduleOnRN(triggerHaptic);
                }

                if (layout) {
                    const AUTO_SCROLL_BUFFER = 30;

                    if (evt.y > layout.height - AUTO_SCROLL_BUFFER) {
                        autoScrollSpeed.value = 1;
                    } else if (evt.y < AUTO_SCROLL_BUFFER && newHeight > hourHeight / 4) {
                        autoScrollSpeed.value = -1;
                    } else {
                        autoScrollSpeed.value = 0;
                    }
                } else {
                    autoScrollSpeed.value = 0;
                }
            }

            if ((draggable && !isPulling.value) || isDragging.value) {
                isDragging.value = true; // Reset dragging state
                // --- Vertical Drag Logic ---
                const translatedY = Math.round(evt.translationY / snapInterval) * snapInterval;
                // 1. Calculate the proposed ABSOLUTE top position within the entire scroll content
                const proposedAbsoluteTop = (startedY.value - (eventHeight.value / 2)) + translatedY + scrollY.value;
                // 2. Snap this absolute position to the nearest grid line
                let snappedAbsoluteTop = Math.round(proposedAbsoluteTop / snapInterval) * snapInterval;
                // 3. Apply the absolute top boundary (12:00 AM)
                snappedAbsoluteTop = Math.max(0, snappedAbsoluteTop);
                // 4. Apply the absolute bottom boundary to keep the top of the appointment visible on screen
                if (layout) {
                    // The maximum absolute top is the bottom of the screen plus the current scroll offset, with a one-block buffer.
                    const maxAbsoluteTop = (layout.height + scrollY.value) - snapInterval;
                    snappedAbsoluteTop = Math.min(snappedAbsoluteTop, maxAbsoluteTop);
                }
                // 5. Update shared values
                if (snappedAbsoluteTop !== eventStartedTop.value) {
                    scheduleOnRN(triggerHaptic);
                    eventStartedTop.value = snappedAbsoluteTop;
                }
                // 6. Convert the corrected absolute top back to a visual on-screen position
                panYAbs.value = (snappedAbsoluteTop - scrollY.value) + (eventHeight.value / 2);

                // --- Horizontal Drag Logic ---
                let panXAbsValue = Math.max(
                    (APPOINTMENT_BLOCK_WIDTH) / 2 + TIME_LABEL_WIDTH,
                    startedX.value + evt.translationX
                );

                if (layout?.width) {
                    panXAbsValue = Math.min(
                        layout.width - (APPOINTMENT_BLOCK_WIDTH) / 2,
                        panXAbsValue
                    );
                }
                panXAbs.value = panXAbsValue;

                // --- Auto-scroll Logic ---
                if (layout) {
                    const AUTO_SCROLL_BUFFER = 30;

                    if (evt.y > layout.height - AUTO_SCROLL_BUFFER) {
                        autoScrollSpeed.value = 1;
                    } else if (evt.y < AUTO_SCROLL_BUFFER) {
                        autoScrollSpeed.value = -1;
                    } else {
                        autoScrollSpeed.value = 0;
                    }

                    if (panXAbs.value >= layout.width - APPOINTMENT_BLOCK_WIDTH / 2) {
                        autoScrollXSpeed.value = 1;
                    } else if (panXAbs.value <= APPOINTMENT_BLOCK_WIDTH / 2 + TIME_LABEL_WIDTH) {
                        autoScrollXSpeed.value = -1;
                    } else {
                        autoScrollXSpeed.value = 0;
                    }
                } else {
                    autoScrollSpeed.value = 0;
                    autoScrollXSpeed.value = 0;
                }
            }
        })
        .onEnd(() => {
            'worklet';
            // Stop any active auto-scrolling
            autoScrollSpeed.value = 0;
            autoScrollXSpeed.value = 0;
            lastXScrollTime.value = 0;

            // --- Final Authoritative Calculation ---
            // Recalculate one last time to get the perfect final grid position.

            // Vertical
            const finalEventTop = (panYAbs.value - (eventHeight.value / 2)) + scrollY.value;
            let adjustedFinalEventTop = Math.round(finalEventTop / snapInterval) * snapInterval;
            adjustedFinalEventTop = Math.max(0, adjustedFinalEventTop); // Enforce final boundary
            const finalPanYValue = (adjustedFinalEventTop - scrollY.value) + (eventHeight.value / 2);

            // Horizontal
            const finalXOnScreen = panXAbs.value;
            const absoluteX = finalXOnScreen + scrollX.value;
            const newStaffIndex = Math.floor((absoluteX - TIME_LABEL_WIDTH) / APPOINTMENT_BLOCK_WIDTH);
            const colIndex = Math.max(0, Math.min(newStaffIndex, columns.length - 1));
            const finalPanXValue = TIME_LABEL_WIDTH + (colIndex * APPOINTMENT_BLOCK_WIDTH) - scrollX.value + (APPOINTMENT_BLOCK_WIDTH / 2);

            // This provides the smooth "snap" effect for both axes.
            panYAbs.value = withSpring(finalPanYValue);
            panXAbs.value = withSpring(finalPanXValue);

            // --- Update State ---
            // Set the final, correct data that will be used by onSave.
            if (!isPulling.value) {
                eventStartedTop.value = adjustedFinalEventTop;
            }

            // Set the starting points for the next drag from the final, snapped position.
            startedY.value = finalPanYValue;
            startedX.value = finalPanXValue;

            isPulling.value = false;
            isDragging.value = false

            scheduleOnRN(finalizeDrag, colIndex, adjustedFinalEventTop, eventHeight.value);
        });

    const scrollListTo = useCallback((x: number) => {
        flashListRef.current?.scrollToOffset({offset: x, animated: false});
    }, []);

    // Auto-scrolling x effect when dragging an appointment on the edge of the screen
    const autoScrollXFrame = useCallback((frameInfo: FrameInfo) => {
        'worklet';
        if (autoScrollXSpeed.value === 0) {
            return;
        }

        const now = frameInfo.timeSinceFirstFrame;
        const scrollInterval = 500; // Time in ms between each scroll jump

        // Check if enough time has passed since the last scroll
        if (now - lastXScrollTime.value > scrollInterval) {
            lastXScrollTime.value = now; // Reset the timer

            // Calculate the increment as one full block width
            const increment = APPOINTMENT_BLOCK_WIDTH * Math.sign(autoScrollXSpeed.value);
            const newScrollX = scrollX.value + increment;

            // Use the Reanimated scrollTo function to jump to the next column
            scheduleOnRN(scrollListTo, newScrollX);
            // Trigger a haptic on each scroll jump
            scheduleOnRN(triggerHaptic, "Medium");
        }
    }, [APPOINTMENT_BLOCK_WIDTH, scrollListTo, triggerHaptic]);

    const autoScrollYFrame = useCallback(() => {
        'worklet';
        // Exit if we are not dragging or not supposed to be scrolling
        if (autoScrollSpeed.value === 0) {
            return;
        }

        // Adjust the divisor to control speed
        const increment = (snapInterval / 5) * Math.sign(autoScrollSpeed.value);
        const newScrollY = scrollY.value + increment;

        // Use the Reanimated scrollTo function to command the scroll view from the UI thread
        scrollTo(verticalScrollViewRef, 0, newScrollY, false);

        // --- Update eventStartedTop with the boundary check ---
        if (isDragging.value) {
            let currentEventTop = (panYAbs.value - (eventHeight.value / 2)) + newScrollY;
            currentEventTop = Math.round(currentEventTop / snapInterval) * snapInterval;
            // top boundary check
            eventStartedTop.value = Math.max(0, currentEventTop);
        }

        if (isPulling.value) {
            // recompute height using saved touchY and the newly scrolled content
            const onScreenTop = eventStartedTop.value - newScrollY;
            const newHeight = touchY.value - onScreenTop;
            const snappedHeight = Math.round(newHeight / snapInterval) * snapInterval;

            let finalHeight = Math.max(hourHeight / 4, snappedHeight);
            const totalDayHeight = 24 * hourHeight;
            const maxAllowedHeight = totalDayHeight - eventStartedTop.value;
            finalHeight = Math.min(finalHeight, maxAllowedHeight);

            if (finalHeight !== eventHeight.value) {
                eventHeight.value = finalHeight;
                panYAbs.value = onScreenTop + (finalHeight / 2);
            }

            if (hourHeight / 4 == finalHeight) {
                autoScrollSpeed.value = 0; // Stop auto-scrolling if height is minimum
            }
        }

        // --- Throttled Haptic Feedback ---
        const scrollDiff = Math.abs(newScrollY - lastHapticScrollY.value);

        if (scrollDiff >= snapInterval) {
            // Update the last position to the current position
            lastHapticScrollY.value = newScrollY;
            scheduleOnRN(triggerHaptic, "Medium");
        }
    }, [snapInterval, hourHeight, triggerHaptic]);

    // Start both frame callbacks inactive and only run them while an event is
    // selected — otherwise they tick on every single frame for the whole
    // lifetime of the calendar just to read a shared value and bail out.
    const autoScrollXCallback = useFrameCallback(autoScrollXFrame, false);
    const autoScrollYCallback = useFrameCallback(autoScrollYFrame, false);

    useEffect(() => {
        const active = !!selectedEvent;
        autoScrollXCallback.setActive(active);
        autoScrollYCallback.setActive(active);
    }, [selectedEvent, autoScrollXCallback, autoScrollYCallback]);

    useEffect(() => {
        internalOnLongPress.current = (event: Event) => {
            onLongPressRef.current?.(event);

            // Locked event -> notify the consumer above, then stop before any
            // selection/drag state is touched.
            if (isEventLockedRef.current?.(event)) return;

            // --- Compute vertical placement ---
            const hh = hourHeightRef.current;
            const eventTop = scalePosition(event.from, hh);
            const eventTo = event.to < event.from ? event.to + 1440 : event.to; // handle events that span past midnight
            const initialHeight = scalePosition(eventTo - event.from, hh);
            const panAbsValue = (eventTop - scrollY.value) + (initialHeight / 2);

            panYAbs.value = panAbsValue;
            startedY.value = panAbsValue;
            eventStartedTop.value = eventTop;

            // --- Compute horizontal placement ---
            const resources = resourcesRef.current;
            const days = daysRef.current;
            const APPOINTMENT_BLOCK_WIDTH = apptWidthRef.current;
            const isMultiDay = isMultiDayRef.current;
            let absoluteColIndex: number;

            if (!isMultiDay) {
                // day mode → column represents a resource
                absoluteColIndex = findResourceIndexFor(event.resourceId, resources?.map(r => r.id));
            } else {
                // multi-day → column represents a day
                absoluteColIndex = findDayIndexFor(event.date, days);
            }

            // Use exact scrollX (not floored) so fractional scroll offsets don't
            // shift the ghost to the wrong column.
            const selectedAppointmentStartedX =
                TIME_LABEL_WIDTH +
                APPOINTMENT_BLOCK_WIDTH * absoluteColIndex +
                APPOINTMENT_BLOCK_WIDTH / 2 -
                scrollX.value;

            panXAbs.value = selectedAppointmentStartedX;
            startedX.value = selectedAppointmentStartedX;

            // --- Initialize state ---
            lastHapticScrollY.value = scrollY.value;
            eventHeight.value = initialHeight;
            hasSelectedEvent.value = true; // set before setSelectedEvent so the worklet sees it immediately
            setSelectedEvent(event);
            // Populate the draft immediately so it's never null when the action bar is
            // visible. finalizeDrag will overwrite this with the final snapped values
            // once the gesture ends; this just closes the race window where the user
            // taps Save before scheduleOnRN(finalizeDrag) has had a chance to run.
            setDraggedEventDraft({
                event,
                from: positionToMinutes(eventTop, hh),
                to: positionToMinutes(eventTop + initialHeight, hh),
                resourceId: event.resourceId,
                date: event.date,
            });
            // 4) now allow React to mount the overlay next tick
            requestAnimationFrame(() => setDragReady(true));
            triggerHapticRef.current("Medium");
        };
    }, []); // runs once; reads fresh values via refs

    const internalStableOnLongPress = useCallback((e: Event) => {
        internalOnLongPress.current?.(e);
    }, []);

    const onLayout = useCallback((evt: LayoutChangeEvent) => {
        setLayout(evt?.nativeEvent?.layout);
    }, []);

    const verticalScrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollY.value = event?.contentOffset?.y;
        },
    });

    // UI-thread settle watch: while a fling is in progress, sample scrollX once per UI
    // frame and declare the list settled as soon as it is visually still (see
    // FLING_SETTLE_*). `useFrameCallback` runs exactly once per frame; a
    // requestAnimationFrame loop inside a worklet did NOT — successive callbacks ran
    // back-to-back within one frame and declared "stable" instantly. Started from
    // onFlingStart and stopped from onFlingEnd, both on the JS thread; MomentumEnd and
    // the fallback timer remain as safety nets.
    const settleWatchPrev = useSharedValue(0);
    const settleWatchStable = useSharedValue(0);
    const settleWatch = useFrameCallback(() => {
        'worklet';
        const x = scrollX.value || 0;
        settleWatchStable.value = Math.abs(x - settleWatchPrev.value) < FLING_SETTLE_PX_PER_FRAME
            ? settleWatchStable.value + 1
            : 0;
        settleWatchPrev.value = x;

        if (settleWatchStable.value >= FLING_SETTLE_STABLE_FRAMES) {
            settleWatchStable.value = 0;
            scheduleOnRN(onFlingEnd);
        }
    }, false);
    settleWatchRef.current = {
        frame: settleWatch,
        prev: settleWatchPrev,
        stable: settleWatchStable,
        scrollX,
        columnWidth: APPOINTMENT_BLOCK_WIDTH,
        numberOfColumns,
    };

    const flashListScrollHandler = useAnimatedScrollHandler(
        Object.assign(
            {
                onScroll: (event: any) => {
                    'worklet';
                    const offsetX = event?.contentOffset?.x;
                    // ColumnSeparators and HatchLayer follow scrollX in every mode; only the
                    // header avatar row is day-mode only.
                    scrollX.value = offsetX;
                    if (!isMultiDay) {
                        // Sync header without going through JS
                        scrollTo(headerScrollViewRef, offsetX, 0, false);
                    }
                },
            },
            Platform.OS === 'android' ? {
                // Android only. Registering these keys is what makes Reanimated ask the
                // native ScrollView for momentum events (sendMomentumEvents); iOS mounts a
                // column within the frame, so there is nothing to gate. The finger leaving
                // the screen is the reliable signal (RN Android emits onScrollEndDrag on
                // every ACTION_UP while dragging); MomentumBegin additionally covers
                // programmatic flings. Both are idempotent on the JS side.
                onEndDrag: () => {
                    'worklet';
                    scheduleOnRN(onFlingStart);
                },
                onMomentumBegin: () => {
                    'worklet';
                    scheduleOnRN(onFlingStart);
                },
                onMomentumEnd: () => {
                    'worklet';
                    scheduleOnRN(onFlingEnd);
                },
            } : null
        ),
        [isMultiDay, onFlingStart, onFlingEnd]
    );

    const handleBlockLongPress = useCallback((resourceId: number, time: string) => {
        triggerHaptic("Medium");
        const resource = resources.find(r => r.id === resourceId);

        if (onBlockLongPress)
            onBlockLongPress(resource!, new Date(time))
    }, [resources, onBlockLongPress]);

    const handleBlockPress = useCallback((resourceId: number, time: string) => {
        triggerHaptic("Medium");
        const resource = resources.find(r => r.id === resourceId);

        if (onBlockTap)
            onBlockTap(resource!, new Date(time))
    }, [resources, onBlockTap]);

    // Stable wrappers so `renderItem` doesn't need these in its deps (which would
    // rebuild it on every `resources` change). The refs guarantee the latest
    // `resources` lookup at press time even though the wrapper identity is frozen.
    const handleBlockPressRef = useRef(handleBlockPress);
    handleBlockPressRef.current = handleBlockPress;
    const stableHandleBlockPress = useCallback(
        (resourceId: number, time: string) => handleBlockPressRef.current(resourceId, time),
        []
    );
    const handleBlockLongPressRef = useRef(handleBlockLongPress);
    handleBlockLongPressRef.current = handleBlockLongPress;
    const stableHandleBlockLongPress = useCallback(
        (resourceId: number, time: string) => handleBlockLongPressRef.current(resourceId, time),
        []
    );

    useEffect(() => {
        const handleOrientationChange = () => {
            if (selectedEvent) {
                setSelectedEvent(null);
                setDragReady(false);
                // setLayout(null);
            }
        };

        const subscription = Dimensions.addEventListener('change', handleOrientationChange);

        return () => {
            subscription.remove();
        };
    }, [setSelectedEvent, selectedEvent, setDragReady]);

    const columnCount = !isMultiDay ? resourceIds.length : columns.length;

    // Shared hatch layer: see HatchLayer. Bindings without the day-wide selector fall
    // back to per-cell hatching.
    const useHatchByDay = binding.useDisabledIntervalsByDay ?? useNoopBindingHook;
    const hatchByDay = useHatchByDay(isMultiDay);
    const hatchCommon = useHatchCommon(hatchByDay, columns, activeResourceId ?? resourceIds[0]);

    const renderItem = useCallback(({item, index}: any) => {
        // Resolve which date & resource this column represents:
        const rid = !isMultiDay
            ? item
            : (activeResourceId ?? resourceIds[0]);           // multi-day uses the single active resource

        const dayDate = !isMultiDay
            ? undefined                            // day mode uses the single base day (existing)
            : (item as Extract<CalendarColumn, { kind: 'day' }>).dayDate;

        return (
            <ColumnCell
                key={index}
                rid={rid!}
                dayDate={dayDate}
                dateRef={dateRef}
                hourHeight={hourHeight}
                APPOINTMENT_BLOCK_WIDTH={APPOINTMENT_BLOCK_WIDTH}
                onBlockPress={stableHandleBlockPress}
                onBlockLongPress={stableHandleBlockLongPress}
                onDisabledBlockPress={stableOnDisabledBlockPress}
                tapThrough={props.disabledBlocksTapThrough}
                onPress={stableOnPress}
                onLongPress={internalStableOnLongPress}
                isEventSelected={isEventSelectedStable}
                isEventDisabled={isEventDisabledStable}
                eventRenderer={effectiveRenderer}
                mode={overLappingLayoutMode}
                scrollState={listScrollState}
                columnIndex={index}
                numberOfColumns={numberOfColumns}
                scrollX={scrollX}
            />
        );
    }, [
        numberOfColumns,
        scrollX,
        listScrollState,
        isMultiDay,
        activeResourceId,
        resourceIds,
        APPOINTMENT_BLOCK_WIDTH,
        hourHeight,
        effectiveRenderer,
        isEventSelectedStable,
        isEventDisabledStable,
        overLappingLayoutMode,
        stableOnPress,
        internalStableOnLongPress,
        stableOnDisabledBlockPress,
        stableHandleBlockPress,
        stableHandleBlockLongPress,
        props.disabledBlocksTapThrough,
    ]);

    // FlashList only re-runs `renderItem` for mounted cells when `data` or
    // `extraData` change — NOT when `renderItem`'s identity changes. So fold every
    // identity that affects a cell's output into `extraData`; otherwise a predicate
    // or renderer change rebuilds `renderItem` but the visible columns keep showing
    // their memoized output until some unrelated re-render happens.
    const listExtraData = useMemo(
        () => ({
            numberOfColumns,
            width,
            hourHeight,
            stacked: overLappingLayoutMode === 'stacked',
            isEventSelectedStable,
            isEventDisabledStable,
            effectiveRenderer,
            disabledBlocksTapThrough: props.disabledBlocksTapThrough,
        }),
        [
            numberOfColumns,
            width,
            hourHeight,
            overLappingLayoutMode,
            isEventSelectedStable,
            isEventDisabledStable,
            effectiveRenderer,
            props.disabledBlocksTapThrough,
        ]
    );

    return <HatchCommonContext.Provider value={hatchCommon}>
        <StoreFeeder resources={resources} store={binding} baseDate={date}/>
        <View style={{flex: 1}}>
            {
                !isMultiDay ? <View key={`header-${numberOfColumns}-${width}`}>
                        <Animated.ScrollView
                            style={{backgroundColor: "white"}}
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{
                                overflow: "visible",
                                paddingLeft: TIME_LABEL_WIDTH,
                                paddingVertical: 15,
                            }}
                            horizontal
                            scrollEventThrottle={16}
                            decelerationRate="fast"
                            ref={headerScrollViewRef}
                            scrollEnabled={false}
                        >
                            <ResourcesComponent
                                date={date}
                                resourceIds={resourceIds}
                                APPOINTMENT_BLOCK_WIDTH={APPOINTMENT_BLOCK_WIDTH}
                                onResourcePress={onResourcePress}
                                slots={resourceSlots}
                            />
                        </Animated.ScrollView>
                    </View>
                    : <DaysComponent
                        APPOINTMENT_BLOCK_WIDTH={APPOINTMENT_BLOCK_WIDTH}
                        date={date}
                        mode={mode}
                        activeResourceId={activeResourceId ?? resourceIds[0]}
                        onResourcePress={onResourcePress}
                        slots={resourceSlots}
                    />
            }
            <GestureDetector gesture={panGesture}>
                <Animated.View
                    key={numberOfColumns + width + hourHeight}
                    onLayout={onLayout}
                    style={{
                        flex: 1,
                        overflow: "hidden"
                    }}
                >
                    {selectedEvent && <View style={{
                        position: 'absolute',
                        top: 0,
                        left: TIME_LABEL_WIDTH,
                        paddingLeft: TIME_LABEL_WIDTH,
                        width: (layout?.width ?? width) - TIME_LABEL_WIDTH,
                        height: '100%',
                        backgroundColor: 'rgba(0, 0, 0, 0.1)',
                        zIndex: 1,
                    }}/>}
                    <Animated.ScrollView
                        scrollEnabled={!selectedEvent}
                        onScroll={verticalScrollHandler}
                        ref={verticalScrollViewRef} // Ref for vertical scrolling
                        scrollEventThrottle={16}
                        scrollsToTop={scrollsToTop}
                        snapToInterval={hourHeight}
                        decelerationRate="fast"
                        snapToAlignment="start"  // Align the column to the start
                        style={styles.container}
                        contentContainerStyle={{flexDirection: 'row', paddingRight: TIME_LABEL_WIDTH}}
                    >
                        {/* Never wider than the real columns: with fewer resources than
                            slots the area to the right stays white, as it did when the
                            grid was drawn per cell. */}
                        <GridBackdrop
                            width={APPOINTMENT_BLOCK_WIDTH * Math.min(numberOfColumns, columnCount)}
                            hourHeight={hourHeight}
                        />
                        <ColumnSeparators
                            columnWidth={APPOINTMENT_BLOCK_WIDTH}
                            numberOfColumns={numberOfColumns}
                            columnCount={columnCount}
                            hourHeight={hourHeight}
                            scrollX={scrollX}
                        />
                        <HatchLayer
                            width={APPOINTMENT_BLOCK_WIDTH * Math.min(numberOfColumns, columnCount)}
                            hourHeight={hourHeight}
                            scrollX={scrollX}
                            common={hatchCommon}
                        />
                        <TimeLabels
                            startMinutes={startMinutes}
                            layout={layout}
                            hourHeight={hourHeight}
                            totalTimelineWidth={APPOINTMENT_BLOCK_WIDTH * numberOfColumns}
                            timezone={timezone}
                            date={date}
                            ref={verticalScrollViewRef}
                        />
                        <AnimatedFlashList
                            extraData={listExtraData}
                            scrollEnabled={!selectedEvent}
                            ref={flashListRef}
                            onScroll={flashListScrollHandler}  // Sync with header
                            data={!isMultiDay ? resourceIds : columns}
                            horizontal={true}
                            // FlashList 2.x splits 2 * drawDistance by scroll direction
                            // (EngagedIndicesTracker: 0.7 ahead, 0.3 behind). d = W keeps
                            // exactly one column mounted ahead (1.4 W) and none behind
                            // (0.6 W). Widening it to cover the column behind (d = W / 0.6)
                            // was tried on a 70-staff store: the 2.3-column forward buffer
                            // made a hard fling mount cells non-stop and the scroll
                            // stuttered. A swipe back therefore lands on a cell that mounts
                            // its frame at once and its cards when the fling settles
                            // (ColumnCell), which is the cheaper trade on a low-end phone.
                            drawDistance={APPOINTMENT_BLOCK_WIDTH}
                            renderItem={renderItem}
                            keyExtractor={(item, index) => index + ""}
                            snapToInterval={APPOINTMENT_BLOCK_WIDTH}
                            decelerationRate="fast"
                            snapToAlignment="start"  // Align the column to the start
                        />
                    </Animated.ScrollView>
                    {
                        selectedEvent && dragReady &&
                        <DraggableEvent
                            selectedEvent={selectedEvent}
                            APPOINTMENT_BLOCK_WIDTH={APPOINTMENT_BLOCK_WIDTH}
                            hourHeight={hourHeight}
                            eventStartedTop={eventStartedTop}
                            eventHeight={eventHeight}
                            panXAbs={panXAbs}
                            panYAbs={panYAbs}
                            slots={props.eventSlots}
                            styleOverrides={props.eventStyleOverrides}
                        />
                    }
                </Animated.View>
            </GestureDetector>
        </View>
    </HatchCommonContext.Provider>
});

const Calendar: React.FC<CalendarProps> = React.memo(({theme, ...rest}) => {
    return (
        <CalendarThemeProvider theme={theme}>
            <CalendarInner {...rest} />
        </CalendarThemeProvider>
    );
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
});

export default Calendar;

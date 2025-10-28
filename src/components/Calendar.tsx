import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Gesture, GestureDetector} from "react-native-gesture-handler";
import Animated, {
    runOnJS,
    scrollTo,
    useAnimatedRef,
    useAnimatedScrollHandler,
    useFrameCallback,
    useSharedValue,
    withSpring
} from "react-native-reanimated";
import {Dimensions, LayoutChangeEvent, Platform, StyleSheet, useWindowDimensions, View} from "react-native";
import {FlashList} from "@shopify/flash-list";
import * as Haptics from "expo-haptics";
import {positionToMinutes, scalePosition, TIME_LABEL_WIDTH} from '@/utilities/helpers';
import {TimeLabels} from './TimeLabels';
import {ResourcesComponent} from "./ResourcesComponent";
import {EventGridBlocksSkia} from "./EventGridBlocks";
import {CalendarTheme, DisabledBlock, DisabledInterval, Event, LayoutMode, Resource} from '@/types/calendarTypes';
import {StoreFeeder} from '@/store/StoreFeeder';
import {useCalendarBinding} from '@/store/bindings/BindingProvider';
import DisabledIntervals from './DisabledIntervals';
import DisabledBlocks from './DisabledBlocks';
import EventBlock, {EventRenderer, EventSlots, StyleOverrides} from "@/components/EventBlock";
import {DraggableEvent} from "@/components/DraggableEvent";
import {CalendarThemeProvider} from "@/theme/ThemeContext";
import EventBlocks from "@/components/EventBlocks";

type FlagFn = (event: Event) => boolean;

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
    onDisabledBlockPress?: (block: DisabledBlock) => void;
    onEventPress?: (event: Event) => void;
    onEventLongPress?: (event: Event) => void;
    eventSlots?: EventSlots;
    eventStyleOverrides?:
        | StyleOverrides
        | ((event: Event) => StyleOverrides | undefined);
    isEventSelected?: FlagFn;
    isEventDisabled?: FlagFn;

    theme?: CalendarTheme;
    overLappingLayoutMode?: LayoutMode;
}

type Layout = {
    x: number;
    y: number;
    width: number;
    height: number;
};

const AnimatedFlashList = Animated.createAnimatedComponent(FlashList);

const CalendarInner: React.FC<CalendarProps> = (props) => {
    const {width} = useWindowDimensions();
    const isIOS = Platform.OS === 'ios';
    const binding = useCalendarBinding();

    const {
        date,
        numberOfColumns = 3,
        startMinutes,
        hourHeight = 120,
        snapIntervalInMinutes = 5,
        timezone = Intl?.DateTimeFormat()?.resolvedOptions()?.timeZone,
        resources,
        onResourcePress,
        onBlockLongPress,
        onEventPress,
        onEventLongPress,
        onDisabledBlockPress,
        eventSlots,
        eventStyleOverrides,
        overLappingLayoutMode = 'stacked',
    } = props;

    const snapInterval = (hourHeight / 60) * snapIntervalInMinutes;
    const onPressRef = React.useRef(onEventPress);
    const onLongPressRef = React.useRef(onEventLongPress);
    const internalOnLongPress = useRef<((e: Event) => void) | null>(null);
    const onDisabledBlockPressRef = React.useRef(onDisabledBlockPress);
    const selectedRef = useRef<FlagFn | undefined>(props.isEventSelected);
    const disabledRef = useRef<FlagFn | undefined>(props.isEventDisabled);

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
        (ev) => (selectedRef.current ? selectedRef.current(ev) : false), []);

    const isEventDisabledStable = useCallback<FlagFn>(
        (ev) => (disabledRef.current ? disabledRef.current(ev) : false), []);

    // Keep refs up to date
    useEffect(() => {
        onPressRef.current = onEventPress;
    }, [onEventPress]);

    useEffect(() => {
        onLongPressRef.current = onEventLongPress;
    }, [onEventLongPress]);

    useEffect(() => {
        onDisabledBlockPressRef.current = onDisabledBlockPress;
    }, [onDisabledBlockPress]);

    useEffect(() => {
        rendererRef.current = effectiveRenderer;
    }, [effectiveRenderer]);

    useEffect(() => {
        selectedRef.current = props.isEventSelected;
    }, [props.isEventSelected]);

    useEffect(() => {
        disabledRef.current = props.isEventDisabled;
    }, [props.isEventDisabled]);

    const rendererRef = useRef<EventRenderer>(effectiveRenderer);
    const stableRenderer = useCallback<EventRenderer>((p) => rendererRef.current(p), []);

    const stableOnPress = React.useCallback((e: Event) => onPressRef.current?.(e), []);
    const stableOnDisabledBlockPress = React.useCallback((b: DisabledBlock) => onDisabledBlockPressRef.current?.(b), []);

    const {useGetSelectedEvent, useSetSelectedEvent, useSetDraggedEventDraft, useGetDraggedEventDraft} =
        useCalendarBinding();
    const selectedEvent = useGetSelectedEvent();
    const setSelectedEvent = useSetSelectedEvent();
    const setDraggedEventDraft = useSetDraggedEventDraft();

    const APPOINTMENT_BLOCK_WIDTH = (width - TIME_LABEL_WIDTH) / numberOfColumns;

    const hourHeightRef = useRef(hourHeight);
    const resourcesRef = useRef(resources);
    const apptWidthRef = useRef(APPOINTMENT_BLOCK_WIDTH);

    useEffect(() => {
        hourHeightRef.current = hourHeight
    }, [hourHeight]);
    useEffect(() => {
        resourcesRef.current = resources
    }, [resources]);
    useEffect(() => {
        apptWidthRef.current = APPOINTMENT_BLOCK_WIDTH
    }, [APPOINTMENT_BLOCK_WIDTH]);
    useEffect(() => {
        if (!selectedEvent) {
            setDraggedEventDraft(null);
        }
    }, [selectedEvent]);

    const verticalScrollViewRef = useAnimatedRef<Animated.ScrollView>();
    const headerScrollViewRef = useAnimatedRef<Animated.ScrollView>();

    const flashListRef = useRef<FlashList<any>>(null);
    const prevResourceIdsRef = useRef<(number)[]>([]);
    const [layout, setLayout] = useState<Layout | null>(null);

    const dateRef = useRef(date); // Store `date` in a ref to prevent re-renders

    const eventStartedTop = useSharedValue(0);
    const eventHeight = useSharedValue(0);

    const panXAbs = useSharedValue(0);
    const panYAbs = useSharedValue(0);
    const isPulling = useSharedValue(false);
    const isDragging = useSharedValue(false);

    const scrollX = useSharedValue(0);
    const scrollY = useSharedValue(0);
    const autoScrollSpeed = useSharedValue(0);
    const autoScrollXSpeed = useSharedValue(0);
    const lastHapticScrollY = useSharedValue(0);
    const lastXScrollTime = useSharedValue(0);

    const startedX = useSharedValue(0);
    const startedY = useSharedValue(0);
    const touchY = useSharedValue(0); // NEW

    const triggerHaptic = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, []);

    const panGesture = Gesture.Pan()
        .manualActivation(!isIOS)
        .enabled(layout !== null)
        .shouldCancelWhenOutside(false)
        .onTouchesMove((_evt, stateManager) => {
            if (isIOS) return;
            if (selectedEvent)
                stateManager.activate();
            else stateManager.end();
        })
        .onUpdate((evt) => {
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
                    runOnJS(triggerHaptic)();
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
                    runOnJS(triggerHaptic)();
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
            const clampedStaffIndex = Math.max(0, Math.min(newStaffIndex, resources.length - 1));
            const endedResource = resources[clampedStaffIndex];
            const finalPanXValue = TIME_LABEL_WIDTH + (clampedStaffIndex * APPOINTMENT_BLOCK_WIDTH) - scrollX.value + (APPOINTMENT_BLOCK_WIDTH / 2);

            // --- Animate to Final Resting Place ---
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

            runOnJS(setDraggedEventDraft)({
                event: selectedEvent!,
                from: positionToMinutes(adjustedFinalEventTop, hourHeight),
                to: positionToMinutes(adjustedFinalEventTop + eventHeight.value, hourHeight),
                resourceId: endedResource?.id!
            });
        });

    const scrollListTo = (x: number) => {
        flashListRef.current?.scrollToOffset({offset: x, animated: false});
    };

    // Auto-scrolling x effect when dragging an appointment on the edge of the screen
    useFrameCallback((frameInfo) => {
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
            runOnJS(scrollListTo)(newScrollX);
            // Trigger a haptic on each scroll jump
            runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
        }
    });

    useFrameCallback(() => {
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
            runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
        }
    });

    useEffect(() => {
        internalOnLongPress.current = (event: Event) => {
            onLongPressRef.current?.(event);

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
            const APPOINTMENT_BLOCK_WIDTH = apptWidthRef.current;
            const staffIndex = resources.findIndex(r => r.id === event.resourceId);
            const leftmostColumnIndex = Math.round(scrollX.value / APPOINTMENT_BLOCK_WIDTH);
            const screenColumn = staffIndex - leftmostColumnIndex;
            const selectedAppointmentStartedX =
                TIME_LABEL_WIDTH +
                APPOINTMENT_BLOCK_WIDTH / 2 +
                APPOINTMENT_BLOCK_WIDTH * screenColumn;

            panXAbs.value = selectedAppointmentStartedX;
            startedX.value = selectedAppointmentStartedX;

            // --- Initialize state ---
            lastHapticScrollY.value = scrollY.value;
            eventHeight.value = initialHeight;
            setSelectedEvent(event);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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

    const flashListScrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            const offsetX = event?.contentOffset?.x;
            // Sync header without going through JS
            scrollTo(headerScrollViewRef, offsetX, 0, false);
            scrollX.value = offsetX;
        },
    });

    const resourceIds = useMemo(() => {
        const ids = resources?.map(item => item?.id) || [];
        if (JSON.stringify(prevResourceIdsRef.current) !== JSON.stringify(ids)) {
            prevResourceIdsRef.current = ids;
        }
        return prevResourceIdsRef.current;
    }, [resources]);

    const handleBlockPress = useCallback((resourceId: number, time: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const resource = resources.find(r => r.id === resourceId);

        if (onBlockLongPress)
            onBlockLongPress(resource!, new Date(time))
    }, [resources, onBlockLongPress]);

    useEffect(() => {
        const handleOrientationChange = () => {
            if (selectedEvent)
                setSelectedEvent(null);
        };

        const subscription = Dimensions.addEventListener('change', handleOrientationChange);

        return () => {
            subscription.remove();
        };
    }, [setSelectedEvent, selectedEvent]);

    useEffect(() => {
        dateRef.current = date; // Update the ref whenever date prop changes
    }, [date]);

    const renderItem = useCallback(({item}: any) => {
        return (
            <View key={item} style={{width: APPOINTMENT_BLOCK_WIDTH}}>
                {/* Add 15-minute background blocks for each user column */}
                <View style={styles.timelineContainer}>
                    <EventGridBlocksSkia
                        dateRef={dateRef}
                        hourHeight={hourHeight}
                        APPOINTMENT_BLOCK_WIDTH={APPOINTMENT_BLOCK_WIDTH}
                        handleBlockPress={(date) => handleBlockPress(item, date)}
                    />
                    <DisabledIntervals
                        id={item}
                        APPOINTMENT_BLOCK_WIDTH={APPOINTMENT_BLOCK_WIDTH}
                        hourHeight={hourHeight}
                    />
                    <DisabledBlocks
                        id={item}
                        APPOINTMENT_BLOCK_WIDTH={APPOINTMENT_BLOCK_WIDTH}
                        hourHeight={hourHeight}
                        onDisabledBlockPress={stableOnDisabledBlockPress}
                    />
                    <EventBlocks
                        id={item}
                        EVENT_BLOCK_WIDTH={APPOINTMENT_BLOCK_WIDTH}
                        hourHeight={hourHeight}
                        onPress={stableOnPress}
                        onLongPress={internalStableOnLongPress}
                        isEventSelected={isEventSelectedStable}
                        isEventDisabled={isEventDisabledStable}
                        eventRenderer={stableRenderer}
                        mode={overLappingLayoutMode}
                    />
                </View>
            </View>
        );
    }, [resourceIds, APPOINTMENT_BLOCK_WIDTH, hourHeight,
        stableRenderer,
        isEventSelectedStable,
        isEventDisabledStable,
        overLappingLayoutMode,
        stableOnPress, internalStableOnLongPress, stableOnDisabledBlockPress, dateRef]);

    return <>
        <StoreFeeder resources={resources} store={binding}/>
        <View style={{flex: 1}}>
            <View>
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
                        resourceIds={resourceIds}
                        APPOINTMENT_BLOCK_WIDTH={APPOINTMENT_BLOCK_WIDTH}
                        onResourcePress={onResourcePress}
                    />
                </Animated.ScrollView>
            </View>
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
                        width: width - TIME_LABEL_WIDTH,
                        height: '100%',
                        backgroundColor: 'rgba(0, 0, 0, 0.1)',
                        zIndex: 1,
                    }}/>}
                    <Animated.ScrollView
                        scrollEnabled={!selectedEvent}
                        onScroll={verticalScrollHandler}
                        ref={verticalScrollViewRef} // Ref for vertical scrolling
                        scrollEventThrottle={16}
                        snapToInterval={hourHeight}
                        decelerationRate="fast"
                        snapToAlignment="start"  // Align the column to the start
                        style={styles.container}
                        contentContainerStyle={{flexDirection: 'row', paddingRight: TIME_LABEL_WIDTH}}
                    >
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
                            extraData={numberOfColumns + width + hourHeight + (overLappingLayoutMode === 'stacked' ? 1 : 0)}
                            scrollEnabled={!selectedEvent}
                            ref={flashListRef}
                            onScroll={flashListScrollHandler}  // Sync with header
                            estimatedItemSize={APPOINTMENT_BLOCK_WIDTH}
                            removeClippedSubviews={true}
                            data={resourceIds}
                            horizontal={true}
                            renderItem={renderItem}
                            keyExtractor={(item, index) => index + ""}
                            snapToInterval={APPOINTMENT_BLOCK_WIDTH}
                            decelerationRate="fast"
                            snapToAlignment="start"  // Align the column to the start
                        />
                    </Animated.ScrollView>
                    {
                        selectedEvent &&
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
    </>
}

const Calendar: React.FC<CalendarProps> = ({theme, ...rest}) => {
    return (
        <CalendarThemeProvider theme={theme}>
            <CalendarInner {...rest} />
        </CalendarThemeProvider>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    timelineContainer: {
        borderColor: '#ddd',
        borderRightWidth: 1,
        position: 'relative',
        height: "100%",
    }
});

export default Calendar;

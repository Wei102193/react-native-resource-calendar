// @flow
import * as React from 'react';
import {useEffect, useMemo, useRef, useState} from 'react';
import {InteractionManager, StyleSheet, Text, TextStyle, View} from "react-native";
import {
    getCurrentTimeInMinutes,
    getTextSize,
    indexToDate,
    TIME_LABEL_WIDTH,
    timeToYPosition
} from "@/utilities/helpers";
import {format, isSameDay} from "date-fns";
import {toZonedTime} from "date-fns-tz";
import Col from './common/layout/Col';
import {useResolvedFont} from "@/theme/ThemeContext";

type Props = {
    timezone: string;
    layout: any;
    hourHeight?: number;
    startMinutes?: number;
    totalTimelineWidth: number;
    date: Date;
};

// `indexToDate` uses a fixed base day, so the 24 labels never change. Building
// them meant 48 date-fns `format` calls on every render of the time column.
let HOUR_LABELS: string[][] | null = null;
const getHourLabels = (): string[][] => {
    if (!HOUR_LABELS) {
        HOUR_LABELS = Array.from({length: 24}, (_, index) => indexToDate(index).split(" "));
    }
    return HOUR_LABELS;
};

const msUntilNextMinute = () => 60_000 - (Date.now() % 60_000);

const msUntilNextLocalMidnight = () => {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
    return Math.max(1000, next.getTime() - now.getTime());
};

export const TimeLabels = React.memo(React.forwardRef(({
                                                           timezone,
                                                           hourHeight = 120,
                                                           startMinutes = 0,
                                                           totalTimelineWidth,
                                                           date,
                                                           layout
                                                       }: Props, ref: any) => {
    const [tick, forceTick] = useState(0);
    // Check if the selected date is today
    const isToday = isSameDay(new Date(), date);

    // The two states below exist only to trigger a re-render on each minute tick;
    // the values actually drawn are derived here at render time. The ticker stops
    // while another day is on screen, so state alone would paint a stale position
    // for one frame when switching back to today.
    const [, setCurrentTimeYPosition] = useState(0);
    const [, setCurrentTime] = useState<string>('');
    const currentTimeYPosition = isToday ? timeToYPosition(getCurrentTimeInMinutes(timezone), hourHeight) : 0;
    const currentTime = isToday ? format(toZonedTime(new Date(), timezone), 'h:mm') : '';

    const APPOINTMENT_BLOCK_HEIGHT = hourHeight / 4;

    const titleFace = useResolvedFont({fontWeight: '700'});

    useEffect(() => {
        if (!isToday) {
            // Nothing to tick for another day. Re-render once at midnight so a view
            // of "tomorrow" turns into today on its own.
            const midnightId = setTimeout(() => forceTick(n => n + 1), msUntilNextLocalMidnight());
            return () => clearTimeout(midnightId);
        }

        const update = () => {
            setCurrentTime(format(toZonedTime(new Date(), timezone), 'h:mm'));
            setCurrentTimeYPosition(timeToYPosition(getCurrentTimeInMinutes(timezone), hourHeight));
        };

        update();

        // The label and the line are minute-granular; align to the minute boundary
        // instead of re-rendering the whole time column once a second.
        let intervalId: ReturnType<typeof setInterval> | null = null;
        const timeoutId = setTimeout(() => {
            update();
            intervalId = setInterval(update, 60_000);
        }, msUntilNextMinute());

        return () => {
            clearTimeout(timeoutId);
            if (intervalId) clearInterval(intervalId);
        };
    }, [timezone, hourHeight, isToday, tick]);

    const lastScrolledDateRef = useRef<any>(null); // store a key for the last date we scrolled to

    useEffect(() => {
        if (!layout) return;

        // If `date` is a Date object, use getTime() or toDateString()
        const dateKey = date.getTime();

        // If we already scrolled for this date, skip
        if (lastScrolledDateRef.current === dateKey) return;

        InteractionManager.runAfterInteractions(() => {
            // Read the clock directly: the ticker above only runs while today is on
            // screen, so on the way back to today its last value can be minutes old.
            let pos = isToday
                ? timeToYPosition(getCurrentTimeInMinutes(timezone), hourHeight) - 240
                : timeToYPosition(startMinutes, hourHeight);

            if (ref.current) {
                ref.current.scrollTo({
                    y: Math.round(pos / APPOINTMENT_BLOCK_HEIGHT) * APPOINTMENT_BLOCK_HEIGHT,
                    animated: true,
                });

                // Remember that we've scrolled for this specific date
                lastScrolledDateRef.current = dateKey;
            }
        });
    }, [layout, date, isToday, APPOINTMENT_BLOCK_HEIGHT, startMinutes, hourHeight, timezone]);

    const labelStyle = useMemo<TextStyle>(() => ({
        textAlign: "center",
        fontFamily: titleFace,
        fontSize: getTextSize(hourHeight),
        fontWeight: '700'
    }), [titleFace, hourHeight]);

    const hourLabels = getHourLabels();

    return (
        <>
            <Col>
                {/* Time labels */}
                {hourLabels.map(([hour, meridiem], index) => (
                    <View key={index} style={[styles.timeLabel, {height: hourHeight}]}>
                        <Text allowFontScaling={false} style={labelStyle}>
                            {hour}
                        </Text>
                        <Text allowFontScaling={false} style={labelStyle}>
                            {meridiem}
                        </Text>
                    </View>
                ))}
                {isToday && <View style={[styles.currentTime, {
                    top: currentTimeYPosition - 13,
                    width: TIME_LABEL_WIDTH,
                }]}>
                    <Text
                        allowFontScaling={false}
                        style={{
                            textAlign: "center",
                            fontFamily: titleFace,
                            fontWeight: '700',
                            fontSize: getTextSize(hourHeight),
                            color: "red"
                        }}
                    >{currentTime}</Text>
                </View>}
            </Col>
            {/* Render the red line for current time */}
            {isToday && <View style={[styles.currentTimeLine, {
                pointerEvents: "none",
                top: currentTimeYPosition,
                width: totalTimelineWidth,
                left: TIME_LABEL_WIDTH
            }]}/>}
        </>
    );
}));

const styles = StyleSheet.create({
    timeLabel: {
        width: TIME_LABEL_WIDTH,
    },
    currentTimeLine: {
        position: 'absolute',
        height: 2,  // Thickness of the line
        backgroundColor: 'red',
        zIndex: 10000,  // Ensure it's on top of all other elements
    },
    currentTime: {
        backgroundColor: '#fff',
        borderColor: "red",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 2,
        borderRadius: 20,
        height: 26,
        position: 'absolute',
        zIndex: 10000,  // Ensure it's on top of all other elements
    },
});

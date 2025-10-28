// @flow
import * as React from 'react';
import {useEffect, useState} from 'react';
import {InteractionManager, StyleSheet, Text, View} from "react-native";
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
export const TimeLabels = React.forwardRef(({
                                                timezone,
                                                hourHeight = 120,
                                                startMinutes = 0,
                                                totalTimelineWidth,
                                                date,
                                                layout
                                            }: Props, ref: any) => {
    // Check if the selected date is today
    const isToday = isSameDay(new Date(), date);
    // Function to update the current time's Y position
    // State to store the current Y-position of the red line
    const [currentTimeYPosition, setCurrentTimeYPosition] = useState(timeToYPosition(getCurrentTimeInMinutes(timezone), hourHeight));
    const [currentTime, setCurrentTime] = useState<string>(format(toZonedTime(new Date(), timezone), 'h:mm'));
    const APPOINTMENT_BLOCK_HEIGHT = hourHeight / 4;

    const updateCurrentTimeYPosition = () => {
        setCurrentTimeYPosition(timeToYPosition(getCurrentTimeInMinutes(timezone), hourHeight));
    };

    // Function to update the current time every minute
    const updateCurrentTime = () => {
        setCurrentTime(format(toZonedTime(new Date(), timezone), 'h:mm')); // Update the state with the new current time
    };

    const titleFace = useResolvedFont({fontWeight: '700'});

    useEffect(() => {
        const update = () => {
            updateCurrentTime();
            updateCurrentTimeYPosition();
        };

        update();
        const intervalId = setInterval(update, 300);

        return () => clearInterval(intervalId);
    }, [timezone]);

    useEffect(() => {
        // Ensure scroll happens after the interactions (i.e., after rendering)
        InteractionManager.runAfterInteractions(() => {
            let pos = isToday ? currentTimeYPosition - 240 : timeToYPosition(startMinutes, hourHeight); // Offset by 240px to give a little margin above the red line
            if (ref.current) {
                ref.current.scrollTo({
                    y: Math.round((pos) / APPOINTMENT_BLOCK_HEIGHT) * APPOINTMENT_BLOCK_HEIGHT, // Offset by 240px to give a little margin above the red line
                    animated: true,
                });
            }
        });
    }, [date, isToday, APPOINTMENT_BLOCK_HEIGHT, startMinutes, hourHeight]); // Ensure this effect runs when currentTimeYPosition is updated

    return (
        <>
            <Col>
                {/* Time labels */}
                {Array.from({length: 24}).map((_, index) => (
                    <View key={index} style={[styles.timeLabel, {height: hourHeight}]}>
                        <Text
                            allowFontScaling={false}
                            style={{
                                textAlign: "center",
                                fontFamily: titleFace,
                                fontSize: getTextSize(hourHeight),
                                fontWeight: '700'
                            }}>
                            {indexToDate(index).split(" ")[0]}
                        </Text>
                        <Text
                            allowFontScaling={false}
                            style={{
                                textAlign: "center",
                                fontFamily: titleFace,
                                fontSize: getTextSize(hourHeight),
                                fontWeight: '700'
                            }}>
                            {indexToDate(index).split(" ")[1]}
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
});

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
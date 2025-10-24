import * as React from 'react';
import {useMemo} from 'react';
import Animated, {AnimatedProps, SharedValue, useAnimatedProps, useAnimatedStyle} from "react-native-reanimated";
import Col from "./common/layout/Col";
import Row from "./common/layout/Row";
import {MaterialIcons} from "@expo/vector-icons";
import {StyleSheet, Text, TextInput, TextInputProps} from "react-native";
import {Event} from "@/types/calendarTypes";
import {EventSlots, StyleOverrides} from "./EventBlock";
import {getTextSize, minutesToTime, positionToMinutes} from "@/utilities/helpers";
import {useResolvedFont} from "@/theme/ThemeContext";

type Props = {
    selectedEvent: Event;
    APPOINTMENT_BLOCK_WIDTH: number;
    hourHeight: number;
    panYAbs: SharedValue<number>;
    panXAbs: SharedValue<number>;
    eventStartedTop: SharedValue<number>;
    eventHeight: SharedValue<number>;
    slots?: EventSlots;
    styleOverrides?: | StyleOverrides
        | ((event: Event) => StyleOverrides | undefined);
};

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);
type AnimatedTextInputProps = AnimatedProps<TextInputProps> & { text: string };
export const DraggableEvent = ({
                                   selectedEvent,
                                   eventStartedTop,
                                   panYAbs, panXAbs,
                                   APPOINTMENT_BLOCK_WIDTH,
                                   hourHeight,
                                   eventHeight, styleOverrides,
                                   slots
                               }: Props) => {
    const dynamicStyle = useAnimatedStyle(() => {
        return {
            height: eventHeight.value < hourHeight / 4 ? eventHeight.value : eventHeight.value - 4,
            width: APPOINTMENT_BLOCK_WIDTH,
            borderWidth: 1,
            borderColor: "rgba(0,0,0,0.12)",
        }
    });

    const draggingAnimatedStyle = useAnimatedStyle(() => {
        if (!selectedEvent) {
            return {
                opacity: 0,
                transform: [
                    {
                        translateY: 0,
                    },
                    {
                        translateX: 0,
                    },
                ],
            };
        }
        return {
            opacity: 1,
            transform: [
                {
                    translateY: panYAbs.value - (eventHeight.value / 2) + 2,
                },
                {
                    translateX: panXAbs.value - (APPOINTMENT_BLOCK_WIDTH / 2),
                },
            ],
        };
    }, [selectedEvent, eventHeight, APPOINTMENT_BLOCK_WIDTH]);

    const initialDisplayTime = useMemo(() => {
        // Use the initial values calculated above, not the shared value
        const start = minutesToTime(positionToMinutes(eventStartedTop.value, hourHeight));
        const end = minutesToTime(positionToMinutes(eventStartedTop.value + eventHeight.value, hourHeight));
        return `${start} - ${end}`;
    }, [eventHeight.value, hourHeight, eventStartedTop.value]);

    const animatedTimeProps = useAnimatedProps<AnimatedTextInputProps>(() => {
        const start = minutesToTime(positionToMinutes(eventStartedTop.value, hourHeight));
        const end = minutesToTime(positionToMinutes(eventStartedTop.value + eventHeight.value, hourHeight));
        return {
            text: `${start} - ${end}`
        };
    }, []);

    const resolved =
        typeof styleOverrides === 'function'
            ? styleOverrides(selectedEvent) ?? {}
            : styleOverrides ?? {};

    const TopRight = slots?.TopRight;
    const Body = slots?.Body;
    const titleFace = useResolvedFont({fontWeight: '700'});
    const timeFace = useResolvedFont({fontWeight: '600'});

    return (
        <Animated.View style={[styles.event, dynamicStyle, draggingAnimatedStyle, resolved?.container]}>
            <Col style={[{position: "relative"}, resolved?.content]}>
                <AnimatedTextInput
                    editable={false}
                    allowFontScaling={false}
                    underlineColorAndroid="transparent" // Disables underline on Android
                    style={{
                        width: "100%",
                        fontFamily: timeFace,
                        fontSize: getTextSize(hourHeight),
                        pointerEvents: "none",
                        padding: 0,
                        margin: 0,
                    }}
                    defaultValue={initialDisplayTime}
                    animatedProps={animatedTimeProps}
                />
                {
                    Body ? <Body event={selectedEvent} ctx={{hourHeight}}/> :
                        <>
                            <Row style={{alignItems: "center", height: 18}}>
                                <Text
                                    allowFontScaling={false}
                                    style={[{
                                        fontFamily: titleFace,
                                        fontSize: getTextSize(hourHeight)
                                    }, resolved?.title]}
                                >{selectedEvent?.title}</Text>
                            </Row>
                            <Text
                                allowFontScaling={false}
                                style={[{
                                    fontFamily: timeFace,
                                    fontSize: getTextSize(hourHeight)
                                }, resolved?.desc]}>{selectedEvent?.description}</Text>
                        </>
                }
                <Row style={{
                    position: "absolute",
                    right: 2
                }} space={2}>
                    {TopRight ? <TopRight event={selectedEvent} ctx={{hourHeight}}/> : null}
                </Row>
            </Col>
            <Row style={{
                position: "absolute",
                alignSelf: "center", bottom: 0
            }}>
                <MaterialIcons name="drag-handle" size={12} color="black"/>
            </Row>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    event: {
        backgroundColor: '#4d959c',
        position: 'absolute',
        borderRadius: 5,
        padding: 2,
        overflow: "hidden",
        zIndex: 99, // Ensure events stay above the background blocks
    }
});

import React from "react";
import {StyleSheet, Text, TextInput, TextStyle, TouchableOpacity, View, ViewStyle} from "react-native";
import Row from "../components/common/layout/Row";
import Col from "../components/common/layout/Col";
import Hidden from "../components/common/layout/Hidden";
import {Event} from "@/types/calendarTypes";
import {EventFrame, getTextSize, minutesToTime, scalePosition} from "@/utilities/helpers";
import {useCalendarBinding} from "@/store/bindings/BindingProvider";
import {useResolvedFont} from "@/theme/ThemeContext";

export type EventRenderContext = {
    hourHeight: number;
};

export type EventSlots = {
    // TopLeft?: React.ComponentType<{ event: Event; ctx: EventRenderContext }>;
    TopRight?: React.ComponentType<{ event: Event; ctx: EventRenderContext }>;
    Body?: React.ComponentType<{ event: Event; ctx: EventRenderContext }>;
};

export type EventRenderer = (
    props: EventBlockProps & { children?: React.ReactNode }
) => React.ReactNode;

export type StyleOverrides = Partial<{
    container: ViewStyle;
    content: ViewStyle;
    title: TextStyle;
    desc: TextStyle;
}>;

interface EventBlockProps {
    event: Event;
    hourHeight: number;
    frame: EventFrame;
    disabled?: boolean;
    selected?: boolean;
    onLongPress?: (event: Event) => void;
    onPress?: (event: Event) => void;
    slots?: EventSlots;
    styleOverrides?:
        | StyleOverrides
        | ((event: Event) => StyleOverrides | undefined);
}

const EventBlock: React.FC<EventBlockProps> = React.memo(({
                                                              event,
                                                              onLongPress,
                                                              onPress, disabled, selected,
                                                              hourHeight, slots,
                                                              frame,
                                                              styleOverrides
                                                          }) => {
    const {useGetSelectedEvent} =
        useCalendarBinding();
    const selectedAppointment = useGetSelectedEvent();

    const eventTop = scalePosition(event.from, hourHeight);
    const eventHeight = scalePosition(event.to - event.from, hourHeight);

    const start = minutesToTime(event.from);
    const end = minutesToTime(event.to);

    const dynamicStyle = {
        top: eventTop + 2,
        height: eventHeight < hourHeight / 4 ? eventHeight : eventHeight - 4,
        left: frame.leftPx,
        width: frame.widthPx,
        zIndex: frame.zIndex,
        opacity: selectedAppointment ? 0.5 : 1,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? "#4d959c" : "rgba(0,0,0,0.12)",
    };

    const resolved =
        typeof styleOverrides === 'function'
            ? styleOverrides(event) ?? {}
            : styleOverrides ?? {};

    if (eventHeight == 0)
        return null;

    const TopRight = slots?.TopRight;
    const Body = slots?.Body;
    const titleFace = useResolvedFont({fontWeight: '700'});
    const timeFace = useResolvedFont({fontWeight: '600'});

    return (
        <TouchableOpacity
            style={[styles.event, resolved?.container, dynamicStyle]}
            disabled={disabled}
            onPress={() => {
                onPress && onPress(event);
            }}
            onLongPress={() => {
                onLongPress && onLongPress(event);
            }}
        >
            <Hidden isHidden={!disabled}>
                <View style={{
                    position: 'absolute',
                    top: 0,
                    width: "150%",
                    height: '150%',
                    zIndex: 1,
                    backgroundColor: "rgba(255, 255, 255, 0.5)"
                }}/>
            </Hidden>
            <Col style={[{position: "relative"}, resolved?.content]}>
                <TextInput
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
                    defaultValue={`${start} - ${end}`}
                />

                {
                    Body ? <Body event={event} ctx={{hourHeight}}/> :
                        <>
                            <Row style={{alignItems: "center", height: 18}}>
                                <Text
                                    allowFontScaling={false}
                                    style={[{
                                        fontFamily: titleFace,
                                        fontSize: getTextSize(hourHeight)
                                    }, resolved?.title]}
                                >{event?.title}</Text>
                            </Row>
                            <Text
                                allowFontScaling={false}
                                style={[{
                                    fontFamily: timeFace,
                                    fontSize: getTextSize(hourHeight)
                                }, resolved?.desc]}>{event?.description}</Text>
                        </>
                }
                <Row style={{
                    position: "absolute",
                    right: 2
                }} space={2}>
                    {TopRight ? <TopRight event={event} ctx={{hourHeight}}/> : null}
                </Row>
            </Col>
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    event: {
        position: 'absolute',
        borderRadius: 5,
        padding: 2,
        overflow: "hidden",
        zIndex: 9999, // Ensure events stay above the background blocks
    }
});

export default EventBlock;

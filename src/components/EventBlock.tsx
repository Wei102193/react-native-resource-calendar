import React, {useCallback} from "react";
import {StyleSheet, Text, TextStyle, TouchableOpacity, ViewStyle} from "react-native";
import Row from "../components/common/layout/Row";
import Col from "../components/common/layout/Col";
import {Event, EventRenderContext} from "@/types/calendarTypes";
import {EventFrame, getTextSize, minutesToTimeCached, scalePosition} from "@/utilities/helpers";
import {useResolvedFont} from "@/theme/ThemeContext";
import {StyleProp} from "react-native/Libraries/StyleSheet/StyleSheet";

export type EventSlots = {
    // TopLeft?: React.ComponentType<{ event: Event; ctx: EventRenderContext }>;
    TopRight?: React.ComponentType<{ event: Event; ctx: EventRenderContext }>;
    Body?: React.ComponentType<{ event: Event; ctx: EventRenderContext }>;
};

/** Fonts resolved once per column and handed down, see EventBlocks. */
export type EventFonts = {
    titleFace?: string;
    timeFace?: string;
};

export type EventRenderer = (
    props: EventBlockProps & { children?: React.ReactNode }
) => React.ReactNode;

export type StyleOverrides = Partial<{
    time: StyleProp<TextStyle>;
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
    anyEventSelected?: boolean;
    onLongPress?: (event: Event) => void;
    onPress?: (event: Event) => void;
    slots?: EventSlots;
    styleOverrides?:
        | StyleOverrides
        | ((event: Event) => StyleOverrides | undefined);
    fonts?: EventFonts;
}

const EventBlock: React.FC<EventBlockProps> = React.memo(({
                                                              event,
                                                              onLongPress,
                                                              onPress, disabled, selected,
                                                              anyEventSelected,
                                                              hourHeight, slots,
                                                              frame,
                                                              styleOverrides,
                                                              fonts
                                                          }) => {
    const eventTop = scalePosition(event.from, hourHeight);
    const eventHeight = scalePosition(event.to - event.from, hourHeight);

    const start = minutesToTimeCached(event.from);
    const end = minutesToTimeCached(event.to);

    const dynamicStyle = {
        top: eventTop + 2,
        height: eventHeight < hourHeight / 4 ? eventHeight : eventHeight - 4,
        left: frame.leftPx + 1,
        width: frame.widthPx - 3,
        zIndex: frame.zIndex,
        opacity: anyEventSelected || disabled ? 0.5 : 1,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? "#4d959c" : "rgba(0,0,0,0.12)",
        // When disabled, let touches fall through to the grid blocks beneath
        // (e.g. "select a time" mode) instead of swallowing them.
        pointerEvents: (disabled ? "none" : "auto") as "none" | "auto",
    };

    const resolved =
        typeof styleOverrides === 'function'
            ? styleOverrides(event) ?? {}
            : styleOverrides ?? {};

    // Opaque backing for the meta icons: they float over the full-width time and
    // must hide the part of it they cover. `flatten` so an array styleOverride works
    // too; `undefined` just means transparent, i.e. exactly the old see-through
    // behaviour, so a consumer that sets no container colour is unaffected.
    const cardBg = StyleSheet.flatten(resolved?.container)?.backgroundColor;

    const handlePress = useCallback(() => onPress?.(event), [onPress, event]);
    const handleLongPress = useCallback(() => onLongPress?.(event), [onLongPress, event]);

    // Hooks must run before the early return below, otherwise the hook order
    // changes when a zero-height event mounts/unmounts.
    // Fonts are normally resolved once per column (EventBlocks) and passed down; the
    // per-card context read was two of the ~10 hook calls on every card render. The
    // fallback keeps custom renderers that build an EventBlock by hand working.
    const ownTitleFace = useResolvedFont({fontWeight: '700'});
    const ownTimeFace = useResolvedFont({fontWeight: '600'});
    const titleFace = fonts?.titleFace ?? ownTitleFace;
    const timeFace = fonts?.timeFace ?? ownTimeFace;

    if (eventHeight == 0)
        return null;

    const TopRight = slots?.TopRight;
    const Body = slots?.Body;

    return (
        <TouchableOpacity
            style={[styles.event, resolved?.container, dynamicStyle]}
            disabled={disabled}
            onPress={handlePress}
            onLongPress={handleLongPress}
        >
            <Col style={[{position: "relative"}, resolved?.content]}>
                {/* A Text, not a non-editable TextInput: the latter is a whole EditText
                    per card on Android. */}
                <Text
                    allowFontScaling={false}
                    numberOfLines={1}
                    style={[{
                        width: "100%",
                        fontFamily: timeFace,
                        fontSize: getTextSize(hourHeight),
                        pointerEvents: "none",
                        padding: 0,
                        margin: 0,
                        color: "black",
                    }, resolved?.time]}
                >{`${start} - ${end}`}</Text>

                {
                    Body ? <Body event={event} ctx={{hourHeight}}/> :
                        <>
                            <Row style={{alignItems: "center", height: 18}}>
                                <Text
                                    allowFontScaling={false}
                                    style={[{
                                        fontFamily: titleFace,
                                        fontSize: getTextSize(hourHeight),
                                        fontWeight: "700"
                                    }, resolved?.title]}
                                >{event?.title}</Text>
                            </Row>
                            <Text
                                allowFontScaling={false}
                                style={[{
                                    fontFamily: timeFace,
                                    fontSize: getTextSize(hourHeight),
                                    fontWeight: "600"
                                }, resolved?.desc]}>{event?.description}</Text>
                        </>
                }
                {/* The meta icons float OVER the full-width time rather than fighting it
                    for width. Without `top` Yoga parked them at y = 0, exactly on the
                    time line, and with no background the time showed through the gaps
                    inside and between the icon strokes, leaving both unreadable.
                    Deliberately not a flex row: making the time flex:1 alongside the
                    icons removes the overlap, but it also reserves the icons' width on
                    every card, so a short time like "9:00" gets squeezed and long ones
                    truncate early even when the card had room. */}
                <Row style={{
                    position: "absolute",
                    top: 0,
                    right: 2,
                    alignItems: "center",
                    paddingLeft: 4,
                    backgroundColor: cardBg
                }}>
                    {TopRight ? <TopRight event={event} ctx={{hourHeight}}/> : null}
                </Row>
            </Col>
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    event: {
        backgroundColor: '#4d959c',
        position: 'absolute',
        borderRadius: 5,
        padding: 2,
        overflow: "hidden",
        zIndex: 9999, // Ensure events stay above the background blocks
    }
});

export default EventBlock;

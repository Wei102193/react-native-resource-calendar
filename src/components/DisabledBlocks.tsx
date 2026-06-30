import React, {useMemo} from "react";
import {StyleSheet, Text, TouchableOpacity} from "react-native";
import {getHours, getMinutes, parse} from "date-fns";
import {
    columnsToPixels,
    computeDisabledBlockColumns,
    EventFrame,
    getTextSize,
    minutesToTime,
    scalePosition
} from "@/utilities/helpers";
import Col from "./common/layout/Col";
import Row from "./common/layout/Row";
import {DisabledBlock} from "@/types/calendarTypes";
import {useCalendarBinding} from "@/store/bindings/BindingProvider";
import {useResolvedFont} from "@/theme/ThemeContext";

interface DisabledBlocksProps {
    id: number;
    hourHeight: number;
    APPOINTMENT_BLOCK_WIDTH: number;
    onDisabledBlockPress?: (block: DisabledBlock) => void;
    // When true, blocks are dimmed and let touches fall through to the grid
    // beneath (so a "select a time" flow can pick the slot under a time-off).
    tapThrough?: boolean;
    date?: Date;
}

interface DisabledBlockComponentProps {
    top: number;
    height: number;
    hourHeight: number;
    disabledBlock: DisabledBlock;
    onDisabledBlockPress?: (block: DisabledBlock) => void;
    tapThrough?: boolean;
    layout: EventFrame;
}

const MINUTES_IN_DAY = 24 * 60;

const covertTimeToMinutes = (time: string) => {
    const parsedTime = parse(time, "HH:mm", new Date());
    return getHours(parsedTime) * 60 + getMinutes(parsedTime);
}

// Build a normalized [start, end) in minutes, allowing overnight
const toNormalizedInterval = (from?: string, to?: string) => {
    const start = covertTimeToMinutes(from ?? "00:00");
    let end = covertTimeToMinutes(to ?? "00:00");

    // If it wraps past midnight (e.g., 23:00 → 00:00), push end into the next day
    if (end <= start) end += MINUTES_IN_DAY;

    return {start, end};
};

const DisabledBlockComponent: React.FC<DisabledBlockComponentProps> = ({
                                                                           top,
                                                                           height,
                                                                           layout,
                                                                           disabledBlock,
                                                                           hourHeight,
                                                                           onDisabledBlockPress,
                                                                           tapThrough
                                                                       }) => {
    const dynamicStyle = {
        backgroundColor: "#d3d3d3",
        top: top + 2,
        left: layout.leftPx + 1,
        height: height < hourHeight / 4 ? height : height - 4,
        width: layout.widthPx - 3,
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.12)",
        opacity: tapThrough ? 0.5 : 1,
        // Let touches fall through to the grid blocks beneath when tap-through.
        pointerEvents: (tapThrough ? "none" : "auto") as "none" | "auto",
    };
    const titleFace = useResolvedFont({fontWeight: '600'});

    return <TouchableOpacity
        style={[styles.event, dynamicStyle]}
        disabled={tapThrough}
        onPress={() => {
            onDisabledBlockPress && onDisabledBlockPress(disabledBlock);
        }}
    >
        <Col style={{position: "relative"}}>
            <Row style={{height: 18}}>
                <Text
                    allowFontScaling={false}
                    style={{
                        fontFamily: titleFace,
                        fontSize: getTextSize(hourHeight),
                        fontWeight: "600"
                    }}>{minutesToTime(disabledBlock?.from)} - {minutesToTime(disabledBlock?.to)}</Text>
            </Row>
            <Text
                allowFontScaling={false}
                style={{
                    fontFamily: titleFace,
                    fontSize: getTextSize(hourHeight),
                    fontWeight: "600"
                }}>{disabledBlock?.title}</Text>
        </Col>
    </TouchableOpacity>
};

const DisabledBlocks: React.FC<DisabledBlocksProps> = React.memo(({
                                                                      id,
                                                                      APPOINTMENT_BLOCK_WIDTH,
                                                                      hourHeight,
                                                                      onDisabledBlockPress,
                                                                      tapThrough,
                                                                      date: dateProp
                                                                  }) => {
    const {useDisabledBlocksFor, useGetDate} =
        useCalendarBinding();
    const date = useGetDate();
    const disabledBlocks = useDisabledBlocksFor(id, dateProp ?? date);

    const layoutMap = useMemo(() => {
        return columnsToPixels(computeDisabledBlockColumns(disabledBlocks), APPOINTMENT_BLOCK_WIDTH);
    }, [disabledBlocks]);

    return (
        <>
            {disabledBlocks.map((disabledBlock, index) => {
                    const key = disabledBlock.id;
                    return <DisabledBlockComponent
                        hourHeight={hourHeight}
                        disabledBlock={disabledBlock}
                        key={`${index}-${disabledBlock.from}-${disabledBlock.to}`} // Updated key to include hour values
                        top={scalePosition(disabledBlock.from, hourHeight)}
                        height={scalePosition(disabledBlock.to - disabledBlock.from, hourHeight)}
                        layout={layoutMap.get(key)!}
                        onDisabledBlockPress={onDisabledBlockPress}
                        tapThrough={tapThrough}
                    />
                }
            )}
        </>
    );
});

const styles = StyleSheet.create({
    event: {
        position: 'absolute',
        borderRadius: 5,
        padding: 2,
        overflow: "hidden",
        zIndex: 999, // Ensure events stay above the background blocks
    },
});

export default DisabledBlocks;

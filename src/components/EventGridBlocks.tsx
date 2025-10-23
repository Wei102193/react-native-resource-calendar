import * as React from 'react';
import {useMemo} from 'react';
import {View} from 'react-native';
import {Canvas, Line, Rect} from '@shopify/react-native-skia';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import {runOnJS} from 'react-native-reanimated';
import {combineDateAndTime} from '@/utilities/helpers';

type Props = {
    dateRef: React.RefObject<Date>;
    handleBlockPress: (date: string) => void;
    APPOINTMENT_BLOCK_WIDTH: number;
    hourHeight: number;
};

export const EventGridBlocksSkia: React.FC<Props> = ({
                                                         dateRef,
                                                         handleBlockPress,
                                                         hourHeight,
                                                         APPOINTMENT_BLOCK_WIDTH
                                                     }) => {
    const rowHeight = hourHeight / 4;
    const [pressedRow, setPressedRow] = React.useState<number | null>(null);

    // 96 quarter-hour labels, computed once
    const timeLabels = useMemo<string[]>(() => {
        const out: string[] = [];
        for (let h = 0; h < 24; h++) {
            for (let q = 0; q < 4; q++) {
                const m = q * 15;
                const hh = String(h).padStart(2, '0');
                const mm = String(m).padStart(2, '0');
                out.push(`${hh}:${mm}:00`);
            }
        }
        return out;
    }, []);

    const rects = useMemo(
        () =>
            timeLabels.map((_, row) => ({
                x: 0,
                y: row * rowHeight,
                width: APPOINTMENT_BLOCK_WIDTH,
                height: rowHeight,
                row,
            })),
        [timeLabels, rowHeight, APPOINTMENT_BLOCK_WIDTH]
    );

    // Split into two canvas segments
    const midIndex = Math.ceil(rects.length / 2);
    const firstRects = rects.slice(0, midIndex);
    const secondRects = rects.slice(midIndex);
    const segmentHeight = rowHeight * firstRects.length;

    const onSlotPress = React.useCallback(
        (row: number) => {
            setPressedRow(null);
            const slot = timeLabels[row];
            if (slot) {
                const timestamp = combineDateAndTime(dateRef.current, slot);
                handleBlockPress(timestamp);
            }
        },
        [dateRef, handleBlockPress, timeLabels]
    );

    const onPressBegin = React.useCallback((row: number) => {
        setPressedRow(row);
    }, []);
    const onTouchesUp = React.useCallback(() => {
        setPressedRow(null);
    }, []);

    const longPressGesture = Gesture.LongPress()
        .onBegin((e) => runOnJS(onPressBegin)(Math.floor(e.y / rowHeight)))
        .onEnd((e) => runOnJS(onSlotPress)(Math.floor(e.y / rowHeight)))
        .onFinalize(() => runOnJS(onTouchesUp)());

    return (
        <GestureDetector gesture={longPressGesture}>
            <View>
                {/* First half-day segment */}
                <Canvas style={{width: APPOINTMENT_BLOCK_WIDTH, height: segmentHeight}}>
                    {firstRects.map(({x, y, width: w, height: h, row}, idx) => (
                        <React.Fragment key={idx}>
                            <Rect
                                x={x}
                                y={y}
                                width={w}
                                height={h}
                                color={
                                    pressedRow === row ? 'rgba(240,240,240,0.3)' : 'rgba(240,240,240,0.6)'
                                }
                                style="fill"
                            />
                            <Line p1={{x, y: y + h}} p2={{x: x + w, y: y + h}} color="#ddd" strokeWidth={1}/>
                        </React.Fragment>
                    ))}
                </Canvas>

                {/* Second half-day segment */}
                <Canvas style={{width: APPOINTMENT_BLOCK_WIDTH, height: segmentHeight}}>
                    {secondRects.map(({x, y, width: w, height: h, row}, idx) => (
                        <React.Fragment key={idx}>
                            <Rect
                                x={x}
                                y={y - segmentHeight}
                                width={w}
                                height={h}
                                color={
                                    pressedRow === row ? 'rgba(240,240,240,0.3)' : 'rgba(240,240,240,0.6)'
                                }
                                style="fill"
                            />
                            <Line
                                p1={{x, y: y - segmentHeight + h}}
                                p2={{x: x + w, y: y - segmentHeight + h}}
                                color="#ddd"
                                strokeWidth={1}
                            />
                        </React.Fragment>
                    ))}
                </Canvas>
            </View>
        </GestureDetector>
    );
};

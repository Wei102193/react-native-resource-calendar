import React from "react";
import {StyleSheet, View} from "react-native";
import Svg, {Defs, Line, Pattern} from "react-native-svg";
import {Rect} from "react-content-loader/native";
import {useCalendarBinding} from "@/store/bindings/BindingProvider";
import {scalePosition} from "@/utilities/helpers";

interface DisabledIntervalsProp {
    id: number;
    APPOINTMENT_BLOCK_WIDTH: number;
    hourHeight: number;
}

interface DisabledIntervalsProps {
    width: number;
    top: number;
    height: number;
}

const DisabledInterval: React.FC<DisabledIntervalsProps> = ({width, top, height}) => {
    return <View style={[styles.disabledBlock, {width, top, height}]}>
        <Svg width={width} height="100%">
            <Defs>
                <Pattern id="diagonalHatch" patternUnits="userSpaceOnUse" width="10" height="10">
                    <Line x1="0" y1="0" x2="10" y2="10" stroke="rgba(150, 150, 150, 0.8)" strokeWidth="1"/>
                </Pattern>
            </Defs>
            <Rect width={width} height="100%" fill="url(#diagonalHatch)"/>
        </Svg>
    </View>
};

const DisabledIntervals: React.FC<DisabledIntervalsProp> = React.memo(({id, APPOINTMENT_BLOCK_WIDTH, hourHeight}) => {
    const {useDisabledIntervalsFor} =
        useCalendarBinding();
    const disabledIntervals = useDisabledIntervalsFor(id);

    return (
        <>
            {disabledIntervals.map((disabledInterval, index) => {
                    return <DisabledInterval
                        key={`${index}-${disabledInterval.from}-${disabledInterval.to}`} // Updated key to include disabledInterval values
                        width={APPOINTMENT_BLOCK_WIDTH}
                        top={scalePosition(disabledInterval.from, hourHeight)}
                        height={scalePosition(disabledInterval.to - disabledInterval.from, hourHeight)}
                    />
                }
            )}
        </>
    );
});

const styles = StyleSheet.create({
    disabledBlock: {
        position: "absolute",
        zIndex: -10,
    },
});

export default DisabledIntervals;

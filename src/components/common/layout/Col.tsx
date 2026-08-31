import React, {ReactNode} from "react";
import {View, ViewProps} from "react-native";

interface ColProps extends ViewProps {
    space?: number;
    divider?: ReactNode;
}

const Col = ({children, divider, space, style}: ColProps) => {
    // Fast path: with neither a divider nor a gap there is nothing to interleave,
    // so skip Children.toArray and the per-child Fragment + spacer View entirely.
    // Most callers in the calendar (every event card) are in this case.
    if (space == null && divider == null) {
        return <View style={[{flexDirection: "column"}, style]}>{children}</View>;
    }

    const items = React.Children.toArray(children);
    const last = items.length - 1;

    return (
        <View style={[{flexDirection: "column"}, style]}>
            {items.map((child, index) => (
                <React.Fragment key={index}>
                    {child}
                    {index !== last && divider}
                    {index !== last && space != null &&
                        <View style={{height: space, width: "100%"}}/>}
                </React.Fragment>
            ))}
        </View>
    );
};

export default Col;

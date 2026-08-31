import React, {ReactNode} from "react";
import {View, ViewProps} from "react-native";

interface RowProps extends ViewProps {
    space?: number;
    divider?: ReactNode;
}

const Row = ({children, divider, space, style, ...props}: RowProps) => {
    // Fast path: see Col. Without a divider or a gap the old code still mounted a
    // zero-width spacer View between every pair of children.
    if (space == null && divider == null) {
        return <View style={[{flexDirection: "row"}, style]} {...props}>{children}</View>;
    }

    const items = React.Children.toArray(children);
    const last = items.length - 1;

    return (
        <View style={[{flexDirection: "row"}, style]} {...props}>
            {items.map((child, index) => (
                <React.Fragment key={index}>
                    {child}
                    {index !== last && divider}
                    {index !== last && space != null &&
                        <View style={{width: space, height: "100%"}}/>}
                </React.Fragment>
            ))}
        </View>
    );
};

export default Row;

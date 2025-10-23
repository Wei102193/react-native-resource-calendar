import React, {ReactNode} from "react";
import {View, ViewProps} from "react-native";

interface RowProps extends ViewProps {
    space?: number;
    divider?: ReactNode;
}

const Row = ({children, divider, space, style, ...props}: RowProps) => {
    return (
        <View style={[{flexDirection: "row"}, style]} {...props}>
            {React.Children.toArray(children).map((child, index) => (
                <React.Fragment key={index}>
                    {child}
                    {index !== React.Children.toArray(children).length - 1 &&
                        divider}
                    {index !== React.Children.toArray(children).length - 1 &&
                        <View style={{width: space, height: "100%"}}/>}
                </React.Fragment>
            ))}
        </View>
    );
};

export default Row;

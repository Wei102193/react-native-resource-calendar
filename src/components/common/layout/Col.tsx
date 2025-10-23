import React, {ReactNode} from "react";
import {View, ViewProps} from "react-native";

interface ColProps extends ViewProps {
    space?: number;
    divider?: ReactNode;
}

const Col = ({children, divider, space, style}: ColProps) => {
    return (
        <View style={[{flexDirection: "column"}, style]}>
            {React.Children.toArray(children).map((child, index) => (
                <React.Fragment key={index}>
                    {child}
                    {index !== React.Children.toArray(children).length - 1 &&
                        divider}
                    {index !== React.Children.toArray(children).length - 1 &&
                        <View style={{height: space, width: "100%"}}/>}
                </React.Fragment>
            ))}
        </View>
    );
};

export default Col;

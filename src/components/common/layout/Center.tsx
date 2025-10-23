import React, {PropsWithChildren} from "react";
import {StyleProp, View, ViewStyle} from "react-native";

interface CenterProps {
    style?: StyleProp<ViewStyle>
}

const Center = ({children, style}: PropsWithChildren<CenterProps>) => {
    return (
        <View style={[{
            justifyContent: "center",
            alignItems: "center",
        }, style]}
        >
            {children}
        </View>
    );
};

export default Center;

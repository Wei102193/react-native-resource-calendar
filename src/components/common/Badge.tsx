import React, {PropsWithChildren} from 'react';
import {StyleProp, StyleSheet, Text, View, ViewStyle} from 'react-native';
import {useResolvedFont} from "@/theme/ThemeContext";

type BadgeProps = {
    value?: number | string;
    color?: string;
    textColor?: string;
    fontSize?: number;
    style?: StyleProp<ViewStyle>
};

const Badge: React.FC<PropsWithChildren<BadgeProps>> = ({
                                                            style,
                                                            value = '',
                                                            children,
                                                            fontSize,
                                                            color = 'red',
                                                            textColor = 'white'
                                                        }) => {
    const titleFace = useResolvedFont({fontWeight: '600'});

    return (
        <View style={[styles.badge, {backgroundColor: color}, style]}>
            {children ? children : <Text
                allowFontScaling={false}
                style={{
                    color: textColor,
                    fontSize,
                    fontFamily: titleFace
                }}
            >{value}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    badge: {
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 999,
        paddingHorizontal: 6
    },
});

export default Badge;

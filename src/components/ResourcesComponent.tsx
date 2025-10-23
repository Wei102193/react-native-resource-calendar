// @flow
import * as React from 'react';
import {Image, StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle} from "react-native";
import {isUndefined} from "lodash";
import Hidden from './common/layout/Hidden';
import Center from './common/layout/Center';
import Badge from './common/Badge';
import Col from './common/layout/Col';
import {Resource} from '@/types/calendarTypes';
import {useCalendarBinding} from "@/store/bindings/BindingProvider";
import {useResolvedFont} from "@/theme/ThemeContext";

type Props = {
    resourceIds: number[];
    APPOINTMENT_BLOCK_WIDTH: number;
    onResourcePress?: (resource: Resource) => void;
};

type ResourceComponentProps = {
    id: number;
    APPOINTMENT_BLOCK_WIDTH: number;
    onResourcePress?: (resource: Resource) => void;
}

const ResourceComponent = ({id, onResourcePress, APPOINTMENT_BLOCK_WIDTH}: ResourceComponentProps) => {
    const {useResourceById, useEventsFor} =
        useCalendarBinding();
    const resource = useResourceById(id);
    const events = useEventsFor(id);
    const titleFace = useResolvedFont({fontWeight: '700'});

    return <Col style={[{
        alignItems: 'center',
        width: APPOINTMENT_BLOCK_WIDTH,
    }]}>
        <View style={{position: "relative"}}>
            <StaffAvatar
                onPress={() => {
                    if (onResourcePress)
                        onResourcePress(resource);
                }}
                name={resource?.name}
                circleSize={40}
                fontSize={16}
                badge={events?.length}
                image={resource?.avatar}
            />
        </View>
        <Text style={{
            fontSize: 14,
            fontFamily: titleFace,
        }}
              numberOfLines={1}
              allowFontScaling={false}
        >{resource?.name}</Text>
    </Col>
}

export const ResourcesComponent = ({resourceIds, onResourcePress, APPOINTMENT_BLOCK_WIDTH}: Props) => {
    return (
        <>
            {resourceIds?.map((id) => {
                return <ResourceComponent
                    key={id}
                    id={id}
                    APPOINTMENT_BLOCK_WIDTH={APPOINTMENT_BLOCK_WIDTH}
                    onResourcePress={onResourcePress}
                />
            })}
        </>
    );
}

interface StaffAvatarProps {
    circleSize?: number;
    fontSize?: number;
    name?: string;
    badge?: number;
    image?: string;
    badgeStyle?: StyleProp<ViewStyle>;
    containerStyle?: StyleProp<ViewStyle>;
    onPress?: () => void;
    ringColor?: string;
    avatarColor?: string;
    textColor?: string;
}

function StaffAvatar({
                         name,
                         circleSize = 60,
                         fontSize = 36,
                         image,
                         badge,
                         badgeStyle,
                         onPress,
                         containerStyle,
                         ringColor = '#DAEEE7',
                         avatarColor,
                         textColor,
                     }: StaffAvatarProps) {
    const titleFace = useResolvedFont({fontWeight: '700'});

    return (
        <TouchableOpacity
            disabled={isUndefined(onPress)}
            onPress={onPress}
            style={containerStyle}
        >
            <Center style={{
                borderRadius: 9999,
                backgroundColor: ringColor,
            }}>
                <Hidden isHidden={isUndefined(badge) || Number(badge) == 0}>
                    <View style={[{
                        zIndex: 1,
                        position: 'absolute',
                        right: -4,
                        top: -6,
                        borderRadius: 999,
                        backgroundColor: "#fff",
                        padding: 4
                    }, badgeStyle]}
                    >
                        <Badge
                            fontSize={12}
                            value={badge + ""}
                            color={"#4d959c"}
                        />
                    </View>
                </Hidden>
                <Center style={{
                    margin: 2,
                    borderRadius: 9999,
                    backgroundColor: 'white',
                }}>
                    <Center style={{
                        margin: 2,
                        borderRadius: 9999,
                        height: circleSize,
                        width: circleSize,
                        backgroundColor: avatarColor || "#C9E5E8",
                        overflow: 'hidden'
                    }}>
                        {
                            image ?
                                <Image
                                    resizeMode={"cover"}
                                    source={{uri: image}}
                                    style={{
                                        height: '100%',
                                        borderRadius: 6,
                                        ...StyleSheet.absoluteFillObject,
                                    }}
                                />
                                :
                                <Text
                                    allowFontScaling={false}
                                    style={{
                                        fontFamily: titleFace,
                                        fontSize: fontSize,
                                        color: textColor || "#4d959c",
                                    }}
                                >
                                    {name ? name.split(' ').map(n => n[0]).join('') : ''}
                                </Text>
                        }
                    </Center>
                </Center>
            </Center>
        </TouchableOpacity>
    )
}

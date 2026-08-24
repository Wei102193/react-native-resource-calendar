// @flow
import * as React from 'react';
import {Image, StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle} from "react-native";
import {isUndefined} from "lodash";
import Hidden from './common/layout/Hidden';
import Center from './common/layout/Center';
import Badge from './common/Badge';
import Col from './common/layout/Col';
import {Resource, ResourceRenderContext} from '@/types/calendarTypes';
import {useCalendarBinding} from "@/store/bindings/BindingProvider";
import {useResolvedFont} from "@/theme/ThemeContext";

export type ResourceSlotProps = {
    resource: Resource;
    ctx: ResourceRenderContext;
};

export type ResourceSlots = {
    /** Replaces the default avatar circle. */
    Avatar?: React.ComponentType<ResourceSlotProps>;
    /** Adornment pinned to the avatar's top-right corner (replaces nothing — it overlays). */
    TopRight?: React.ComponentType<ResourceSlotProps>;
    /** Replaces the resource name text. */
    Label?: React.ComponentType<ResourceSlotProps>;
    /** Extra content rendered below the label. */
    Bottom?: React.ComponentType<ResourceSlotProps>;
};

type Props = {
    resourceIds: number[];
    APPOINTMENT_BLOCK_WIDTH: number;
    onResourcePress?: (resource: Resource) => void;
    date: Date;
    slots?: ResourceSlots;
};

type ResourceComponentProps = {
    id: number;
    APPOINTMENT_BLOCK_WIDTH: number;
    onResourcePress?: (resource: Resource) => void;
    date: Date;
    slots?: ResourceSlots;
}

const ResourceComponent = ({id, onResourcePress, APPOINTMENT_BLOCK_WIDTH, date, slots}: ResourceComponentProps) => {
    const {useResourceById, useEventsFor} =
        useCalendarBinding();
    const resource = useResourceById(id);
    const events = useEventsFor(id, date);
    const titleFace = useResolvedFont({fontWeight: '700'});

    // `resourcesById` is populated by StoreFeeder in an effect, so the first
    // render has no resource yet. Fall back to the defaults (which tolerate an
    // undefined resource) rather than handing `undefined` to a consumer slot.
    const activeSlots = resource ? slots : undefined;
    const Avatar = activeSlots?.Avatar;
    const TopRight = activeSlots?.TopRight;
    const Label = activeSlots?.Label;
    const Bottom = activeSlots?.Bottom;

    const ctx: ResourceRenderContext = {
        width: APPOINTMENT_BLOCK_WIDTH,
        date,
        eventCount: events?.length ?? 0,
    };

    const handlePress = () => {
        if (onResourcePress)
            onResourcePress(resource);
    };

    return <Col style={[{
        alignItems: 'center',
        width: APPOINTMENT_BLOCK_WIDTH,
    }]}>
        <View style={{position: "relative"}}>
            {
                Avatar
                    ? <TouchableOpacity
                        disabled={isUndefined(onResourcePress)}
                        onPress={handlePress}
                    >
                        <Avatar resource={resource} ctx={ctx}/>
                    </TouchableOpacity>
                    : <StaffAvatar
                        onPress={handlePress}
                        name={resource?.name}
                        circleSize={Math.min(40, APPOINTMENT_BLOCK_WIDTH - 12)}
                        fontSize={16}
                        badge={TopRight ? undefined : events?.length}
                        image={resource?.avatar}
                    />
            }
            {
                TopRight && <View style={{position: "absolute", right: -4, top: -6, zIndex: 1}}>
                    <TopRight resource={resource} ctx={ctx}/>
                </View>
            }
        </View>
        {
            Label
                ? <Label resource={resource} ctx={ctx}/>
                : <Text style={{
                    fontSize: 14,
                    fontFamily: titleFace,
                    fontWeight: '700',
                }}
                        numberOfLines={1}
                        allowFontScaling={false}
                >{resource?.name}</Text>
        }
        {Bottom && <Bottom resource={resource} ctx={ctx}/>}
    </Col>
}

export const ResourcesComponent = ({resourceIds, onResourcePress, APPOINTMENT_BLOCK_WIDTH, date, slots}: Props) => {
    return (
        <>
            {resourceIds?.map((id) => {
                return <ResourceComponent
                    date={date}
                    key={id}
                    id={id}
                    APPOINTMENT_BLOCK_WIDTH={APPOINTMENT_BLOCK_WIDTH}
                    onResourcePress={onResourcePress}
                    slots={slots}
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

export function StaffAvatar({
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
                        padding: 2
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
                                        lineHeight: circleSize,
                                    }}
                                >
                                    {name ? name.split(' ').map(n => n[0]).join('').slice(0, 2) : ''}
                                </Text>
                        }
                    </Center>
                </Center>
            </Center>
        </TouchableOpacity>
    )
}

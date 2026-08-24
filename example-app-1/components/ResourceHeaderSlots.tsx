import React from "react";
import {Text, View} from "react-native";
import {CalendarCheck, CircleAlert, Star} from "lucide-react-native";
import {ResourceSlotProps} from "react-native-resource-calendar";

const BUSY_THRESHOLD = 3;

/**
 * Overlays the avatar's top-right corner. Providing this slot replaces the
 * calendar's built-in event-count badge, so we render our own indicator —
 * driven by `ctx.eventCount` and the resource's custom `meta`.
 */
export const ResourceTopRight: React.FC<ResourceSlotProps> = ({resource, ctx}) => {
    const isBusy = ctx.eventCount >= BUSY_THRESHOLD;

    if (ctx.eventCount === 0)
        return null;

    return (
        <View style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 2,
            paddingHorizontal: 4,
            paddingVertical: 2,
            borderRadius: 999,
            backgroundColor: isBusy ? "#dc3545" : "#4d959c",
        }}>
            {
                isBusy
                    ? <CircleAlert size={10} color={"#fff"}/>
                    : <CalendarCheck size={10} color={"#fff"}/>
            }
            <Text allowFontScaling={false} style={{color: "#fff", fontSize: 10, fontWeight: "700"}}>
                {ctx.eventCount}
            </Text>
        </View>
    );
};

/** Replaces the resource name text — adds a seniority marker from `resource.meta`. */
export const ResourceLabel: React.FC<ResourceSlotProps> = ({resource}) => {
    return (
        <View style={{flexDirection: "row", alignItems: "center", gap: 2}}>
            {
                resource.meta?.isSenior &&
                <Star size={11} color={"#f0ad4e"} fill={"#f0ad4e"}/>
            }
            <Text
                allowFontScaling={false}
                numberOfLines={1}
                style={{fontSize: 14, fontWeight: "700"}}
            >
                {resource.name}
            </Text>
        </View>
    );
};

/** Additive slot — rendered under the label. Mixes custom `meta` with render context. */
export const ResourceBottom: React.FC<ResourceSlotProps> = ({resource, ctx}) => {
    const role = resource.meta?.role;

    return (
        <Text
            allowFontScaling={false}
            numberOfLines={1}
            style={{fontSize: 11, color: ctx.eventCount === 0 ? "#9ca3af" : "#4d959c"}}
        >
            {role ? `${role} · ` : ""}{ctx.eventCount === 0 ? "Free" : `${ctx.eventCount} booked`}
        </Text>
    );
};

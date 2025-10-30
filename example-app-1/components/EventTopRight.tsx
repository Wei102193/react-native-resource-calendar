import {Event, EventRenderContext} from "react-native-resource-calendar";
import React from "react";
import {Heart, MessageCircleMore} from "lucide-react-native";
import {isEmpty} from "lodash";
import {View} from "react-native";

interface EventTopRightProps {
    event: Event;
    ctx: EventRenderContext;
}

const EventTopRight: React.FC<EventTopRightProps> = ({event, ctx}) => {
    return (
        <View style={{flexDirection: "row", gap: 2, alignItems: "center"}}>
            {
                event?.meta?.preferred ? <Heart color={"#dc3545"} fill={"#dc3545"} size={14}/> : null
            }
            {
                !isEmpty(event?.meta?.note) &&
                <MessageCircleMore size={14}/>
            }
        </View>
    );
};

export default EventTopRight;
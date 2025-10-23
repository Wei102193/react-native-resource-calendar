import React, {useMemo} from "react";
import {useCalendarBinding} from "@/store/bindings/BindingProvider";
import {Event} from "@/types/calendarTypes";
import {EventRenderer} from "./EventBlock";
import {computeEventFrames, LayoutMode} from "@/utilities/helpers";

type FlagFn = (event: Event) => boolean;

interface EventBlocksProps {
    id: number;
    EVENT_BLOCK_WIDTH: number;
    hourHeight: number;
    onLongPress: (evt: Event) => void;
    onPress: (evt: Event) => void;
    eventRenderer: EventRenderer;
    isEventSelected?: FlagFn;
    isEventDisabled?: FlagFn;
    mode: LayoutMode;
}

const EventBlocks: React.FC<EventBlocksProps> = React.memo(({
                                                                id,
                                                                onLongPress,
                                                                onPress,
                                                                hourHeight,
                                                                EVENT_BLOCK_WIDTH,
                                                                eventRenderer,
                                                                isEventDisabled, isEventSelected,
                                                                mode,
                                                            }) => {
    const {useEventsFor} =
        useCalendarBinding();
    const events = useEventsFor(id);

    const frameMap = useMemo(
        () => computeEventFrames(events, EVENT_BLOCK_WIDTH, mode),
        [events, mode, EVENT_BLOCK_WIDTH]
    );

    const Renderer = eventRenderer;

    return (events?.map((evt: Event, index: number) => {
                const selected = isEventSelected?.(evt) ?? false;
                const disabled = isEventDisabled?.(evt) ?? false;

                return <Renderer
                    key={`${evt.from}-${evt.to}-${index}`} // Unique key for appointment blocks
                    event={evt}
                    onLongPress={(evt: Event) => onLongPress(evt)}
                    onPress={(evt: Event) => onPress(evt)}
                    hourHeight={hourHeight}
                    frame={frameMap.get(evt.id)!}
                    selected={selected}
                    disabled={disabled}
                />
            }
        )
    );
});

export default EventBlocks;

import React from 'react';
import {Button, StyleSheet, View} from 'react-native';
import {Calendar, DraggedEventDraft, useCalendarBinding} from "react-native-resource-calendar";
import {SafeAreaView} from "react-native-safe-area-context";

const resourceData = [
    {
        id: 1,
        name: "Alice Johnson",
        avatar: "https://randomuser.me/api/portraits/women/11.jpg",
        events: [
            {
                id: 101,
                resourceId: 1,
                from: 8 * 60,   // 8:00 AM
                to: 9 * 60,     // 9:00 AM
                title: "Physical Therapy",
                description: "Post-surgery recovery session",
                meta: {client: "John Doe"},
            },
            {
                id: 102,
                resourceId: 1,
                from: 10 * 60,
                to: 11 * 60,
                title: "Mobility Assessment",
                description: "Initial consultation",
            },
        ],
        disabledBlocks: [
            {
                id: 1001,
                resourceId: 1,
                from: 12 * 60, // 12:00 PM
                to: 13 * 60,   // 1:00 PM
                title: "Lunch Break",
            },
        ],
        disableIntervals: [
            {
                resourceId: 1,
                from: 17 * 60, // 5:00 PM
                to: 24 * 60,   // 12:00 AM
            },
        ],
    },
    {
        id: 2,
        name: "Bob Martinez",
        avatar: "https://randomuser.me/api/portraits/men/22.jpg",
        events: [
            {
                id: 201,
                resourceId: 2,
                from: 9 * 60 + 30, // 9:30 AM
                to: 10 * 60 + 30,  // 10:30 AM
                title: "Personal Training",
                meta: {client: "Alex Kim"},
            },
            {
                id: 202,
                resourceId: 2,
                from: 15 * 60,
                to: 16 * 60,
                title: "Endurance Coaching",
            },
        ],
        disabledBlocks: [
            {
                id: 2001,
                resourceId: 2,
                from: 13 * 60,
                to: 14 * 60,
                title: "Staff Meeting",
            },
        ],
        disableIntervals: [
            {
                resourceId: 2,
                from: 7 * 60,
                to: 8 * 60,
            },
        ],
    },
    {
        id: 3,
        name: "Charlie Kim",
        avatar: "https://randomuser.me/api/portraits/men/33.jpg",
        events: [
            {
                id: 301,
                resourceId: 3,
                from: 11 * 60,
                to: 12 * 60,
                title: "Sports Massage",
            },
            {
                id: 302,
                resourceId: 3,
                from: 14 * 60 + 15,
                to: 15 * 60,
                title: "Deep Tissue Massage",
            },
        ],
        disabledBlocks: [
            {
                id: 3001,
                resourceId: 3,
                from: 12 * 60,
                to: 13 * 60,
                title: "Lunch",
            },
        ],
    },
    {
        id: 4,
        name: "Diana Ross",
        avatar: "https://randomuser.me/api/portraits/women/44.jpg",
        events: [
            {
                id: 401,
                resourceId: 4,
                from: 13 * 60,
                to: 14 * 60,
                title: "Nutrition Plan Review",
                description: "Discuss dietary adjustments",
            },
        ],
        disableIntervals: [
            {
                resourceId: 4,
                from: 18 * 60,
                to: 24 * 60,
            },
        ],
    },
    {
        id: 5,
        name: "Evan Lee",
        avatar: "https://randomuser.me/api/portraits/men/55.jpg",
        events: [
            {
                id: 501,
                resourceId: 5,
                from: 17 * 60,
                to: 18 * 60,
                title: "Evening Yoga",
                description: "Beginner-level class",
            },
        ],
        disabledBlocks: [
            {
                id: 5001,
                resourceId: 5,
                from: 12 * 60 + 30,
                to: 13 * 60 + 30,
                title: "Lunch Break",
            },
        ],
    },
];
export default function HomeScreen() {
    const {
        useGetSelectedEvent,
        useSetSelectedEvent,
        useGetDraggedEventDraft
    } = useCalendarBinding();
    const selectedEvent = useGetSelectedEvent();
    const setSelectedEvent = useSetSelectedEvent();
    const draggedEventDraft = useGetDraggedEventDraft();
    const [date, setDate] = React.useState(new Date());
    const [resources, setResources] = React.useState(resourceData)

    const updateResourcesOnDrag = React.useCallback(
        (draft: DraggedEventDraft) => {
            setResources((prev: any) => {
                const {event, from, to, resourceId} = draft;

                return prev.map((res: any) => {
                    // ✅ if this is the new target resource
                    if (res.id === resourceId) {
                        // was the event originally in a different resource?
                        const wasDifferentResource = event.resourceId !== resourceId;

                        // clone event with new times and resourceId
                        const updatedEvent = {
                            ...event,
                            from,
                            to,
                            resourceId,
                        };

                        return {
                            ...res,
                            events: wasDifferentResource
                                // if moved from another resource, append it here
                                ? [...res.events, updatedEvent]
                                // else update it in place
                                : res.events.map((e: any) => (e.id === event.id ? updatedEvent : e)),
                        };
                    }

                    // ✅ if this is the old resource and event moved away
                    if (res.id === event.resourceId && event.resourceId !== resourceId) {
                        return {
                            ...res,
                            events: res.events.filter((e: any) => e.id !== event.id),
                        };
                    }

                    // ✅ untouched resources
                    return res;
                });
            });
        },
        [setResources]
    );

    return (
        <SafeAreaView style={{backgroundColor: "#fff", flex: 1}} edges={["top"]}>
            <Calendar
                theme={{
                    typography: {
                        fontFamily: 'NunitoSans',
                    },
                }}
                resources={resources}
                date={date}
                startMinutes={8 * 60}
                numberOfColumns={3}
            />
            {
                selectedEvent && <View style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                }}>
                    <Button
                        title="Cancel"
                        onPress={() => {
                            setSelectedEvent(null);
                        }}
                    />
                    <Button
                        title="Save"
                        onPress={() => {
                            if (draggedEventDraft) {
                                updateResourcesOnDrag(draggedEventDraft!);
                            }
                            setSelectedEvent(null);
                        }}
                    />
                </View>
            }
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    separator: {
        marginVertical: 30,
        height: 1,
        width: '80%',
    },
});

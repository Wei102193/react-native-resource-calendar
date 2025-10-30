import React from 'react';
import {StyleSheet, TouchableOpacity, View} from 'react-native';
import {Calendar, DraggedEventDraft, useCalendarBinding, Event, LayoutMode} from "react-native-resource-calendar";
import {SafeAreaView} from "react-native-safe-area-context";
import {ThemedText} from "@/components/ThemedText";
import {resourceData} from "@/app/(tabs)/fakeData";
import EventTopRight from "@/components/EventTopRight";
import {FontAwesome} from "@expo/vector-icons";

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
    const [resources, setResources] = React.useState(resourceData);
    const [hourHeight, setHourHeight] = React.useState(120);
    const [numberOfColumns, setNumberOfColumns] = React.useState(3);
    const [layoutMode, setLayoutMode] = React.useState<LayoutMode>('stacked');

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

    const eventStyleOverrides = (event: Event) => {
        const bg = statusColor(event.meta?.status)
        return {container: {backgroundColor: bg}};
    };

    const statusColor = (status: number) => {
        switch (status) {
            case 1:
                return "#4d959c"; // Confirmed - Teal
            case 2:
                return "#83C6AE"; // Pending - Orange
            case 3:
                return "#FF8484"; // Cancelled - Red
            case  4:
                return "#95A1D8"; // Rescheduled - Purple
            case 5:
                return "#DAEEE7"; // Completed - Green
            default:
                return "#7f8c8d"; // Default - Gray
        }
    }

    const randomPropsGenerator = () => {
        const randomHourHeight = Math.floor(Math.random() * (120 - 60 + 1)) + 60;
        const randomNumberOfColumns = Math.floor(Math.random() * (5 - 1 + 1)) + 1;
        setHourHeight(randomHourHeight);
        setNumberOfColumns(randomNumberOfColumns);
        setLayoutMode(layoutMode === 'stacked' ? 'columns' : 'stacked');
    }

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
                numberOfColumns={numberOfColumns}
                hourHeight={hourHeight}
                eventSlots={{
                    // Body: ({event, ctx}) => <EventBody event={event} ctx={ctx}/>,
                    TopRight: ({event, ctx}) => <EventTopRight event={event} ctx={ctx}/>,
                }}
                eventStyleOverrides={eventStyleOverrides}
                overLappingLayoutMode={layoutMode}
            />
            {
                selectedEvent && <View style={styles.bar}>
                    <TouchableOpacity
                        style={styles.button}
                        onPress={() => {
                            setSelectedEvent(null);
                        }}
                    >
                        <ThemedText type={'defaultSemiBold'} style={{
                            color: "#4d959c"
                        }}>
                            Cancel
                        </ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.button, {backgroundColor: "#4d959c"}]}
                        onPress={() => {
                            if (draggedEventDraft) {
                                updateResourcesOnDrag(draggedEventDraft!);
                            }
                            setSelectedEvent(null);
                        }}
                    >
                        <ThemedText type={'defaultSemiBold'}
                                    style={{
                                        color: "#fff"
                                    }}
                        >
                            Save
                        </ThemedText>
                    </TouchableOpacity>
                </View>
            }
            <View style={{
                right: 20,
                bottom: 40,
                position: "absolute",
                gap: 12
            }}>
                <TouchableOpacity
                    style={styles.floatingButton}
                    onPress={() => {
                        setDate(new Date());
                    }}
                >
                    <View
                        style={{
                            width: 16,
                            height: 16,
                            backgroundColor: "#4d959c",
                            borderRadius: 99
                        }}
                    />
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.floatingButton}
                    onPress={randomPropsGenerator}
                >
                    <FontAwesome name="random" size={16} color="#4d959c"/>
                </TouchableOpacity>
            </View>
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
    bar: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        padding: 8,
        justifyContent: 'space-evenly',
        backgroundColor: 'rgba(255,255,255,0.7)',
        borderTopColor: '#ccc',
        borderTopWidth: 1,
        zIndex: 98,
        elevation: 2,
        pointerEvents: 'box-none',
        flexDirection: "row"
    },
    button: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 8,
        margin: 8,
        borderWidth: 1,
        borderColor: "#4d959c",
        borderRadius: 5,
        flex: 1,
        flexDirection: 'row',
    },
    floatingButton: {
        width: 40,
        height: 40,
        backgroundColor: "#fff",
        zIndex: 9999,
        borderRadius: 5,
        justifyContent: "center",
        borderColor: "#ccc",
        borderWidth: 1,
        alignItems: "center"
    }
});

# 🗓️ react-native-resource-calendar

A flexible, performant, and themeable React Native calendar for scheduling apps — built with Zustand, Reanimated, and
Expo compatibility.

---

## ✨ Features

- ✅ Multi-resource/multi-days timeline layout
- 🎨 Customizable event slots (Body, TopRight)
- 📱 Smooth Reanimated drag-and-drop
- 🪶 Lightweight and Expo-ready

---

## 🎬 Demo

https://github.com/user-attachments/assets/68fe0283-73ce-4689-8241-6587b817ecbd

---

## 📦 Installation

```bash
npm install react-native-resource-calendar
# or
yarn add react-native-resource-calendar
```

## ⚙️ Peer Dependencies

This library relies on several React Native ecosystem packages that must be installed in your app.
If you’re using Expo, run the following to ensure compatible versions:

```bash
npx expo install \
react-native-gesture-handler \
react-native-reanimated \
react-native-svg \
@shopify/flash-list \
@shopify/react-native-skia 
```

If you’re using bare React Native (not Expo), install them manually:

```bash
npm install \
react-native-gesture-handler \
react-native-reanimated \
react-native-svg \
@shopify/flash-list \
@shopify/react-native-skia 
```

🟦 Optional: Haptics Support (Expo Only)

Haptic feedback is optional.
If you want to enable vibration feedback when interacting with components, install the Expo Haptics package and set
enableHapticFeedback to true in your component config.

📦 Install (Expo)

```bash
npx expo install expo-haptics
```

---

## 🚀 Quick Start

Follow these steps to get started quickly with **React Native Resource Calendar**.

### 1️⃣ Wrap your app with CalendarBindingProvider

### 2️⃣ Feed the Calendar component with resources and events

### 3️⃣ Use hooks from useCalendarBinding to interact with the calendar state

```tsx
import React from 'react';
import {StyleSheet, TouchableOpacity, View} from 'react-native';
import {Calendar, DraggedEventDraft, Event, LayoutMode, useCalendarBinding} from "react-native-resource-calendar";
import {SafeAreaView} from "react-native-safe-area-context";
import {ThemedText} from "@/components/ThemedText";
import EventTopRight from "@/components/EventTopRight";
import {FontAwesome} from "@expo/vector-icons";
import {statusColor} from "@/utilities/helpers";
import {resourceData} from "@/assets/fakeData";

export default function App() {
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
                const {event, from, to, resourceId, date} = draft;

                return prev.map((res: any) => {
                    if (res.id === resourceId) {
                        // was the event originally in a different resource?
                        const wasDifferentResource = event.resourceId !== resourceId;

                        // clone event with new times and resourceId
                        const updatedEvent = {
                            ...event,
                            from,
                            to,
                            resourceId,
                            date
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

                    if (res.id === event.resourceId && event.resourceId !== resourceId) {
                        return {
                            ...res,
                            events: res.events.filter((e: any) => e.id !== event.id),
                        };
                    }

                    return res;
                });
            });
        },
        [setResources]
    );

    const eventStyleOverrides = (event: Event) => {
        const bg = statusColor(event.meta?.status)
        return {container: {backgroundColor: bg}, time: {color: "black"}};
    };

    const randomPropsGenerator = () => {
        const randomHourHeight = Math.floor(Math.random() * (120 - 60 + 1)) + 60;
        const randomNumberOfColumns = Math.floor(Math.random() * (5 - 1 + 1)) + 1;
        setHourHeight(randomHourHeight);
        setNumberOfColumns(randomNumberOfColumns);
        setLayoutMode(layoutMode === 'stacked' ? 'columns' : 'stacked');
    }

    const addDays = (days: number) => {
        const newDate = new Date(date);
        newDate.setDate(newDate.getDate() + days);
        setDate(newDate);
    };

    return (
        <SafeAreaView style={{backgroundColor: "#fff", flex: 1}} edges={["top"]}>
            <Calendar
                // mode={'week'}
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
```

---

## ⚙️ Calendar Props

The `Calendar` component accepts a flexible set of props for customizing layout, theme, and interactivity.

| Prop                        | Type                                                                                                             | Default                 | Description                                                                                                                             |
|-----------------------------|------------------------------------------------------------------------------------------------------------------|-------------------------|-----------------------------------------------------------------------------------------------------------------------------------------|
| **`date`**                  | `Date`                                                                                                           | `new Date()`            | The anchor day shown in the timeline. In multi-day modes this is the **first** visible day.                                             |
| **`mode`**                  | `CalendarMode` (`'day' \| '3days' \| 'week'`)                                                                    | `'day'`                 | Controls the column semantics. **day** = many resources for one day. **3days/week** = several days for one resource.                    |
| **`activeResourceId`**      | `number`                                                                                                         | first `resources[0].id` | When `mode !== 'day'`, columns represent days for **this** resource.                                                                    |
| **`resources`**             | `Array<Resource & { events: Event[]; disabledBlocks?: DisabledBlock[]; disableIntervals?: DisabledInterval[] }>` | **required**            | Resource columns. Each resource includes its day’s `events`, optional `disabledBlocks`, and `disableIntervals`.                         |
| **`timezone`**              | `string`                                                                                                         | device time zone        | Used for time labels and converting block taps to a `Date`.                                                                             |
| **`startMinutes`**          | `number`                                                                                                         | `0`                     | Start of visible timeline in minutes after midnight (e.g. `8 * 60` = 08:00).                                                            |
| **`numberOfColumns`**       | `number`                                                                                                         | `3`                     | **Day mode only.** How many resource columns to show side-by-side. (In multi-day modes, the column count is fixed by the mode: 3 or 7.) |
| **`hourHeight`**            | `number`                                                                                                         | `120`                   | Vertical density, px per hour. Affects drag/resize and scroll snap.                                                                     |
| **`snapIntervalInMinutes`** | `number`                                                                                                         | `5`                     | Drag/resize snapping granularity (in minutes).                                                                                          |
| **`overLappingLayoutMode`** | `LayoutMode` (`'stacked' \| 'columns'`)                                                                          | `'stacked'`             | Strategy to lay out overlapping events inside a column.                                                                                 |
| **`theme`**                 | `CalendarTheme`                                                                                                  | —                       | Typography & palette overrides.                                                                                                         |
| **`enableHapticFeedback`**  | `boolean`                                                                                                        | `false`                 | Enable haptic feedback.                                                                                                                 |
| **`eventSlots`**            | `EventSlots`                                                                                                     | —                       | Slot renderers to customize event content (e.g. `{ Body, TopRight }`).                                                                  |
| **`eventStyleOverrides`**   | `StyleOverrides \| ((event: Event) => StyleOverrides \| undefined)`                                              | —                       | Per-event style override (object or function).                                                                                          |
| **`isEventSelected`**       | `(event: Event) => boolean`                                                                                      | `() => false`           | Marks which events are currently selected.                                                                                              |
| **`isEventDisabled`**       | `(event: Event) => boolean`                                                                                      | `() => false`           | Marks events as disabled (non-interactive).                                                                                             |
| **`onResourcePress`**       | `(resource: Resource) => void`                                                                                   | —                       | Invoked when a resource header is pressed.                                                                                              |
| **`onBlockLongPress`**      | `(resource: Resource, date: Date) => void`                                                                       | —                       | Long-press on an empty block (grid).                                                                                                    |
| **`onBlockTap`**            | `(resource: Resource, date: Date) => void`                                                                       | —                       | Tap on an empty block (grid).                                                                                                           |
| **`onDisabledBlockPress`**  | `(block: DisabledBlock) => void`                                                                                 | —                       | Tap on a disabled block (e.g., lunch).                                                                                                  |
| **`onEventPress`**          | `(event: Event) => void`                                                                                         | —                       | Tap on an event.                                                                                                                        |
| **`onEventLongPress`**      | `(event: Event) => void`                                                                                         | —                       | Long-press on an event. The calendar also preps internal drag state here.                                                               |

---

### 🧩 Related Types

```ts
type ResourceId = number;

type Event = {
    id: number;
    resourceId: ResourceId;
    date: string; // 'yyyy-MM-dd' eg. '2025-11-09'
    from: number;
    to: number;
    title?: string;
    description?: string;
    meta?: {
        [key: string]: any;
    }
};

type DisabledBlock = {
    id: number;
    resourceId: ResourceId;
    date: string; // 'yyyy-MM-dd' eg. '2025-11-09'
    from: number;
    to: number;
    title?: string;
};

type DisabledInterval = {
    resourceId: ResourceId;
    date: string; // 'yyyy-MM-dd' eg. '2025-11-09'
    from: number;
    to: number;
};

type Resource = {
    id: ResourceId;
    name: string;
    avatar?: string;
};

type DraggedEventDraft = {
    event: Event,
    date: string; // 'yyyy-MM-dd' eg. '2025-11-09'
    from: number,
    to: number,
    resourceId: ResourceId
}

type CalendarTheme = {
    typography?: {
        fontFamily?: string;
    };
};

type CalendarMode = 'day' | '3days' | 'week';
```

---

## 💫 Support the Project

If you find this project helpful or interesting, please consider giving it a **⭐️** on GitHub!

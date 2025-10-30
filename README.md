# 🗓️ react-native-resource-calendar

A flexible, performant, and themeable React Native calendar for scheduling apps — built with Zustand, Reanimated, and
Expo compatibility.

---

## ✨ Features

- ✅ Multi-resource timeline layout
- 🎨 Customizable event slots (Body, TopRight)
- 📱 Smooth Reanimated drag-and-drop
- ⏰ Timezone-aware time labels
- 🧩 Modular store (Zustand binding by default)
- 🖌️ Theme support (font families, weights)
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
@shopify/react-native-skia \
expo-haptics
```

If you’re using bare React Native (not Expo), install them manually:

```bash
npm install \
react-native-gesture-handler \
react-native-reanimated \
react-native-svg \
@shopify/flash-list \
@shopify/react-native-skia \
expo-haptics
```

---

## 🚀 Quick Start

Follow these steps to get started quickly with **React Native Resource Calendar**.

### 1️⃣ Wrap your app with CalendarBindingProvider

### 2️⃣ Feed the Calendar component with resources and events

### 3️⃣ Use hooks from useCalendarBinding to interact with the calendar state

```tsx
import React from 'react';
import {Button, View} from 'react-native';
import {Calendar, DraggedEventDraft, useCalendarBinding} from "react-native-resource-calendar";
import {resourceData} from "@/app/(tabs)/fakeData";
import {statusColor} from "@/utilities/helpers";

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
                const {event, from, to, resourceId} = draft;

                return prev.map((res: any) => {
                    if (res.id === resourceId) {
                        const wasDifferentResource = event.resourceId !== resourceId;

                        const updatedEvent = {
                            ...event,
                            from,
                            to,
                            resourceId,
                        };

                        return {
                            ...res,
                            events: wasDifferentResource
                                ? [...res.events, updatedEvent]
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
        return {container: {backgroundColor: bg}};
    };

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
```

---

## ⚙️ Calendar Props

The `Calendar` component accepts a flexible set of props for customizing layout, theme, and interactivity.

| Prop                        | Type                                                                                                             | Default          | Description                                                                                                                               |
|-----------------------------|------------------------------------------------------------------------------------------------------------------|------------------|-------------------------------------------------------------------------------------------------------------------------------------------|
| **`date`**                  | `Date`                                                                                                           | `new Date()`     | The current date displayed in the calendar.                                                                                               |
| **`resources`**             | `Array<Resource & { events: Event[]; disabledBlocks?: DisabledBlock[]; disableIntervals?: DisabledInterval[] }>` | **required**     | Columns to render. Each resource can provide its own events and optional disabled ranges.                                                 |
| **`timezone`**              | `string`                                                                                                         | device time zone | Time zone used for time labels and taps-to-date conversion.                                                                               |
| **`startMinutes`**          | `number`                                                                                                         | `0` (00:00)      | Start of the visible timeline in minutes from midnight (e.g. `8 * 60` = 08:00).                                                           |
| **`numberOfColumns`**       | `number`                                                                                                         | `3`              | How many resource columns to show side-by-side.                                                                                           |
| **`hourHeight`**            | `number`                                                                                                         | `120`            | Vertical scale: pixels used to render 1 hour. (Affects scrolling/snapping.)                                                               |
| **`snapIntervalInMinutes`** | `number`                                                                                                         | `5`              | Drag/resize snapping granularity in minutes.                                                                                              |
| **`overLappingLayoutMode`** | `LayoutMode` (`'stacked' \| 'columns'`)                                                                          | `'stacked'`      | Strategy for laying out overlapping events within a column.                                                                               |
| **`theme`**                 | `CalendarTheme`                                                                                                  | —                | Theme overrides (typography).                                                                                                             |
| **`eventSlots`**            | `EventSlots`                                                                                                     | —                | Slot renderers to customize event content. (Common keys: `Body`, `TopRight`.) Example: `{ Body: ({event}) => <MyBody event={event} /> }`. |
| **`eventStyleOverrides`**   | `StyleOverrides \| ((event: Event) => StyleOverrides \| undefined)`                                              | —                | Per-event styling override (e.g., background, border, radius). Function form lets you style by event.                                     |
| **`isEventSelected`**       | `(event: Event) => boolean`                                                                                      | `() => false`    | Tell the calendar which events are currently selected.                                                                                    |
| **`isEventDisabled`**       | `(event: Event) => boolean`                                                                                      | `() => false`    | Mark events as disabled (non-interactive).                                                                                                |
| **`onResourcePress`**       | `(resource: Resource) => void`                                                                                   | —                | Fired when a resource header is pressed.                                                                                                  |
| **`onBlockLongPress`**      | `(resource: Resource, date: Date) => void`                                                                       | —                | Fired when the user long-presses an empty time block in a column.                                                                         |
| **`onDisabledBlockPress`**  | `(block: DisabledBlock) => void`                                                                                 | —                | Fired when a disabled block (e.g., lunch) is tapped.                                                                                      |
| **`onEventPress`**          | `(event: Event) => void`                                                                                         | —                | Fired when an event is tapped.                                                                                                            |
| **`onEventLongPress`**      | `(event: Event) => void`                                                                                         | —                | Fired when an event is long-pressed. (The calendar also prepares internal drag state at this time.)                                       |

---

### 🧩 Related Types

```ts
type ResourceId = number;

type Event = {
    id: number;
    resourceId: ResourceId;
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
    from: number;
    to: number;
    title?: string;
};

type DisabledInterval = {
    resourceId: ResourceId;
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
    from: number,
    to: number,
    resourceId: ResourceId
}

type CalendarTheme = {
    typography?: {
        fontFamily?: string;
    };
};
```

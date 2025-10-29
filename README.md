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

[🎬 Watch the demo]
<video src="./docs/demo.mp4" width="100%" controls muted playsinline>
Your browser does not support the video tag.
</video>

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

## 🚀 Quick Start

Follow these steps to get started quickly with **React Native Resource Calendar**.

---

### 1️⃣ Wrap your app with CalendarBindingProvider

### 2️⃣ Feed the Calendar component with resources and events

### 3️⃣ Use hooks from useCalendarBinding to interact with the calendar state

```tsx
import React from 'react';
import {Button, StyleSheet, View} from 'react-native';
import {Calendar, DraggedEventDraft, useCalendarBinding} from "react-native-resource-calendar";

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
];

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
    const [resources, setResources] = React.useState(resourceData)

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

    return (
        <CalendarBindingProvider>
            <View style={{flex: 1}}>
                <Calendar
                    resources={resources}
                    date={date}
                    startMinutes={8 * 60}
                    numberOfColumns={3}
                />
                {
                    selectedEvent && <View style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between'
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
            </View>
        </CalendarBindingProvider>
    );
}
```

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
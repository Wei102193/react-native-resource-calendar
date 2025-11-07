export type ResourceId = number;

export type Event = {
    id: number;
    resourceId: ResourceId;
    date: string; // 'yyyy-MM-dd'
    from: number;
    to: number;
    title?: string;
    description?: string;
    meta?: {
        [key: string]: any;
    }
};

export type DisabledBlock = {
    id: number;
    resourceId: ResourceId;
    date: string; // 'yyyy-MM-dd'
    from: number;
    to: number;
    title?: string;
};

export type DisabledInterval = {
    resourceId: ResourceId;
    date: string; // 'yyyy-MM-dd'
    from: number;
    to: number;
};

export type Resource = {
    id: ResourceId;
    name: string;
    avatar?: string;
};

export type DraggedEventDraft = {
    event: Event;
    date: string; // 'yyyy-MM-dd'
    from: number;
    to: number;
    resourceId: ResourceId;
}

export type CalendarTheme = {
    typography?: {
        /** Expo-registered font name */
        fontFamily?: string;
    };
};

export type LayoutMode = "columns" | "stacked";

export type EventRenderContext = {
    hourHeight: number;
};

export type CalendarMode = 'day' | '3days' | 'week';
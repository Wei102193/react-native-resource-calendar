export type ResourceId = number;

export type Event = {
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

export type DisabledBlock = {
    id: number;
    resourceId: ResourceId;
    from: number;
    to: number;
    title?: string;
};

export type DisabledInterval = {
    resourceId: ResourceId;
    from: number;
    to: number;
};

export type Resource = {
    id: ResourceId;
    name: string;
    avatar?: string;
};

export type DraggedEventDraft = {
    event: Event,
    from: number,
    to: number,
    resourceId: ResourceId
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
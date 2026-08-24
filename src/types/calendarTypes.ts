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
    /** Arbitrary consumer data, carried through to `resourceSlots` renderers. */
    meta?: {
        [key: string]: any;
    }
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

export type ResourceRenderContext = {
    /** Width of the resource header column, in px. */
    width: number;
    /** Day the header is rendered for. */
    date: Date;
    /** Number of events the resource has on `date`. */
    eventCount: number;
};

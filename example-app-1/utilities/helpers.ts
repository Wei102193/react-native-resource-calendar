import {Event} from "react-native-resource-calendar";

export const statusColor = (status: number) => {
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

// Statuses that represent finished business — these bookings can still be
// tapped, but must not be dragged or resized on the timeline.
const LOCKED_STATUSES = [3, 5]; // 3 = Cancelled, 5 = Completed

export const isEventLocked = (event: Event): boolean =>
    LOCKED_STATUSES.includes(event?.meta?.status);

export const resourceData = [
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
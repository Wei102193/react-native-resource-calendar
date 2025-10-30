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
                meta: { status: 5, preferred: true, note: "High-priority recovery client with weekly check-ins." },
            },
            {
                id: 103,
                resourceId: 1,
                from: 8 * 60 + 45, // 8:45 AM
                to: 9 * 60 + 30,   // 9:30 AM
                title: "PT Follow-up",
                description: "Overlap to test conflict handling",
                meta: { status: 2, preferred: false, note: "Double-booked slot for conflict testing." },
            },
            {
                id: 102,
                resourceId: 1,
                from: 10 * 60,
                to: 11 * 60,
                title: "Mobility Assessment",
                description: "Initial consultation",
                meta: { status: 3, preferred: false },
            },
            {
                id: 104,
                resourceId: 1,
                from: 10 * 60 + 30, // 10:30 AM
                to: 11 * 60 + 30,   // 11:30 AM
                title: "Gait Analysis",
                description: "Overlapping with assessment",
                meta: { status: 4, preferred: true, note: "Intended overlap for triage." },
            },
        ],
        disabledBlocks: [
            { id: 1001, resourceId: 1, from: 12 * 60, to: 13 * 60, title: "Lunch Break" },
        ],
        disableIntervals: [
            { resourceId: 1, from: 17 * 60, to: 24 * 60 },
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
                from: 9 * 60 + 30,
                to: 10 * 60 + 30,
                title: "Personal Training",
                meta: { status: 4, preferred: true, note: "Client focusing on weight loss — adjust cardio intensity." },
            },
            {
                id: 202,
                resourceId: 2,
                from: 15 * 60,
                to: 16 * 60,
                title: "Endurance Coaching",
                meta: { status: 2, preferred: false },
            },
            {
                id: 203,
                resourceId: 2,
                from: 15 * 60 + 15, // 3:15 PM
                to: 16 * 60 + 15,   // 4:15 PM
                title: "VO₂ Max Test",
                meta: { status: 5, preferred: true, note: "Intentional overlap with coaching." },
            },
        ],
        disabledBlocks: [
            { id: 2001, resourceId: 2, from: 13 * 60, to: 14 * 60, title: "Staff Meeting" },
        ],
        disableIntervals: [
            { resourceId: 2, from: 7 * 60, to: 8 * 60 },
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
                meta: { status: 1, preferred: true, note: "Repeat client — shoulder strain recovery." },
            },
            {
                id: 303,
                resourceId: 3,
                from: 11 * 60 + 30, // 11:30 AM
                to: 12 * 60 + 30,   // 12:30 PM
                title: "Trigger Point Therapy",
                meta: { status: 3, preferred: false, note: "Overlaps lunch slightly." },
            },
            {
                id: 302,
                resourceId: 3,
                from: 14 * 60 + 15,
                to: 15 * 60,
                title: "Deep Tissue Massage",
                meta: { status: 5, preferred: false, note: "Requested deeper pressure than usual." },
            },
        ],
        disabledBlocks: [
            { id: 3001, resourceId: 3, from: 12 * 60, to: 13 * 60, title: "Lunch" },
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
                meta: { status: 4, preferred: true, note: "Client transitioning to a new macro plan." },
            },
            {
                id: 402,
                resourceId: 4,
                from: 13 * 60 + 30, // 1:30 PM
                to: 14 * 60 + 30,   // 2:30 PM
                title: "Supplement Consultation",
                description: "Overlap to test scheduler",
                meta: { status: 2, preferred: false, note: "Partial overlap intended." },
            },
        ],
        disableIntervals: [
            { resourceId: 4, from: 18 * 60, to: 24 * 60 },
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
                meta: { status: 2, preferred: true, note: "Full class expected; ensure space availability." },
            },
            {
                id: 502,
                resourceId: 5,
                from: 17 * 60 + 15, // 5:15 PM
                to: 17 * 60 + 45,   // 5:45 PM
                title: "One-on-One Yoga Intro",
                description: "Intentional overlap with group class",
                meta: { status: 3, preferred: false, note: "Short overlapping session." },
            },
        ],
        disabledBlocks: [
            { id: 5001, resourceId: 5, from: 12 * 60 + 30, to: 13 * 60 + 30, title: "Lunch Break" },
        ],
    },

    // --- New Resource 6 with overlapping events ---
    {
        id: 6,
        name: "Fatima Noor",
        avatar: "https://randomuser.me/api/portraits/women/66.jpg",
        events: [
            {
                id: 601,
                resourceId: 6,
                from: 9 * 60,   // 9:00 AM
                to: 10 * 60,    // 10:00 AM
                title: "Pilates Session",
                description: "Core stability focus",
                meta: { status: 3, preferred: true, note: "Client recovering from lower back pain." },
            },
            {
                id: 602,
                resourceId: 6,
                from: 9 * 60 + 30, // 9:30 AM
                to: 10 * 60 + 30,  // 10:30 AM
                title: "Reformer Intro",
                description: "Overlap to simulate double-booking",
                meta: { status: 5, preferred: false, note: "New client; may reschedule." },
            },
            {
                id: 603,
                resourceId: 6,
                from: 16 * 60, // 4:00 PM
                to: 17 * 60 + 30, // 5:30 PM
                title: "Injury Prevention Workshop",
                meta: { status: 4, preferred: true, note: "Team session; room booking required." },
            },
        ],
        disabledBlocks: [
            { id: 6001, resourceId: 6, from: 12 * 60, to: 12 * 60 + 30, title: "Break" },
        ],
        disableIntervals: [
            { resourceId: 6, from: 19 * 60, to: 24 * 60 },
        ],
    },

    // --- New Resource 7 with multiple overlaps ---
    {
        id: 7,
        name: "George Patel",
        avatar: "https://randomuser.me/api/portraits/men/77.jpg",
        events: [
            {
                id: 701,
                resourceId: 7,
                from: 10 * 60,   // 10:00 AM
                to: 11 * 60,     // 11:00 AM
                title: "Strength Screening",
                meta: { status: 2, preferred: true, note: "Baseline measurements." },
            },
            {
                id: 702,
                resourceId: 7,
                from: 10 * 60 + 45, // 10:45 AM
                to: 12 * 60,        // 12:00 PM
                title: "Kettlebell Clinic",
                meta: { status: 5, preferred: false, note: "Overlaps screening; conflict edge case." },
            },
            {
                id: 703,
                resourceId: 7,
                from: 11 * 60 + 30, // 11:30 AM
                to: 12 * 60 + 30,   // 12:30 PM
                title: "Functional Movement Test",
                meta: { status: 1, preferred: false, note: "Second overlap creating a chain." },
            },
        ],
        disabledBlocks: [
            { id: 7001, resourceId: 7, from: 13 * 60, to: 13 * 60 + 30, title: "Admin Time" },
        ],
        disableIntervals: [
            { resourceId: 7, from: 18 * 60, to: 24 * 60 },
        ],
    },
];

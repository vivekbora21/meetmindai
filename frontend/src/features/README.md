# MeetingMind AI Frontend Features Directory

This directory contains the core domain features of the application, structured using a modular, feature-based architecture.

## Folders & Architecture Overview

```
features/
├── chat/
│   ├── components/       # UI components isolated to the Chat feature
│   │   ├── ChatBubble.tsx
│   │   ├── ChatHeader.tsx
│   │   ├── ChatHistory.tsx
│   │   ├── ChatWindow.tsx
│   │   ├── MessageInput.tsx
│   │   └── SuggestedQuestions.tsx
│   ├── hooks/            # Custom hooks encapsulating Chat business logic
│   │   └── useChat.ts
│   ├── services/         # API service helpers for Chat endpoint communication
│   │   └── chat.service.ts
│   └── types/            # Type definitions for Chat entities
│       └── chat.ts
└── meetings/
    ├── components/       # UI components isolated to the Meetings feature
    │   ├── FullTranscript.tsx
    │   ├── IngestionPipelineTracker.tsx
    │   ├── MeetingActionItems.tsx
    │   ├── MeetingDecisions.tsx
    │   ├── MeetingHeader.tsx
    │   ├── MeetingPlayer.tsx
    │   ├── MeetingRisks.tsx
    │   ├── MeetingSummary.tsx
    │   ├── MeetingTabs.tsx
    │   ├── MeetingTechnical.tsx
    │   └── RecordingUploadZone.tsx
    ├── hooks/            # Custom hooks encapsulating Meeting business logic
    │   └── useMeeting.ts
    ├── services/         # API service helpers for Meeting endpoint communication
    │   └── meeting.service.ts
    └── types/            # Type definitions for Meeting entities
        └── meeting.ts
```

## Architectural Guidelines

1. **Single Responsibility**: Each UI component is limited to rendering its state and executing event callbacks. All network requests are routed to specific **Services**, and all application state / side effects reside inside custom **Hooks**.
2. **Component Boundaries**: Component files are kept concise (target size 50-150 lines) to ensure high maintainability and testability.
3. **Cross-Feature Communication**: Features must not directly access components of other features. Any integration must happen at the page container level or through generic shared components.

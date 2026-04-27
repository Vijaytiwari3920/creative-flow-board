
# Kanban Board with AI Assistant

A gorgeous, interactive Kanban board with an integrated AI chatbot that knows your board and can manage tasks for you.

## Visual direction

Crisp & minimal, inspired by the ofspace reference:
- Clean white background, soft gray surfaces, generous whitespace
- Colored chips for tags and priority (blue / amber / red)
- Subtle card shadows that lift on hover
- Rounded corners, light borders, no heavy gradients
- Typography: clean sans-serif, strong hierarchy

## Layout

```text
┌──────────────┬─────────────────────────────────────────────┬──────────┐
│              │  Search • Filters • + New Task              │          │
│   Sidebar    ├─────────────────────────────────────────────┤   AI    │
│              │  ┌──────┐ ┌────────────┐ ┌──────┐ ┌──────┐ │   Chat  │
│  • Board     │  │To Do │ │In Progress │ │Review│ │ Done │ │ (slide  │
│  • Settings  │  │      │ │            │ │      │ │      │ │  panel) │
│  • Profile   │  │ card │ │   card     │ │ card │ │ card │ │         │
│              │  │ card │ │   card     │ │      │ │      │ │         │
│              │  └──────┘ └────────────┘ └──────┘ └──────┘ │         │
└──────────────┴─────────────────────────────────────────────┴──────────┘
```

A floating chat button in the bottom-right opens the AI panel.

## Features

### Board
- Four columns: **To Do**, **In Progress**, **Review**, **Done** (each with a colored dot and live count)
- **Drag-and-drop** cards between columns with smooth ghost preview and snap animation
- Cards animate in when added, fade/scale out when removed, slide when moved
- Hover: cards subtly lift, action buttons fade in
- Click a card to open a detail panel for editing
- Empty-column placeholder with a "+ Add task" hint

### Task cards show
- Title (bold) and description preview
- **Priority badge** (Low = blue, Medium = amber, High = red)
- **Due date** with overdue highlighting in red
- Quick actions on hover: edit, delete, move

### Add / edit task
- Modal with: title, description, priority (Low/Med/High), due date picker, target column
- Validation on title required

### Authentication
- Email/password + Google sign-in via Lovable Cloud
- Login and signup pages; board is private to each user
- Each user sees only their own tasks

### AI Chatbot
A slide-in side panel with a streaming chat interface:
- **Read & summarize the board**: "What's overdue?", "Summarize what's in progress", "How many high-priority tasks do I have?"
- **Create tasks via chat**: "Add a task to fix the login bug, high priority, due Friday" → card appears in To Do with animation
- **Move tasks via chat**: "Move 'Fix login bug' to In Progress" → card animates to the new column
- **Answer general questions**: works as a normal assistant when the question isn't about the board
- Messages render with markdown support
- Conversation history persists per user

## Pages & routes

- `/` — Kanban board (protected, redirects to /auth if logged out)
- `/auth` — login / signup with email + Google

## Technical notes

- **Storage**: Lovable Cloud (Supabase). Tables: `tasks` (user_id, title, description, status, priority, due_date, position, timestamps) and `chat_messages` (user_id, role, content, timestamp). RLS so users only see their own rows.
- **Auth**: Supabase Auth with email/password and Google provider. `onAuthStateChange` listener set up before `getSession`.
- **Drag-and-drop**: `@dnd-kit/core` + `@dnd-kit/sortable` for accessible, animated DnD.
- **AI**: Edge function `chat` proxies to Lovable AI Gateway (`google/gemini-3-flash-preview`) with streaming SSE. The function exposes tool calls (`create_task`, `move_task`, `list_tasks`) so the model can read and mutate the board; mutations execute server-side using the user's JWT. Frontend renders streamed tokens with `react-markdown`.
- **Animations**: Tailwind keyframes (fade-in, scale-in, slide-in-right) + dnd-kit's built-in motion.
- **State**: TanStack Query for tasks; optimistic updates on drag/create/delete.

## Out of scope (can add later)

- Multiple boards / projects
- Team collaboration & assignees
- Tags/labels, attachments, comments
- Calendar view, analytics dashboard
- Custom columns

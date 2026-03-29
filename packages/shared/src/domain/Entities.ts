export interface Note {
    id: string;
    title: string;
    content: string;
    createdAt: number;
    updatedAt: number;
    tags: string[];
    notebookId?: string;     // Belongs to a notebook (null = uncategorized)
    parentId?: string;       // Sub-page parent (null = top-level)
    titleLocked?: boolean;   // If true, title was manually renamed from sidebar and won't auto-sync from editor
}

export interface Notebook {
    id: string;
    name: string;
    icon: string;            // Emoji or icon identifier
    createdAt: number;
    collapsed?: boolean;     // UI state: collapsed in sidebar
}

export type ReminderTiming =
    | 'before-start'
    | 'at-start'
    | 'after-start'
    | 'at-midpoint'
    | 'before-end'
    | 'at-end'
    | 'after-end'
    | 'on-date';

export interface ReminderConfig {
    id: string;
    timing: ReminderTiming;
    minutesBefore?: number;
    minutesAfter?: number;
    dateTimestamp?: number;
    timeString?: string;
}

export type TaskState = 'pending' | 'working' | 'done';

export interface Task {
    id: string;
    listId: string;
    text: string;
    state: TaskState;
    assigneeId?: string;
    dueDate?: number;        // Timestamp
    description?: string;
    createdAt: number;
    completedAt?: number;
    
    // Linked Event Features
    subtasks?: Array<{ id: string; text: string; done: boolean }>;
    linkedEventId?: string;
    taskColor?: string;
    taskLinks?: string[];
    taskAttachments?: Array<{ id: string; name: string; type: string; size: number; dataUrl: string }>;
    dueTimeStart?: string;
    dueTimeEnd?: string;
    hasTime?: boolean;
    repeat?: 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';
    reminders?: ReminderConfig[];
}

export interface TaskList {
    id: string;
    name: string;
    poolId: string;
    createdAt: number;
    color?: string;
}

// Local storage structure for user preferences regarding lists
export interface TaskListPreference {
    listId: string;
    hidden: boolean;
}

export interface Pool {
    id: string;
    name: string;
    hostId?: string;
    peers: string[];
    encryptionKey?: string;
    createdAt: number;
    theme: 'light' | 'dark' | 'system';
}

export interface Peer {
    id: string;
    username: string;
    color: string;
    lastSeen: number;
}

export interface UserProfile {
    id: string;
    name: string;
    color: string;
    createdAt: number;
}

export interface PoolInfo {
    id: string;
    name: string;
    icon: string;
    lastOpened: number;
    createdAt: number;
    signalingUrl?: string;
}

// ─── Pomodoro Entities ───

export interface PomodoroSession {
    id: string
    poolId: string
    linkedEventId?: string
    linkedEventTitle?: string
    linkedEventColor?: string
    workMinutes: number
    breakMinutes: number
    longBreakMinutes: number
    sessionsBeforeLongBreak: number
    completedSessions: number
    totalMinutesStudied: number
    createdAt: number
    updatedAt: number
}

// ─── Kanban Entities ───

export interface KanbanBoard {
    id: string;
    poolId: string;
    name: string;
    createdAt: number;
}

export interface KanbanColumn {
    id: string;
    boardId: string;
    name: string;
    color?: string;
    order: number;
}

export interface KanbanCard {
    id: string;
    boardId: string;
    columnId: string;
    title: string;
    description?: string;
    createdAt: number;
    updatedAt: number;
    assigneeId?: string;
}

// ─── Schedule Entities ───

export interface ScheduleBoard {
    id: string;
    poolId: string;
    name: string;
    timeRounding: boolean;
    showWeekends: boolean;
    numberOfWeeks: number | 'custom';
    nonWorkingDays: string[];
    createdAt: number;
}

export type EventColor = 'blue' | 'cyan' | 'teal' | 'green' | 'lime' | 'yellow' | 'orange' | 'red' | 'pink' | 'purple' | 'violet' | 'gray';

export interface ScheduleEvent {
    id: string;
    boardId: string;
    title: string;
    dayOfWeek: number;
    startTime: string; // 'HH:mm' (timeStart)
    endTime: string; // 'HH:mm' (timeEnd)
    color?: EventColor | string;
    professor?: string;
    type?: string;     // eventType
    building?: string;
    room?: string;     // classroom
    
    // Expanded Fields for EventForm
    tema?: string;
    startDate?: number; // timestamp
    endDate?: number;   // timestamp
    allDay?: boolean;
    noteForDay?: string; // Daily user note overlay

    links?: string[];
    attachments?: Array<{
        id: string;
        name: string;
        type: 'image' | 'audio' | 'document';
        size: number;
        dataUrl: string;
    }>;
    
    repeat?: 'none' | 'weekly' | 'daily' | 'custom';
    repeatDay?: string;
    repeatPeriod?: 'manual' | 'auto';
    repeatStart?: number;
    repeatEnd?: number;
    
    reminderEnabled?: boolean;
    reminderMinutes?: number[]; // Legacy array logic
    reminders?: ReminderConfig[];
    
    createdAt: number;
}

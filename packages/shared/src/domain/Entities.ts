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

export interface ScheduleEvent {
    id: string;
    boardId: string;
    title: string;
    dayOfWeek: number;
    startTime: string; // 'HH:mm'
    endTime: string; // 'HH:mm'
    color?: string;
    professor?: string;
    type?: string;
    building?: string;
    room?: string;
    createdAt: number;
}

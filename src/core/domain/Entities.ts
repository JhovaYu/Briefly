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

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  assignee?: string;
  createdAt: number;
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

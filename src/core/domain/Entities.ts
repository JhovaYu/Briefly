export interface Note {
  id: string;
  title: string;
  content: string; // Markdown or JSON content for TipTap
  createdAt: number;
  updatedAt: number;
  tags: string[];
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
  hostId?: string; // Optional, initial creator
  peers: string[]; // List of connected peer IDs
  encryptionKey?: string; // Shared key for E2EE (local only)
  createdAt: number;
  theme: 'light' | 'dark' | 'system';
}

export interface Peer {
  id: string;
  username: string;
  color: string; // Cursor color
  lastSeen: number;
}

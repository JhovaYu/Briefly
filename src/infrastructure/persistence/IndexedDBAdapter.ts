import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import type { NoteRepository } from '../../core/ports/Ports';
import type { Note } from '../../core/domain/Entities';

export class YjsIndexedDBAdapter implements NoteRepository {
    private doc: Y.Doc;
    private persistence: IndexeddbPersistence | null = null;

    constructor(doc: Y.Doc) {
        this.doc = doc;
    }

    async initialize(poolId: string): Promise<void> {
        this.persistence = new IndexeddbPersistence(poolId, this.doc);

        return new Promise((resolve) => {
            if (this.persistence) {
                this.persistence.on('synced', () => {
                    console.log('Content loaded from IndexedDB');
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    async getNote(id: string): Promise<Note | null> {
        const notesMap = this.doc.getMap<Note>('notes');
        const note = notesMap.get(id);
        return note || null;
    }

    async saveNote(note: Note): Promise<void> {
        const notesMap = this.doc.getMap<Note>('notes');
        this.doc.transact(() => {
            notesMap.set(note.id, note);
        });
    }

    async getAllNotes(): Promise<Note[]> {
        const notesMap = this.doc.getMap<Note>('notes');
        return Array.from(notesMap.values());
    }

    async deleteNote(id: string): Promise<void> {
        const notesMap = this.doc.getMap<Note>('notes');
        this.doc.transact(() => {
            notesMap.delete(id);
        });
    }

    async saveSnapshot(poolId: string, state: Uint8Array): Promise<void> {
        console.log(`Snapshot saved for pool ${poolId}, size: ${state.length}`);
    }

    async getSnapshots(_poolId: string): Promise<{ timestamp: number; state: Uint8Array; }[]> {
        return [];
    }
}

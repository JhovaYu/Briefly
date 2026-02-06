import * as Y from 'yjs';
import { YjsWebRTCAdapter } from './network/YjsWebRTCAdapter';
import { YjsIndexedDBAdapter } from './persistence/IndexedDBAdapter';
import type { CollaborationService } from '../core/ports/Ports';
import type { Note, Pool } from '../core/domain/Entities';

export class AppServices implements CollaborationService {
    public doc: Y.Doc;
    public network: YjsWebRTCAdapter;
    public persistence: YjsIndexedDBAdapter;

    constructor() {
        this.doc = new Y.Doc();
        this.network = new YjsWebRTCAdapter(this.doc);
        this.persistence = new YjsIndexedDBAdapter(this.doc);
    }

    async initialize(poolId: string = 'tux-notas-default-pool'): Promise<void> {
        await this.persistence.initialize(poolId);
        await this.network.connect(poolId);
    }

    async createPool(name: string): Promise<Pool> {
        const poolId = `pool-${Math.random().toString(36).substr(2, 9)}`;
        const pool: Pool = {
            id: poolId,
            name: name,
            peers: [],
            createdAt: Date.now(),
            theme: 'system'
        };
        return pool;
    }

    async joinPool(poolId: string, _key?: string): Promise<void> {
        this.network.disconnect();
        this.doc = new Y.Doc();
        this.network = new YjsWebRTCAdapter(this.doc);
        this.persistence = new YjsIndexedDBAdapter(this.doc);
        await this.initialize(poolId);
    }

    async createNote(title: string): Promise<Note> {
        const note: Note = {
            id: Math.random().toString(36).substr(2, 9),
            title,
            content: '',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            tags: []
        };
        await this.persistence.saveNote(note);
        return note;
    }

    async updateNote(id: string, _content: any): Promise<void> {
        const note = await this.persistence.getNote(id);
        if (note) {
            note.updatedAt = Date.now();
            await this.persistence.saveNote(note);
        }
    }

    getProvider() {
        return this.network;
    }
}

export const services = new AppServices();

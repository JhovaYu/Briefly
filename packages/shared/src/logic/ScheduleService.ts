import * as Y from 'yjs';
import type { ScheduleBoard, ScheduleEvent } from '../domain/Entities';

export class ScheduleService {
    private doc: Y.Doc;

    constructor(doc: Y.Doc) {
        this.doc = doc;
    }

    createBoard(name: string, poolId: string): ScheduleBoard {
        const boards = this.doc.getMap<ScheduleBoard>('schedule-boards');
        const id = Math.random().toString(36).substr(2, 9);
        const board: ScheduleBoard = {
            id, poolId, name, timeRounding: true, showWeekends: false, numberOfWeeks: 1, nonWorkingDays: [], createdAt: Date.now()
        };
        this.doc.transact(() => boards.set(id, board));
        return board;
    }

    getBoards(poolId: string): ScheduleBoard[] {
        return Array.from(this.doc.getMap<ScheduleBoard>('schedule-boards').values()).filter(b => b.poolId === poolId);
    }

    updateBoard(boardId: string, updates: Partial<ScheduleBoard>): void {
        const boards = this.doc.getMap<ScheduleBoard>('schedule-boards');
        const board = boards.get(boardId);
        if (board) this.doc.transact(() => boards.set(boardId, { ...board, ...updates }));
    }

    deleteBoard(boardId: string): void {
        const boards = this.doc.getMap<ScheduleBoard>('schedule-boards');
        const events = this.doc.getMap<ScheduleEvent>('schedule-events');
        this.doc.transact(() => {
            boards.delete(boardId);
            Array.from(events.values()).forEach(e => { if (e.boardId === boardId) events.delete(e.id); });
        });
    }

    createEvent(boardId: string, data: Omit<ScheduleEvent, 'id' | 'boardId' | 'createdAt'>): ScheduleEvent {
        const events = this.doc.getMap<ScheduleEvent>('schedule-events');
        const id = Math.random().toString(36).substr(2, 9);
        const event: ScheduleEvent = { id, boardId, createdAt: Date.now(), ...data };
        this.doc.transact(() => events.set(id, event));
        return event;
    }

    getEvents(boardId: string): ScheduleEvent[] {
        return Array.from(this.doc.getMap<ScheduleEvent>('schedule-events').values()).filter(e => e.boardId === boardId);
    }

    updateEvent(eventId: string, updates: Partial<ScheduleEvent>): void {
        const events = this.doc.getMap<ScheduleEvent>('schedule-events');
        const event = events.get(eventId);
        if (event) this.doc.transact(() => events.set(eventId, { ...event, ...updates }));
    }

    deleteEvent(eventId: string): void {
        const events = this.doc.getMap<ScheduleEvent>('schedule-events');
        this.doc.transact(() => { events.delete(eventId); });
    }
}

import * as Y from 'yjs';
import type { KanbanBoard, KanbanColumn, KanbanCard } from '../domain/Entities';

export class KanbanService {
    private doc: Y.Doc;

    constructor(doc: Y.Doc) {
        this.doc = doc;
    }

    // ─── Boards ───
    createBoard(name: string, poolId: string): KanbanBoard {
        const boards = this.doc.getMap<KanbanBoard>('kanban-boards');
        const id = Math.random().toString(36).substr(2, 9);
        const board: KanbanBoard = {
            id,
            poolId,
            name,
            createdAt: Date.now()
        };
        this.doc.transact(() => {
            boards.set(id, board);
        });
        return board;
    }

    getBoards(poolId: string): KanbanBoard[] {
        const boards = this.doc.getMap<KanbanBoard>('kanban-boards');
        return Array.from(boards.values()).filter(b => b.poolId === poolId);
    }

    deleteBoard(boardId: string): void {
        const boards = this.doc.getMap<KanbanBoard>('kanban-boards');
        const columns = this.doc.getMap<KanbanColumn>('kanban-columns');
        const cards = this.doc.getMap<KanbanCard>('kanban-cards');

        this.doc.transact(() => {
            boards.delete(boardId);
            Array.from(columns.values()).forEach(c => {
                if (c.boardId === boardId) columns.delete(c.id);
            });
            Array.from(cards.values()).forEach(c => {
                if (c.boardId === boardId) cards.delete(c.id);
            });
        });
    }

    // ─── Columns ───
    createColumn(boardId: string, name: string, order: number, color?: string): KanbanColumn {
        const columns = this.doc.getMap<KanbanColumn>('kanban-columns');
        const id = Math.random().toString(36).substr(2, 9);
        const column: KanbanColumn = {
            id,
            boardId,
            name,
            order,
            color
        };
        this.doc.transact(() => {
            columns.set(id, column);
        });
        return column;
    }

    getColumns(boardId: string): KanbanColumn[] {
        const columns = this.doc.getMap<KanbanColumn>('kanban-columns');
        return Array.from(columns.values())
            .filter(c => c.boardId === boardId)
            .sort((a, b) => a.order - b.order);
    }

    deleteColumn(columnId: string): void {
        const columns = this.doc.getMap<KanbanColumn>('kanban-columns');
        const cards = this.doc.getMap<KanbanCard>('kanban-cards');

        this.doc.transact(() => {
            columns.delete(columnId);
            Array.from(cards.values()).forEach(c => {
                if (c.columnId === columnId) cards.delete(c.id);
            });
        });
    }

    // ─── Cards ───
    createCard(boardId: string, columnId: string, title: string, description?: string): KanbanCard {
        const cards = this.doc.getMap<KanbanCard>('kanban-cards');
        const id = Math.random().toString(36).substr(2, 9);
        const card: KanbanCard = {
            id,
            boardId,
            columnId,
            title,
            description,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        this.doc.transact(() => {
            cards.set(id, card);
        });
        return card;
    }

    getCards(boardId: string): KanbanCard[] {
        const cards = this.doc.getMap<KanbanCard>('kanban-cards');
        return Array.from(cards.values()).filter(c => c.boardId === boardId);
    }

    updateCard(cardId: string, updates: Partial<KanbanCard>): void {
        const cards = this.doc.getMap<KanbanCard>('kanban-cards');
        const card = cards.get(cardId);
        if (card) {
            this.doc.transact(() => {
                cards.set(cardId, { ...card, ...updates, updatedAt: Date.now() });
            });
        }
    }

    deleteCard(cardId: string): void {
        const cards = this.doc.getMap<KanbanCard>('kanban-cards');
        this.doc.transact(() => {
            cards.delete(cardId);
        });
    }

    moveCard(cardId: string, newColumnId: string): void {
        this.updateCard(cardId, { columnId: newColumnId });
    }
}

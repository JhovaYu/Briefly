import { useState, useEffect } from 'react';
import * as Y from 'yjs';
import { KanbanService } from '@tuxnotas/shared';
import type { KanbanBoard as IKanbanBoard, KanbanColumn, KanbanCard } from '@tuxnotas/shared';
import { Plus, Trash2, LayoutTemplate, Clock } from 'lucide-react';

export function KanbanBoard({ poolId, service, doc }: { poolId: string, service: KanbanService, doc: Y.Doc }) {
    const [boards, setBoards] = useState<IKanbanBoard[]>([]);
    const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
    const [columns, setColumns] = useState<KanbanColumn[]>([]);
    const [cards, setCards] = useState<KanbanCard[]>([]);

    const [creatingBoard, setCreatingBoard] = useState(false);
    const [newBoardName, setNewBoardName] = useState('');
    const [creatingColumn, setCreatingColumn] = useState(false);
    const [newColumnName, setNewColumnName] = useState('');
    const [creatingCardInCol, setCreatingCardInCol] = useState<string | null>(null);
    const [newCardTitle, setNewCardTitle] = useState('');

    const [draggedCardId, setDraggedCardId] = useState<string | null>(null);

    useEffect(() => {
        const refresh = () => {
            const allBoards = service.getBoards(poolId).sort((a, b) => a.createdAt - b.createdAt);
            setBoards(allBoards);
            
            let currentActiveId = activeBoardId;
            if (!currentActiveId && allBoards.length > 0) {
                currentActiveId = allBoards[0].id;
                setActiveBoardId(currentActiveId);
            }

            if (currentActiveId) {
                setColumns(service.getColumns(currentActiveId));
                setCards(service.getCards(currentActiveId));
            }
        };
        refresh();
        doc.on('update', refresh);
        return () => doc.off('update', refresh);
    }, [poolId, service, doc, activeBoardId]);

    const handleCreateBoard = () => {
        if (!newBoardName.trim()) return;
        const board = service.createBoard(newBoardName.trim(), poolId);
        // Default columns
        service.createColumn(board.id, "To Do", 1);
        service.createColumn(board.id, "In Progress", 2);
        service.createColumn(board.id, "Done", 3);
        
        setActiveBoardId(board.id);
        setNewBoardName('');
        setCreatingBoard(false);
    };

    const handleCreateColumn = () => {
        if (!newColumnName.trim() || !activeBoardId) return;
        service.createColumn(activeBoardId, newColumnName.trim(), columns.length + 1);
        setNewColumnName('');
        setCreatingColumn(false);
    };

    const handleCreateCard = (colId: string) => {
        if (!newCardTitle.trim() || !activeBoardId) return;
        service.createCard(activeBoardId, colId, newCardTitle.trim());
        setNewCardTitle('');
        setCreatingCardInCol(null);
    };

    if (boards.length === 0) {
        return (
            <div className="kanban-empty-state">
                <LayoutTemplate size={48} className="kanban-empty-icon" />
                <h2>Aún no tienes tableros Kanban</h2>
                <p>Crea tu primer tablero para organizar tus tareas colaborativas.</p>
                {creatingBoard ? (
                    <div className="kanban-create-inline">
                        <input 
                            autoFocus
                            placeholder="Nombre del tablero..." 
                            value={newBoardName}
                            onChange={e => setNewBoardName(e.target.value)}
                            onKeyDown={e => { if(e.key==='Enter') handleCreateBoard(); if(e.key==='Escape') setCreatingBoard(false); }}
                        />
                        <button onClick={handleCreateBoard}>Crear</button>
                    </div>
                ) : (
                    <button className="kanban-btn-primary" onClick={() => setCreatingBoard(true)}>
                        <Plus size={16} /> Crear Tablero
                    </button>
                )}
            </div>
        );
    }

    const activeBoard = boards.find(b => b.id === activeBoardId);

    return (
        <div className="kanban-wrapper fade-in">
            {/* Header select board */}
            <div className="kanban-header">
                <div className="kanban-board-tabs">
                    {boards.map(b => (
                        <div 
                            key={b.id} 
                            className={`kanban-board-tab ${b.id === activeBoardId ? 'active' : ''}`}
                            onClick={() => setActiveBoardId(b.id)}
                        >
                            <LayoutTemplate size={14} />
                            <span>{b.name}</span>
                            {b.id === activeBoardId && (
                                <button className="kanban-board-delete" onClick={(e) => {
                                    e.stopPropagation();
                                    if(confirm('¿Eliminar tablero?')) {
                                        service.deleteBoard(b.id);
                                        setActiveBoardId(null);
                                    }
                                }}>
                                    <Trash2 size={12} />
                                </button>
                            )}
                        </div>
                    ))}
                    {creatingBoard ? (
                        <div className="kanban-board-tab kanban-board-tab-creating">
                            <input 
                                autoFocus
                                placeholder="Nuevo tablero..." 
                                value={newBoardName}
                                onChange={e => setNewBoardName(e.target.value)}
                                onBlur={() => setCreatingBoard(false)}
                                onKeyDown={e => { if(e.key==='Enter') handleCreateBoard(); if(e.key==='Escape') setCreatingBoard(false); }}
                            />
                        </div>
                    ) : (
                        <button className="kanban-board-tab kanban-add-board-btn" onClick={() => setCreatingBoard(true)}>
                            <Plus size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* Board Columns Area */}
            {activeBoard && (
                <div className="kanban-board-area">
                    {columns.map(col => {
                        const colCards = cards.filter(c => c.columnId === col.id).sort((a,b) => b.createdAt - a.createdAt);
                        return (
                            <div 
                                key={col.id} 
                                className="kanban-col"
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    if(draggedCardId) {
                                        service.moveCard(draggedCardId, col.id);
                                        setDraggedCardId(null);
                                    }
                                }}
                            >
                                <div className="kanban-col-header">
                                    <span className="kanban-col-name">{col.name}</span>
                                    <span className="kanban-col-count">{colCards.length}</span>
                                    <button className="kanban-col-delete" onClick={() => {
                                        if (confirm('¿Eliminar columna y sus tarjetas?')) service.deleteColumn(col.id);
                                    }}>
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                                <div className="kanban-col-cards">
                                    {colCards.map(card => (
                                        <div 
                                            key={card.id} 
                                            className={`kanban-card ${draggedCardId === card.id ? 'dragging' : ''}`}
                                            draggable
                                            onDragStart={() => setDraggedCardId(card.id)}
                                            onDragEnd={() => setDraggedCardId(null)}
                                        >
                                            <div className="kanban-card-title">{card.title}</div>
                                            <div className="kanban-card-meta">
                                                <Clock size={10} />
                                                <span>{new Date(card.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            <button className="kanban-card-delete" onClick={(e) => {
                                                e.stopPropagation();
                                                service.deleteCard(card.id);
                                            }}>
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    ))}

                                    {/* Add Card Flow */}
                                    {creatingCardInCol === col.id ? (
                                        <div className="kanban-create-card">
                                            <textarea 
                                                autoFocus
                                                placeholder="Título de la tarjeta..."
                                                value={newCardTitle}
                                                onChange={e => setNewCardTitle(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        handleCreateCard(col.id);
                                                    }
                                                    if (e.key === 'Escape') setCreatingCardInCol(null);
                                                }}
                                            />
                                            <div className="kanban-create-card-actions">
                                                <button className="btn-save" onClick={() => handleCreateCard(col.id)}>Agregar</button>
                                                <button className="btn-cancel" onClick={() => setCreatingCardInCol(null)}>Cancelar</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button className="kanban-add-card-btn" onClick={() => setCreatingCardInCol(col.id)}>
                                            <Plus size={14} /> Añadir tarjeta
                                        </button>
                                    )}
                                </div>
                            </div>
                        )
                    })}

                    {/* Add Column Flow */}
                    <div className="kanban-col kanban-add-col-wrapper">
                        {creatingColumn ? (
                            <div className="kanban-create-col">
                                <input 
                                    autoFocus
                                    placeholder="Nombre de la lista..."
                                    value={newColumnName}
                                    onChange={e => setNewColumnName(e.target.value)}
                                    onBlur={() => { if(!newColumnName.trim()) setCreatingColumn(false); }}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') handleCreateColumn();
                                        if (e.key === 'Escape') setCreatingColumn(false);
                                    }}
                                />
                            </div>
                        ) : (
                            <button className="kanban-add-col-btn" onClick={() => setCreatingColumn(true)}>
                                <Plus size={14} /> Añadir columna
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

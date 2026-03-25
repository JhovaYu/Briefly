import { useState, useEffect, useRef } from 'react';
import * as Y from 'yjs';
import { ScheduleService } from '@tuxnotas/shared';
import type { ScheduleBoard as IScheduleBoard, ScheduleEvent } from '@tuxnotas/shared';
import { CalendarDays, Settings2, Plus, MapPin, User, Tag, Trash2, X, Save } from 'lucide-react';

const HOURS = Array.from({ length: 16 }, (_, i) => i + 7); // 7 AM to 10 PM
const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export function ScheduleBoard({ poolId, service, doc }: { poolId: string, service: ScheduleService, doc: Y.Doc }) {
    const [boards, setBoards] = useState<IScheduleBoard[]>([]);
    const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
    const [events, setEvents] = useState<ScheduleEvent[]>([]);

    const [creatingBoard, setCreatingBoard] = useState(false);
    const [newBoardName, setNewBoardName] = useState('');
    const [showSettings, setShowSettings] = useState(false);

    // Event Modal
    const [editingEvent, setEditingEvent] = useState<Partial<ScheduleEvent> | null>(null);

    // D&D
    const [draggedEventId, setDraggedEventId] = useState<string | null>(null);
    const gridRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const refresh = () => {
            const allBoards = service.getBoards(poolId).sort((a, b) => a.createdAt - b.createdAt);
            setBoards(allBoards);
            
            let current = activeBoardId;
            if (!current && allBoards.length > 0) {
                current = allBoards[0].id;
                setActiveBoardId(current);
            }
            if (current) {
                setEvents(service.getEvents(current));
            }
        };
        refresh();
        doc.on('update', refresh);
        return () => doc.off('update', refresh);
    }, [poolId, service, doc, activeBoardId]);

    const activeBoard = boards.find(b => b.id === activeBoardId);
    const displayDays = activeBoard?.showWeekends ? DAYS : DAYS.slice(0, 5);

    const handleCreateBoard = () => {
        if (!newBoardName.trim()) return;
        const b = service.createBoard(newBoardName.trim(), poolId);
        setActiveBoardId(b.id);
        setNewBoardName('');
        setCreatingBoard(false);
    };

    const handleSaveEvent = () => {
        if (!activeBoardId || !editingEvent?.title || !editingEvent.startTime || !editingEvent.endTime || editingEvent.dayOfWeek === undefined) return;
        if (editingEvent.id) {
            service.updateEvent(editingEvent.id, editingEvent);
        } else {
            service.createEvent(activeBoardId, editingEvent as Omit<ScheduleEvent, 'id'|'boardId'|'createdAt'>);
        }
        setEditingEvent(null);
    };

    const parseTime = (timeStr: string) => {
        const [h, m] = timeStr.split(':').map(Number);
        return h + m / 60;
    };

    const formatTime = (decimalTime: number) => {
        const h = Math.floor(decimalTime);
        const m = Math.round((decimalTime - h) * 60);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    // Drag and Drop Logic overlay
    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (!draggedEventId || !activeBoard || !gridRef.current) return;
        
        const rect = gridRef.current.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const x = e.clientX - rect.left - 60; // 60px is time label width

        if (x < 0) return;

        const colWidth = (rect.width - 60) / displayDays.length;
        let dayIdx = Math.floor(x / colWidth);
        if (dayIdx < 0) dayIdx = 0;
        if (dayIdx >= displayDays.length) dayIdx = displayDays.length - 1;

        const hourHeight = 60; // defined in CSS
        let droppedTime = 7 + (y / hourHeight);
        
        if (activeBoard.timeRounding) {
            // snap to 15 min (0.25)
            droppedTime = Math.round(droppedTime * 4) / 4;
        }

        const ev = events.find(ev => ev.id === draggedEventId);
        if (!ev) return;
        
        const duration = parseTime(ev.endTime) - parseTime(ev.startTime);
        const newStartTime = formatTime(droppedTime);
        const newEndTime = formatTime(droppedTime + duration);

        service.updateEvent(draggedEventId, { dayOfWeek: dayIdx + 1, startTime: newStartTime, endTime: newEndTime });
        setDraggedEventId(null);
    };

    const toggleNonWorkingDay = (dateStr: string) => {
        if (!activeBoard) return;
        const days = new Set(activeBoard.nonWorkingDays);
        if (days.has(dateStr)) days.delete(dateStr);
        else days.add(dateStr);
        service.updateBoard(activeBoard.id, { nonWorkingDays: Array.from(days) });
    };

    if (boards.length === 0) {
        return (
            <div className="schedule-empty-state">
                <CalendarDays size={48} className="schedule-empty-icon" />
                <h2>Aún no tienes horarios escolares</h2>
                <p>Crea tu primer horario para organizar tus clases.</p>
                {creatingBoard ? (
                    <div className="schedule-create-inline">
                        <input autoFocus placeholder="Nombre del horario..." value={newBoardName} onChange={e => setNewBoardName(e.target.value)} onKeyDown={e => { if(e.key==='Enter') handleCreateBoard(); if(e.key==='Escape') setCreatingBoard(false); }} />
                        <button onClick={handleCreateBoard}>Crear</button>
                    </div>
                ) : (
                    <button className="schedule-btn-primary" onClick={() => setCreatingBoard(true)}>
                        <Plus size={16} /> Crear Horario
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="schedule-wrapper fade-in">
            <div className="schedule-header">
                <div className="schedule-board-tabs">
                    {boards.map(b => (
                        <div key={b.id} className={`schedule-board-tab ${b.id === activeBoardId ? 'active' : ''}`} onClick={() => setActiveBoardId(b.id)}>
                            <CalendarDays size={14} /><span>{b.name}</span>
                        </div>
                    ))}
                    <button className="schedule-board-tab schedule-add-board-btn" onClick={() => setCreatingBoard(true)}><Plus size={14} /></button>
                </div>
                
                {activeBoard && (
                    <div className="schedule-header-actions">
                        <button className="schedule-action-btn" onClick={() => setShowSettings(!showSettings)}>
                            <Settings2 size={16} /> Opciones
                        </button>
                    </div>
                )}
            </div>

            {creatingBoard && (
                <div className="schedule-create-floater">
                    <input autoFocus placeholder="Nuevo horario..." value={newBoardName} onChange={e => setNewBoardName(e.target.value)} onKeyDown={e => { if(e.key==='Enter') handleCreateBoard(); if(e.key==='Escape') setCreatingBoard(false); }} />
                </div>
            )}

            {activeBoard && (
                <div className="schedule-main-area">
                    {/* Settings Panel */}
                    {showSettings && (
                        <div className="schedule-settings-panel">
                            <h3>Configuración del Horario</h3>
                            <label className="schedule-setting-row">
                                <span>Mostrar Fines de Semana</span>
                                <input type="checkbox" checked={activeBoard.showWeekends} onChange={e => service.updateBoard(activeBoard.id, { showWeekends: e.target.checked })} />
                            </label>
                            <label className="schedule-setting-row">
                                <span>Ajustar tiempo a cuadrícula</span>
                                <input type="checkbox" checked={activeBoard.timeRounding} onChange={e => service.updateBoard(activeBoard.id, { timeRounding: e.target.checked })} />
                            </label>
                            <label className="schedule-setting-row">
                                <span>Número de semanas</span>
                                <select value={activeBoard.numberOfWeeks} onChange={e => service.updateBoard(activeBoard.id, { numberOfWeeks: e.target.value as any })}>
                                    <option value={1}>1 Semana</option>
                                    <option value={2}>2 Semanas (A/B)</option>
                                </select>
                            </label>

                            <div className="schedule-mini-calendar">
                                <h4>Días no laborables</h4>
                                <p style={{fontSize: 11, color: 'var(--text-tertiary)'}}>Escribe la fecha (YYYY-MM-DD) para marcarla como inhábil.</p>
                                <div className="mini-cal-list">
                                    {activeBoard.nonWorkingDays.map(d => (
                                        <span key={d} className="mini-cal-badge" onClick={() => toggleNonWorkingDay(d)}>{d} <X size={10}/></span>
                                    ))}
                                    <input type="date" className="mini-cal-input" onChange={(e) => {
                                        if(e.target.value) { toggleNonWorkingDay(e.target.value); e.target.value=''; }
                                    }} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Grid Timetable */}
                    <div className="schedule-grid-container">
                        <div className="schedule-grid-header">
                            <div className="schedule-grid-corner">
                                <button className="schedule-add-btn" onClick={() => setEditingEvent({ title: '', dayOfWeek: 1, startTime: '08:00', endTime: '10:00', color: '#2383e2' })}>
                                    <Plus size={16} /> Nueva Clase
                                </button>
                            </div>
                            {displayDays.map(day => <div key={day} className="schedule-grid-day">{day}</div>)}
                        </div>
                        <div className="schedule-grid-body" ref={gridRef} onDragOver={handleDragOver} onDrop={handleDrop}>
                            {/* Background Grid */}
                            {HOURS.map(hour => (
                                <div key={hour} className="schedule-row">
                                    <div className="schedule-time-label">{hour}:00</div>
                                    <div className="schedule-cells-row">
                                        {displayDays.map((_, i) => <div key={i} className="schedule-cell" />)}
                                    </div>
                                </div>
                            ))}

                            {/* Events Overlay */}
                            <div className="schedule-events-layer">
                                {events.map(ev => {
                                    if(ev.dayOfWeek > displayDays.length) return null;
                                    const top = (parseTime(ev.startTime) - 7) * 60;
                                    const height = (parseTime(ev.endTime) - parseTime(ev.startTime)) * 60;
                                    const leftOffset = 60; 
                                    const colWidthPercent = 100 / displayDays.length;
                                    const left = `calc(${leftOffset}px + ${(ev.dayOfWeek - 1) * colWidthPercent}%)`;
                                    
                                    return (
                                        <div 
                                            key={ev.id} 
                                            className="schedule-event-card" 
                                            style={{ top: `${top}px`, height: `${height}px`, left, width: `calc(${colWidthPercent}% - 4px)`, borderLeftColor: ev.color || 'var(--accent)' }}
                                            draggable
                                            onDragStart={(e) => { setDraggedEventId(ev.id); e.dataTransfer.effectAllowed = 'move'; }}
                                            onDragEnd={() => setDraggedEventId(null)}
                                            onClick={() => setEditingEvent(ev)}
                                        >
                                            <div className="card-title">{ev.title}</div>
                                            {(ev.room || ev.building) && <div className="card-meta"><MapPin size={10}/> {ev.building} {ev.room}</div>}
                                            {ev.professor && <div className="card-meta"><User size={10}/> {ev.professor}</div>}
                                            {ev.type && <div className="card-meta"><Tag size={10}/> {ev.type}</div>}
                                            <div className="card-time">{ev.startTime} - {ev.endTime}</div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Event Modal */}
            {editingEvent && (
                <div className="schedule-modal-overlay" onClick={() => setEditingEvent(null)}>
                    <div className="schedule-modal" onClick={e => e.stopPropagation()}>
                        <h3>{editingEvent.id ? 'Editar Clase' : 'Añadir Clase'}</h3>
                        
                        <div className="schedule-form">
                            <label>Nombre de la Clase
                                <input autoFocus value={editingEvent.title || ''} onChange={e => setEditingEvent({...editingEvent, title: e.target.value})} />
                            </label>
                            <div className="schedule-form-row">
                                <label>Día
                                    <select value={editingEvent.dayOfWeek} onChange={e => setEditingEvent({...editingEvent, dayOfWeek: Number(e.target.value)})}>
                                        {displayDays.map((d, i) => <option key={d} value={i+1}>{d}</option>)}
                                    </select>
                                </label>
                                <label>Inicio
                                    <input type="time" value={editingEvent.startTime} onChange={e => setEditingEvent({...editingEvent, startTime: e.target.value})} />
                                </label>
                                <label>Fin
                                    <input type="time" value={editingEvent.endTime} onChange={e => setEditingEvent({...editingEvent, endTime: e.target.value})} />
                                </label>
                            </div>
                            
                            <label>Profesor
                                <input value={editingEvent.professor || ''} onChange={e => setEditingEvent({...editingEvent, professor: e.target.value})} />
                            </label>
                            
                            <div className="schedule-form-row">
                                <label>Edificio
                                    <input value={editingEvent.building || ''} onChange={e => setEditingEvent({...editingEvent, building: e.target.value})} />
                                </label>
                                <label>Salón
                                    <input value={editingEvent.room || ''} onChange={e => setEditingEvent({...editingEvent, room: e.target.value})} />
                                </label>
                            </div>
                            
                            <div className="schedule-form-row">
                                <label>Tipo (Ej. Teoría, Lab)
                                    <input value={editingEvent.type || ''} onChange={e => setEditingEvent({...editingEvent, type: e.target.value})} />
                                </label>
                                <label>Color
                                    <input type="color" value={editingEvent.color || '#2383e2'} onChange={e => setEditingEvent({...editingEvent, color: e.target.value})} />
                                </label>
                            </div>
                        </div>

                        <div className="schedule-modal-actions">
                            {editingEvent.id && (
                                <button className="btn-danger" onClick={() => { service.deleteEvent(editingEvent.id!); setEditingEvent(null); }}>
                                    <Trash2 size={14}/> Eliminar
                                </button>
                            )}
                            <div style={{marginLeft: 'auto', display: 'flex', gap: 8}}>
                                <button className="btn-cancel" onClick={() => setEditingEvent(null)}>Cancelar</button>
                                <button className="btn-save" onClick={handleSaveEvent}><Save size={14}/> Guardar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

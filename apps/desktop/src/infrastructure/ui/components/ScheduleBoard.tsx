import { useState, useEffect, useRef } from 'react';
import * as Y from 'yjs';
import { ScheduleService, TaskService } from '@tuxnotas/shared';
import type { ScheduleBoard as IScheduleBoard, ScheduleEvent, Task, ReminderConfig, ReminderTiming } from '@tuxnotas/shared';
import { CalendarDays, Settings2, Plus, MapPin, User, Tag, Trash2, X, Check, ChevronRight, LinkIcon, Paperclip, Copy, Image as ImageIcon, Music, FileText, Link2, Clock, Info, ChevronDown, ChevronUp } from 'lucide-react';

const HOURS = Array.from({ length: 16 }, (_, i) => i + 7); // 7 AM to 10 PM
const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

function ReminderEditor({ reminders, onChange }: { reminders: ReminderConfig[]; onChange: (r: ReminderConfig[]) => void; }) {
    const update = (id: string, partial: Partial<ReminderConfig>) => onChange(reminders.map(r => r.id === id ? { ...r, ...partial } : r));
    const remove = (id: string) => onChange(reminders.filter(r => r.id !== id));
    return (
        <div className="rem-editor-area">
            {reminders.map(r => (
                <div key={r.id} className="rem-row">
                    <select className="evf-select-inline" value={r.timing} onChange={e => update(r.id, { timing: e.target.value as ReminderTiming })}>
                        <option value="before-start">🕐 Antes de empezar</option>
                        <option value="at-start">↑ Al principio</option>
                        <option value="after-start">🕐 Después del inicio</option>
                        <option value="at-midpoint">↕ A mitad de camino</option>
                        <option value="before-end">🕐 Antes del final</option>
                        <option value="at-end">↓ Al final</option>
                        <option value="after-end">🕐 Después del final</option>
                        <option value="on-date">📅 Fecha</option>
                    </select>
                    {(r.timing.includes('before') || r.timing.includes('after')) && (
                        <select className="evf-select-inline" value={r.minutesBefore || r.minutesAfter || 5} onChange={e => {
                            const v = Number(e.target.value);
                            if(r.timing.startsWith('before')) update(r.id, { minutesBefore: v });
                            else update(r.id, { minutesAfter: v });
                        }}>
                            <option value={5}>5 min</option>
                            <option value={10}>10 min</option>
                            <option value={15}>15 min</option>
                            <option value={30}>30 min</option>
                            <option value={60}>1 hora</option>
                            <option value={120}>2 horas</option>
                        </select>
                    )}
                    {r.timing === 'on-date' && (
                        <div className="rem-date-group">
                            <input type="date" className="evf-inline-date" onChange={e => update(r.id, { dateTimestamp: new Date(e.target.value).getTime() })} />
                            <input type="time" className="evf-inline-time" value={r.timeString || '09:00'} onChange={e => update(r.id, { timeString: e.target.value })} />
                        </div>
                    )}
                    <button className="evf-icon-btn-small" onClick={() => remove(r.id)}><X size={14}/></button>
                </div>
            ))}
        </div>
    );
}

function EventDetailPanel({ event, onClose, onEdit, onCreateTask, onNoteChange }: { event: ScheduleEvent; onClose: () => void; onEdit: () => void; onCreateTask: () => void; onNoteChange: (note: string) => void; }) {
    const [note, setNote] = useState(event.noteForDay || '');
    const [noteExpanded, setNoteExpanded] = useState(!!event.noteForDay);
    return (
        <div className="evd-overlay fade-in">
            <div className="evd-panel">
                <div className="evd-header" style={{ backgroundColor: event.color === 'blue' ? '#3b82f6' : (event.color || 'var(--accent)') }}>
                    <h2 className="evd-title">{event.title}</h2>
                    <button className="evd-close" onClick={onClose}><X size={20}/></button>
                </div>
                <div className="evd-body">
                    <div className="evd-row"><CalendarDays size={18} className="evd-icon"/><span>{DAYS[event.dayOfWeek - 1]}</span></div>
                    <div className="evd-row"><Clock size={18} className="evd-icon"/><span>{event.startTime} - {event.endTime}</span></div>
                    {(event.professor || event.type || event.building || event.room) && (
                        <div className="evd-info-block">
                            <Info size={18} className="evd-icon"/>
                            <div className="evd-info-list">
                                {event.professor && <div>{event.professor}</div>}
                                {event.type && <div>{event.type}</div>}
                                {event.building && <div>{event.building}</div>}
                                {event.room && <div>{event.room}</div>}
                            </div>
                        </div>
                    )}
                    <div className="evd-note-section">
                        <div className="evd-note-header" onClick={() => setNoteExpanded(!noteExpanded)}><span>Nota</span>{noteExpanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</div>
                        {noteExpanded && <textarea className="evd-note-input" placeholder="Nota para este día" value={note} onChange={e => setNote(e.target.value)} onBlur={() => onNoteChange(note)} />}
                    </div>
                </div>
                <div className="evd-footer">
                    <button className="evd-btn-edit" onClick={onEdit}>Editar</button>
                    <button className="evd-btn-task" onClick={onCreateTask}>+ Tarea</button>
                </div>
            </div>
        </div>
    );
}

export function TaskForm({ linkedEvent, colors, colorMap, onSave, onCancel, prefilledDate }: { linkedEvent?: ScheduleEvent; colors: string[]; colorMap: any; onSave: (taskData: Partial<Task>) => void; onCancel: () => void; prefilledDate?: number; }) {
    const [task, setTask] = useState<Partial<Task>>({ text: '', description: '', linkedEventId: linkedEvent?.id, taskColor: linkedEvent?.color || 'blue', subtasks: [], taskLinks: [], taskAttachments: [], reminders: [], dueDate: prefilledDate });
    const [showColor, setShowColor] = useState(false);
    const [showLinks, setShowLinks] = useState(false);
    const [newSubtask, setNewSubtask] = useState('');
    const [newLink, setNewLink] = useState('');
    const addSubtask = () => { if(!newSubtask.trim()) return; setTask(p => ({ ...p, subtasks: [...(p.subtasks||[]), { id: Math.random().toString(), text: newSubtask, done: false }] })); setNewSubtask(''); };
    const addLink = () => { if(!newLink.trim()) return; setTask(p => ({ ...p, taskLinks: [...(p.taskLinks||[]), newLink.trim()] })); setNewLink(''); };

    return (
        <div className="tskf-overlay fade-in">
            <div className="tskf-container">
                <div className="tskf-header"><button className="evf-icon-btn" onClick={onCancel}><X size={20}/></button><div className="evf-title">Tarea</div><button className="evf-icon-btn evf-save-btn" onClick={() => onSave(task)}><Check size={20}/></button></div>
                <div className="tskf-body">
                    <div className="evf-card"><input className="tskf-input-lg" placeholder="Tarea" value={task.text} onChange={e => setTask(p => ({...p, text: e.target.value}))}/><div className="tskf-divider"/><input className="evf-inline-input" placeholder="Información" value={task.description||''} onChange={e => setTask(p => ({...p, description: e.target.value}))}/></div>
                    <div className="evf-card">
                        <div className="evf-row evf-row-border" style={{color: 'var(--accent)', cursor: 'pointer', fontWeight: 500}} onClick={() => document.getElementById('new-subtask-input')?.focus()}>Agregar una subtarea</div>
                        {task.subtasks?.map(st => (
                            <div key={st.id} className="tskf-subtask-row"><input type="checkbox" checked={st.done} onChange={e => setTask(p => ({ ...p, subtasks: p.subtasks?.map(x => x.id === st.id ? {...x, done: e.target.checked} : x) }))} /><span style={{textDecoration: st.done ? 'line-through' : 'none'}}>{st.text}</span><button className="evf-icon-btn-small" onClick={() => setTask(p => ({...p, subtasks: p.subtasks?.filter(x => x.id !== st.id)}))}><X size={14}/></button></div>
                        ))}
                        <div className="tskf-subtask-row"><input id="new-subtask-input" placeholder="Nueva subtarea..." className="evf-inline-input" value={newSubtask} onChange={e => setNewSubtask(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSubtask()} onBlur={addSubtask}/></div>
                    </div>
                    <div className="evf-card">
                        <div className="evf-row evf-row-border"><label>Evento vinculado</label><div className="evf-row-value" style={{color: 'var(--text-secondary)'}}>{linkedEvent?.title || 'Ninguno'}</div><ChevronRight size={16} className="evf-chevron"/></div>
                        <div className="evf-row evf-interactive" onClick={() => setShowColor(!showColor)}>
                            <div className="evf-color-preview" style={{ background: colorMap[task.taskColor||'blue']?.bg, borderColor: colorMap[task.taskColor||'blue']?.dot }}><div className="evf-color-dot" style={{ background: colorMap[task.taskColor||'blue']?.dot }} /></div><label style={{ flex: 1, marginLeft: 12 }}>Color</label><ChevronRight size={16} className="evf-chevron" style={{transform: showColor ? 'rotate(90deg)' : 'none', transition: '0.2s'}}/>
                        </div>
                        {showColor && (
                            <div className="evf-color-grid">
                                {colors.map(c => (<div key={c} className={`evf-color-circle ${c === task.taskColor ? 'selected' : ''}`} style={{ background: colorMap[c].bg, borderColor: c === task.taskColor ? colorMap[c].dot : 'transparent' }} onClick={() => setTask(p => ({...p, taskColor: c}))}><div className="evf-color-dot-inner" style={{ background: colorMap[c].dot }} /></div>))}
                            </div>
                        )}
                    </div>
                    <div className="evf-card">
                        <div className="evf-row evf-row-border evf-interactive" onClick={() => setShowLinks(!showLinks)}><div className="evf-icon-label"><LinkIcon size={16}/> Enlaces {(task.taskLinks && task.taskLinks.length > 0) && `(${task.taskLinks.length})`}</div><ChevronRight size={16} className="evf-chevron" style={{transform: showLinks ? 'rotate(90deg)' : 'none'}}/></div>
                        {showLinks && (
                            <div className="evf-panel-inline">
                                <div className="evf-add-link-box"><input placeholder="https://..." value={newLink} onChange={e => setNewLink(e.target.value)} onKeyDown={e => e.key === 'Enter' && addLink()}/><button onClick={addLink}>Agregar</button></div>
                                {task.taskLinks?.map((l, i) => (<div key={i} className="evf-link-item"><Link2 size={14}/><a href={l} target="_blank" rel="noreferrer" title={l}>{l.length > 35 ? l.substring(0,35)+'...' : l}</a><button onClick={() => setTask(p => { const tl = [...(p.taskLinks||[])]; tl.splice(i,1); return {...p, taskLinks: tl} })}><X size={14}/></button></div>))}
                            </div>
                        )}
                    </div>
                    <div className="evf-card">
                        <div className="evf-row evf-row-border" style={{position: 'relative'}}><label>Fecha</label><div className="evf-row-value"><span className="evf-pill">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Seleccionar'}</span><input type="date" className="evf-date-overlay" onChange={e => setTask(p => ({...p, dueDate: new Date(e.target.value).getTime()}))} /></div></div>
                        <div className="evf-row evf-row-border"><label>Hora</label><label className="evf-toggle"><input type="checkbox" checked={!!task.hasTime} onChange={e => setTask(p => ({...p, hasTime: e.target.checked, dueTimeStart: e.target.checked ? '15:00' : undefined, dueTimeEnd: e.target.checked ? '16:00' : undefined}))} /><span className="evf-toggle-slider"></span></label></div>
                        {task.hasTime && (
                            <><div className="evf-row evf-row-border" style={{position: 'relative'}}><label style={{marginLeft: 16}}>Inicio</label><div className="evf-row-value"><span className="evf-pill">{task.dueTimeStart || '15:00'}</span><input type="time" className="evf-date-overlay" value={task.dueTimeStart||'15:00'} onChange={e => setTask(p => ({...p, dueTimeStart: e.target.value}))} /></div></div>
                            <div className="evf-row evf-row-border" style={{position: 'relative'}}><label style={{marginLeft: 16}}>Fin</label><div className="evf-row-value"><span className="evf-pill">{task.dueTimeEnd || '16:00'}</span><input type="time" className="evf-date-overlay" value={task.dueTimeEnd||'16:00'} onChange={e => setTask(p => ({...p, dueTimeEnd: e.target.value}))} /></div></div></>
                        )}
                    </div>
                    <div className="evf-card">
                        <div className="evf-row evf-row-border"><label>Repetir</label><div className="evf-row-value"><select className="evf-select-inline" value={task.repeat||'none'} onChange={e => setTask(p => ({...p, repeat: e.target.value as any}))}><option value="none">Ninguna</option><option value="daily">Cada día</option><option value="weekly">Cada semana</option><option value="monthly">Cada mes</option><option value="custom">Personalizado</option></select></div></div>
                    </div>
                    <div className="evf-card">
                        <div className="evf-row evf-row-border"><label>Recordatorio</label><label className="evf-toggle"><input type="checkbox" checked={!!task.reminders && task.reminders.length > 0} onChange={e => setTask(p => ({...p, reminders: e.target.checked ? [{ id: '1', timing: 'before-start', minutesBefore: 5 }] : []}))} /><span className="evf-toggle-slider"></span></label></div>
                        {(task.reminders && task.reminders.length > 0) && <ReminderEditor reminders={task.reminders} onChange={r => setTask(p => ({...p, reminders: r}))} />}
                        {(task.reminders && task.reminders.length > 0) && <div className="evf-row"><button className="evf-add-reminder-btn" onClick={() => setTask(p => ({...p, reminders: [...(p.reminders||[]), {id: Math.random().toString(), timing:'before-start', minutesBefore:5}]}))}>+ Recordatorio</button></div>}
                    </div>
                    <div style={{height: 40}}></div>
                </div>
            </div>
        </div>
    );
}

function EventForm({
    event,
    onSave,
    onCancel,
    onDelete
}: {
    event: Partial<ScheduleEvent>;
    onSave: (ev: Partial<ScheduleEvent>) => void;
    onCancel: () => void;
    onDelete: (id: string) => void;
}) {
    const [formData, setFormData] = useState<Partial<ScheduleEvent>>(event);
    const update = (fields: Partial<ScheduleEvent>) => setFormData(prev => ({ ...prev, ...fields }));

    // Format Helpers
    const formatDate = (ts?: number) => {
        if (!ts) return "Seleccionar";
        return new Date(ts).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const dateToYMD = (ts?: number) => {
        if (!ts) return "";
        const d = new Date(ts);
        return d.toISOString().split('T')[0];
    };

    const ymdToTs = (ymd: string) => {
        if(!ymd) return undefined;
        const [y,m,d] = ymd.split('-').map(Number);
        return new Date(y, m-1, d).getTime();
    };

    // Color Pickers
    const COLORS = ['blue', 'cyan', 'teal', 'green', 'lime', 'yellow', 'orange', 'red', 'pink', 'purple', 'violet', 'gray'];
    const COLOR_MAP: Record<string, {bg: string, text: string, dot: string}> = {
        blue: { bg: '#e0f2fe', text: '#0284c7', dot: '#3b82f6'},
        cyan: { bg: '#cffafe', text: '#0891b2', dot: '#06b6d4'},
        teal: { bg: '#ccfbf1', text: '#0d9488', dot: '#14b8a6'},
        green: { bg: '#dcfce7', text: '#16a34a', dot: '#22c55e'},
        lime: { bg: '#ecfccb', text: '#65a30d', dot: '#84cc16'},
        yellow: { bg: '#fef08a', text: '#ca8a04', dot: '#eab308'},
        orange: { bg: '#ffedd5', text: '#ea580c', dot: '#f97316'},
        red: { bg: '#fee2e2', text: '#dc2626', dot: '#ef4444'},
        pink: { bg: '#fce7f3', text: '#db2777', dot: '#ec4899'},
        purple: { bg: '#f3e8ff', text: '#9333ea', dot: '#a855f7'},
        violet: { bg: '#ede9fe', text: '#7c3aed', dot: '#8b5cf6'},
        gray: { bg: '#f3f4f6', text: '#4b5563', dot: '#6b7280'}
    };
    const [showColorPicker, setShowColorPicker] = useState(false);

    // Copy Feedback
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        onSave({ ...formData, id: undefined, createdAt: Date.now() });
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    // Links Expansion
    const [showLinks, setShowLinks] = useState(false);
    const [newLink, setNewLink] = useState("");
    const handleAddLink = () => {
        if(!newLink.trim()) return;
        update({ links: [...(formData.links || []), newLink.trim()] });
        setNewLink("");
    };
    const removeLink = (idx: number) => {
        const l = [...(formData.links || [])];
        l.splice(idx, 1);
        update({ links: l });
    };

    // Attachments Expansion
    const [showFiles, setShowFiles] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadType, setUploadType] = useState<'image'|'audio'|'document'>('document');
    const [fileError, setFileError] = useState("");

    const triggerUpload = (type: 'image'|'audio'|'document') => {
        setUploadType(type);
        setFileError("");
        if(fileInputRef.current) {
            if(type === 'image') fileInputRef.current.accept = "image/*";
            else if(type === 'audio') fileInputRef.current.accept = "audio/*";
            else fileInputRef.current.accept = ".pdf,.doc,.docx,.txt,.xlsx,.pptx";
            fileInputRef.current.click();
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if(!file) return;
        
        const currentAtt = formData.attachments || [];
        if(currentAtt.length >= 5) {
            setFileError("Límite de 5 adjuntos."); return;
        }
        if(file.size > 10 * 1024 * 1024) {
            setFileError("Archivo excede 10MB."); return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            const newAtt = {
                id: Math.random().toString(36).substr(2, 9),
                name: file.name,
                type: uploadType,
                size: file.size,
                dataUrl
            };
            update({ attachments: [...currentAtt, newAtt] });
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const removeFile = (id: string) => {
        update({ attachments: (formData.attachments || []).filter(a => a.id !== id) });
    };

    const formatSize = (bytes: number) => {
        if(bytes < 1024) return bytes + ' B';
        if(bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB';
        return (bytes/(1024*1024)).toFixed(1) + ' MB';
    };

    const colorKey = typeof formData.color === 'string' && formData.color in COLOR_MAP ? formData.color : 'blue';
    const cTheme = COLOR_MAP[colorKey];

    return (
        <div className="evf-overlay fade-in">
            <div className="evf-container">
                {/* Header */}
                <div className="evf-header">
                    <button className="evf-icon-btn" onClick={onCancel}><X size={20}/></button>
                    <div className="evf-title">Evento</div>
                    <button className="evf-icon-btn evf-save-btn" onClick={() => onSave(formData)}><Check size={20}/></button>
                </div>

                <div className="evf-body">
                    {/* Tema */}
                    <div className="evf-card">
                        <div className="evf-row">
                            <input 
                                className="evf-inline-input" 
                                placeholder="Tema" 
                                value={formData.tema || formData.title || ''} 
                                onChange={e => update({ tema: e.target.value, title: e.target.value })} 
                            />
                            <ChevronRight size={16} className="evf-chevron"/>
                        </div>
                    </div>

                    {/* Información (Fechas y Hora) */}
                    <div className="evf-card">
                        <div className="evf-row evf-row-border" style={{position: 'relative'}}>
                            <label>Inicio</label>
                            <div className="evf-row-value">
                                <span className="evf-pill">{formatDate(formData.startDate)}</span>
                                <input type="date" className="evf-date-overlay" value={dateToYMD(formData.startDate)} onChange={e => update({ startDate: ymdToTs(e.target.value) })} />
                            </div>
                        </div>
                        <div className="evf-row evf-row-border" style={{position: 'relative'}}>
                            <label>Fin</label>
                            <div className="evf-row-value">
                                <span className="evf-pill">{formatDate(formData.endDate)}</span>
                                <input type="date" className="evf-date-overlay" value={dateToYMD(formData.endDate)} onChange={e => update({ endDate: ymdToTs(e.target.value) })} />
                            </div>
                        </div>
                        {!formData.allDay && (
                            <>
                                <div className="evf-row evf-row-border" style={{position: 'relative'}}>
                                    <label style={{marginLeft: 16}}>Hora Inicio</label>
                                    <div className="evf-row-value">
                                        <span className="evf-pill">{formData.startTime || '21:00'}</span>
                                        <input type="time" className="evf-date-overlay" value={formData.startTime || '21:00'} onChange={e => update({ startTime: e.target.value })} />
                                    </div>
                                </div>
                                <div className="evf-row evf-row-border" style={{position: 'relative'}}>
                                    <label style={{marginLeft: 16}}>Hora Fin</label>
                                    <div className="evf-row-value">
                                        <span className="evf-pill">{formData.endTime || '22:00'}</span>
                                        <input type="time" className="evf-date-overlay" value={formData.endTime || '22:00'} onChange={e => update({ endTime: e.target.value })} />
                                    </div>
                                </div>
                            </>
                        )}
                        <div className="evf-row evf-row-border">
                            <label>Profesor</label>
                            <div className="evf-row-value">
                                <input className="evf-inline-input evf-text-right" placeholder="Añadir..." value={formData.professor || ''} onChange={e => update({ professor: e.target.value })} />
                                <ChevronRight size={16} className="evf-chevron"/>
                            </div>
                        </div>
                        <div className="evf-row evf-row-border">
                            <label>Tipo de evento</label>
                            <div className="evf-row-value">
                                <input className="evf-inline-input evf-text-right" placeholder="(Ej. Teoría, Lab)" value={formData.type || ''} onChange={e => update({ type: e.target.value })} />
                                <ChevronRight size={16} className="evf-chevron"/>
                            </div>
                        </div>
                        <div className="evf-row evf-row-border">
                            <label>Edificio</label>
                            <div className="evf-row-value">
                                <input className="evf-inline-input evf-text-right" placeholder="Añadir..." value={formData.building || ''} onChange={e => update({ building: e.target.value })} />
                                <ChevronRight size={16} className="evf-chevron"/>
                            </div>
                        </div>
                        <div className="evf-row">
                            <label>Salón</label>
                            <div className="evf-row-value">
                                <input className="evf-inline-input evf-text-right" placeholder="Añadir..." value={formData.room || ''} onChange={e => update({ room: e.target.value })} />
                                <ChevronRight size={16} className="evf-chevron"/>
                            </div>
                        </div>
                    </div>

                    {/* Enlaces y Archivos */}
                    <div className="evf-card">
                        <div className="evf-row evf-row-border evf-interactive" onClick={() => setShowLinks(!showLinks)}>
                            <div className="evf-icon-label"><LinkIcon size={16}/> Enlaces {(formData.links && formData.links.length > 0) && `(${formData.links.length})`}</div>
                            <ChevronRight size={16} className="evf-chevron" style={{transform: showLinks ? 'rotate(90deg)' : 'none', transition: '0.2s'}}/>
                        </div>
                        {showLinks && (
                            <div className="evf-panel-inline">
                                <div className="evf-add-link-box">
                                    <input placeholder="https://..." value={newLink} onChange={e => setNewLink(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddLink()}/>
                                    <button onClick={handleAddLink}>Agregar</button>
                                </div>
                                {formData.links?.map((l, idx) => (
                                    <div key={idx} className="evf-link-item">
                                        <Link2 size={14}/>
                                        <a href={l} target="_blank" rel="noreferrer" title={l}>{l.length > 35 ? l.substring(0,35)+'...' : l}</a>
                                        <button onClick={() => removeLink(idx)}><X size={14}/></button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="evf-row evf-interactive" onClick={() => setShowFiles(!showFiles)}>
                            <div className="evf-icon-label"><Paperclip size={16}/> Archivos {(formData.attachments && formData.attachments.length > 0) && `(${formData.attachments.length})`}</div>
                            <ChevronRight size={16} className="evf-chevron" style={{transform: showFiles ? 'rotate(90deg)' : 'none', transition: '0.2s'}}/>
                        </div>
                        {showFiles && (
                            <div className="evf-panel-inline">
                                <div className="evf-files-toolbar">
                                    <button onClick={() => triggerUpload('image')}><ImageIcon size={14}/> Foto</button>
                                    <button onClick={() => triggerUpload('audio')}><Music size={14}/> Audio</button>
                                    <button onClick={() => triggerUpload('document')}><FileText size={14}/> Documento</button>
                                </div>
                                {fileError && <div className="evf-error-msg">{fileError}</div>}
                                <input type="file" ref={fileInputRef} style={{display:'none'}} onChange={handleFileChange} />
                                
                                <div className="evf-files-list">
                                    {formData.attachments?.map(att => (
                                        <div key={att.id} className="evf-file-item">
                                            {att.type === 'image' ? <ImageIcon size={14}/> : att.type === 'audio' ? <Music size={14}/> : <FileText size={14}/>}
                                            <a href={att.dataUrl} download={att.name} className="evf-file-name" title={att.name}>{att.name}</a>
                                            <span className="evf-file-size">{formatSize(att.size)}</span>
                                            <button onClick={() => removeFile(att.id)}><X size={14}/></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="evf-card">
                        <div className="evf-row evf-row-border">
                            <label>Recordatorio</label>
                            <label className="evf-toggle">
                                <input type="checkbox" checked={!!formData.reminderEnabled} onChange={e => {
                                    update({ reminderEnabled: e.target.checked });
                                    if(e.target.checked && (!formData.reminders || formData.reminders.length === 0)) {
                                        update({ reminders: [{ id: Math.random().toString(), timing: 'before-start', minutesBefore: 5 }] });
                                    }
                                }} />
                                <span className="evf-toggle-slider"></span>
                            </label>
                        </div>
                        {formData.reminderEnabled && (
                            <ReminderEditor 
                                reminders={formData.reminders || []} 
                                onChange={r => update({ reminders: r })} 
                            />
                        )}
                        {formData.reminderEnabled && (
                            <div className="evf-row evf-row-border">
                                <button className="evf-add-reminder-btn" onClick={() => update({ reminders: [...(formData.reminders||[]), {id: Math.random().toString(), timing:'before-start', minutesBefore:5}] })}>+ Recordatorio</button>
                            </div>
                        )}
                    </div>

                    {/* Color */}
                    <div className="evf-card">
                        <div className="evf-row evf-interactive" onClick={() => setShowColorPicker(!showColorPicker)}>
                            <div className="evf-color-preview" style={{ background: cTheme.bg, borderColor: cTheme.dot }}>
                                <div className="evf-color-dot" style={{ background: cTheme.dot }} />
                            </div>
                            <label style={{ flex: 1, marginLeft: 12 }}>Color</label>
                            <ChevronRight size={16} className="evf-chevron" style={{transform: showColorPicker ? 'rotate(90deg)' : 'none', transition: '0.2s'}}/>
                        </div>
                        {showColorPicker && (
                            <div className="evf-color-grid">
                                {COLORS.map(c => {
                                    const theme = COLOR_MAP[c];
                                    return (
                                        <div 
                                            key={c} 
                                            className={`evf-color-circle ${colorKey === c ? 'selected' : ''}`}
                                            style={{ background: theme.bg, borderColor: colorKey === c ? theme.dot : 'transparent' }}
                                            onClick={() => update({ color: c })}
                                        >
                                            <div className="evf-color-dot-inner" style={{ background: theme.dot }} />
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    {/* Copiar y Eliminar */}
                    {formData.id && (
                        <div className="evf-card">
                            <div className="evf-row evf-row-border evf-interactive" onClick={handleCopy}>
                                <div className="evf-icon-label"><Copy size={16}/> {copied ? '¡Copiado!' : 'Copiar'}</div>
                                <ChevronRight size={16} className="evf-chevron"/>
                            </div>
                            <div className="evf-row evf-danger" onClick={() => onDelete(formData.id!)}>
                                <div className="evf-icon-label"><Trash2 size={16}/> Eliminar evento</div>
                            </div>
                        </div>
                    )}
                    
                    <div style={{height: 40}}></div>
                </div>
            </div>
        </div>
    );
}

export function ScheduleBoard({ poolId, service, doc }: { poolId: string, service: ScheduleService, doc: Y.Doc }) {
    const [boards, setBoards] = useState<IScheduleBoard[]>([]);
    const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
    const [events, setEvents] = useState<ScheduleEvent[]>([]);

    const [creatingBoard, setCreatingBoard] = useState(false);
    const [newBoardName, setNewBoardName] = useState('');
    const [showSettings, setShowSettings] = useState(false);

    // Event Modal
    const [editingEvent, setEditingEvent] = useState<Partial<ScheduleEvent> | null>(null);
    const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
    const [creatingTaskForEvent, setCreatingTaskForEvent] = useState<ScheduleEvent | null>(null);
    const taskService = useRef(new TaskService(doc)).current;

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

    const handleSaveEvent = (evData: Partial<ScheduleEvent>) => {
        if (!activeBoardId || !evData.title || !evData.startTime || !evData.endTime || evData.dayOfWeek === undefined) return;
        if (evData.id) {
            service.updateEvent(evData.id, evData);
        } else {
            service.createEvent(activeBoardId, evData as Omit<ScheduleEvent, 'id'|'boardId'|'createdAt'>);
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
                                            onClick={() => setSelectedEvent(ev)}
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

            {/* Event Form Expanded */}
            {editingEvent && (
                <EventForm 
                    event={editingEvent} 
                    onSave={handleSaveEvent} 
                    onCancel={() => setEditingEvent(null)}
                    onDelete={(id) => { service.deleteEvent(id); setEditingEvent(null); }}
                />
            )}

            {/* Event Detail Panel */}
            {selectedEvent && (
                <EventDetailPanel
                    event={selectedEvent}
                    onClose={() => setSelectedEvent(null)}
                    onEdit={() => { setEditingEvent(selectedEvent); setSelectedEvent(null); }}
                    onCreateTask={() => { setCreatingTaskForEvent(selectedEvent); setSelectedEvent(null); }}
                    onNoteChange={(note) => service.updateEvent(selectedEvent.id, { noteForDay: note })}
                />
            )}

            {/* Task Form */}
            {creatingTaskForEvent && (
                <TaskForm
                    linkedEvent={creatingTaskForEvent}
                    colors={['blue', 'cyan', 'teal', 'green', 'lime', 'yellow', 'orange', 'red', 'pink', 'purple', 'violet', 'gray']}
                    colorMap={{
                        blue: { bg: '#e0f2fe', dot: '#3b82f6'}, cyan: { bg: '#cffafe', dot: '#06b6d4'},
                        teal: { bg: '#ccfbf1', dot: '#14b8a6'}, green: { bg: '#dcfce7', dot: '#22c55e'},
                        lime: { bg: '#ecfccb', dot: '#84cc16'}, yellow: { bg: '#fef08a', dot: '#eab308'},
                        orange: { bg: '#ffedd5', dot: '#f97316'}, red: { bg: '#fee2e2', dot: '#ef4444'},
                        pink: { bg: '#fce7f3', dot: '#ec4899'}, purple: { bg: '#f3e8ff', dot: '#a855f7'},
                        violet: { bg: '#ede9fe', dot: '#8b5cf6'}, gray: { bg: '#f3f4f6', dot: '#6b7280'}
                    }}
                    onSave={(taskData) => {
                        let listId = '';
                        const lists = taskService.getTaskLists(poolId);
                        if(lists.length > 0) listId = lists[0].id;
                        else listId = taskService.createTaskList("Inbox", poolId).id;

                        const added = taskService.addTask(listId, taskData.text || 'Sin título', undefined, taskData.dueDate);
                        taskService.updateTask(added.id, {
                            description: taskData.description,
                            linkedEventId: taskData.linkedEventId,
                            taskColor: taskData.taskColor,
                            subtasks: taskData.subtasks,
                            taskLinks: taskData.taskLinks,
                            taskAttachments: taskData.taskAttachments,
                            hasTime: taskData.hasTime,
                            dueTimeStart: taskData.dueTimeStart,
                            dueTimeEnd: taskData.dueTimeEnd,
                            repeat: taskData.repeat,
                            reminders: taskData.reminders
                        });
                        setCreatingTaskForEvent(null);
                    }}
                    onCancel={() => setCreatingTaskForEvent(null)}
                />
            )}
        </div>
    );
}

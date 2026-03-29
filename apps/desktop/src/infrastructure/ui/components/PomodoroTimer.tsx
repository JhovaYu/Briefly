import { useState, useEffect, useRef, useCallback } from 'react';
import { Timer, Play, Pause, RotateCcw, SkipForward, ChevronDown, ChevronUp, Settings } from 'lucide-react';
import type { PomodoroService } from '@tuxnotas/shared';
import type { PomodoroSession, ScheduleEvent } from '@tuxnotas/shared';

// ─── Types ───

type TimerMode = 'work' | 'break' | 'longBreak';

interface TimerConfig {
    workMinutes: number;
    breakMinutes: number;
    longBreakMinutes: number;
    sessionsBeforeLongBreak: number;
}

interface TimerState {
    mode: TimerMode;
    secondsLeft: number;
    isRunning: boolean;
    completedThisCycle: number;
    sessionId: string | null;
    linkedEventId?: string;
    linkedEventTitle?: string;
    linkedEventColor?: string;
    config: TimerConfig;
}

const DEFAULT_CONFIG: TimerConfig = {
    workMinutes: 25,
    breakMinutes: 5,
    longBreakMinutes: 15,
    sessionsBeforeLongBreak: 4,
};

const LS_KEY = 'pom-timer-state';

function loadTimerState(): TimerState | null {
    try {
        const raw = localStorage.getItem(LS_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as TimerState;
    } catch {
        return null;
    }
}

function saveTimerState(state: TimerState) {
    try {
        localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch { /* ignore */ }
}

function modeLabel(mode: TimerMode): string {
    if (mode === 'work') return 'Enfoque';
    if (mode === 'break') return 'Descanso';
    return 'Descanso largo';
}

function playBeep(frequency = 660, duration = 0.25) {
    try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = frequency;
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration);
    } catch { /* ignore on browsers that block */ }
}

function sendNotification(title: string, body: string) {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/favicon.ico' });
    } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(p => {
            if (p === 'granted') new Notification(title, { body });
        });
    }
}

// ─── SVG circle progress ───

const CIRCLE_R = 88;
const CIRCLE_C = 2 * Math.PI * CIRCLE_R;

function CircleProgress({ progress, color }: { progress: number; color: string }) {
    const offset = CIRCLE_C * (1 - progress);
    return (
        <svg className="pom-svg" viewBox="0 0 220 220">
            {/* track */}
            <circle cx="110" cy="110" r={CIRCLE_R} fill="none" stroke="var(--border-color)" strokeWidth="8" />
            {/* progress arc */}
            <circle
                cx="110" cy="110" r={CIRCLE_R}
                fill="none"
                stroke={color}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={CIRCLE_C}
                strokeDashoffset={offset}
                transform="rotate(-90 110 110)"
                style={{ transition: 'stroke-dashoffset 0.8s linear' }}
            />
        </svg>
    );
}

// ─── Props ───

interface PomodoroTimerProps {
    poolId: string;
    service: PomodoroService;
    scheduleEvents: ScheduleEvent[];
}

export function PomodoroTimer({ poolId, service, scheduleEvents }: PomodoroTimerProps) {
    const saved = loadTimerState();

    const [config, setConfig] = useState<TimerConfig>(saved?.config ?? DEFAULT_CONFIG);
    const [mode, setMode] = useState<TimerMode>(saved?.mode ?? 'work');
    const [secondsLeft, setSecondsLeft] = useState<number>(
        saved?.secondsLeft ?? DEFAULT_CONFIG.workMinutes * 60
    );
    const [isRunning, setIsRunning] = useState(false); // always start paused on load
    const [completedThisCycle, setCompletedThisCycle] = useState(saved?.completedThisCycle ?? 0);
    const [sessionId, setSessionId] = useState<string | null>(saved?.sessionId ?? null);
    const [linkedEventId, setLinkedEventId] = useState<string | undefined>(saved?.linkedEventId);
    const [linkedEventTitle, setLinkedEventTitle] = useState<string | undefined>(saved?.linkedEventTitle);
    const [linkedEventColor, setLinkedEventColor] = useState<string | undefined>(saved?.linkedEventColor);
    const [showSettings, setShowSettings] = useState(false);
    const [todaySessions, setTodaySessions] = useState<PomodoroSession[]>([]);

    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Derived
    const totalSeconds = mode === 'work'
        ? config.workMinutes * 60
        : mode === 'break'
            ? config.breakMinutes * 60
            : config.longBreakMinutes * 60;

    const progress = totalSeconds > 0 ? secondsLeft / totalSeconds : 0;
    const accentColor = linkedEventColor ?? 'var(--accent)';

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60).toString().padStart(2, '0');
        const sec = (s % 60).toString().padStart(2, '0');
        return `${m}:${sec}`;
    };

    // Persist state to localStorage
    useEffect(() => {
        saveTimerState({ mode, secondsLeft, isRunning, completedThisCycle, sessionId, linkedEventId, linkedEventTitle, linkedEventColor, config });
    }, [mode, secondsLeft, isRunning, completedThisCycle, sessionId, linkedEventId, linkedEventTitle, linkedEventColor, config]);

    // Load today sessions
    useEffect(() => {
        setTodaySessions(service.getTodaySessions(poolId));
    }, [poolId, service]);

    // Timer tick
    const handleSessionComplete = useCallback(() => {
        playBeep(660, 0.3);
        playBeep(880, 0.2);

        if (mode === 'work') {
            const newCompleted = completedThisCycle + 1;
            setCompletedThisCycle(newCompleted);

            // Save/update session
            if (sessionId) {
                service.updateSession(sessionId, {
                    completedSessions: newCompleted,
                    totalMinutesStudied: newCompleted * config.workMinutes,
                    linkedEventId,
                    linkedEventTitle,
                    linkedEventColor,
                });
            } else {
                const s = service.createSession(poolId, {
                    workMinutes: config.workMinutes,
                    breakMinutes: config.breakMinutes,
                    longBreakMinutes: config.longBreakMinutes,
                    sessionsBeforeLongBreak: config.sessionsBeforeLongBreak,
                    linkedEventId,
                    linkedEventTitle,
                    linkedEventColor,
                });
                service.updateSession(s.id, {
                    completedSessions: newCompleted,
                    totalMinutesStudied: config.workMinutes,
                });
                setSessionId(s.id);
            }

            setTodaySessions(service.getTodaySessions(poolId));
            sendNotification('¡Sesión completada!', 'Toma un descanso. Te lo mereces 🎉');

            const isLong = newCompleted % config.sessionsBeforeLongBreak === 0;
            const nextMode: TimerMode = isLong ? 'longBreak' : 'break';
            setMode(nextMode);
            setSecondsLeft((isLong ? config.longBreakMinutes : config.breakMinutes) * 60);
        } else {
            sendNotification('¡Descanso terminado!', 'Es hora de volver a estudiar 📚');
            setMode('work');
            setSecondsLeft(config.workMinutes * 60);
        }

        setIsRunning(false);
    }, [mode, completedThisCycle, config, sessionId, poolId, service, linkedEventId, linkedEventTitle, linkedEventColor]);

    useEffect(() => {
        if (!isRunning) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            return;
        }
        intervalRef.current = setInterval(() => {
            setSecondsLeft(prev => {
                if (prev <= 1) {
                    clearInterval(intervalRef.current!);
                    handleSessionComplete();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [isRunning, handleSessionComplete]);

    // ─── Controls ───

    const handleStartPause = () => {
        if (!isRunning && secondsLeft === totalSeconds && mode === 'work' && !sessionId) {
            // create a new session on first start
            const s = service.createSession(poolId, {
                workMinutes: config.workMinutes,
                breakMinutes: config.breakMinutes,
                longBreakMinutes: config.longBreakMinutes,
                sessionsBeforeLongBreak: config.sessionsBeforeLongBreak,
                linkedEventId,
                linkedEventTitle,
                linkedEventColor,
            });
            setSessionId(s.id);
        }
        setIsRunning(r => !r);
    };

    const handleReset = () => {
        setIsRunning(false);
        setSecondsLeft(totalSeconds);
    };

    const handleSkip = () => {
        setIsRunning(false);
        if (mode === 'work') {
            const isLong = (completedThisCycle + 1) % config.sessionsBeforeLongBreak === 0;
            const nextMode: TimerMode = isLong ? 'longBreak' : 'break';
            setMode(nextMode);
            setSecondsLeft((isLong ? config.longBreakMinutes : config.breakMinutes) * 60);
        } else {
            setMode('work');
            setSecondsLeft(config.workMinutes * 60);
        }
    };

    const handleSelectEvent = (eventId: string) => {
        if (!eventId) {
            setLinkedEventId(undefined);
            setLinkedEventTitle(undefined);
            setLinkedEventColor(undefined);
            return;
        }
        const ev = scheduleEvents.find(e => e.id === eventId);
        if (ev) {
            setLinkedEventId(ev.id);
            setLinkedEventTitle(ev.title);
            setLinkedEventColor(ev.color ? colorToHex(ev.color) : undefined);
        }
    };

    const updateConfig = (key: keyof TimerConfig, value: number) => {
        const next = { ...config, [key]: value };
        setConfig(next);
        if (!isRunning) {
            if (key === 'workMinutes' && mode === 'work') setSecondsLeft(value * 60);
            if (key === 'breakMinutes' && mode === 'break') setSecondsLeft(value * 60);
            if (key === 'longBreakMinutes' && mode === 'longBreak') setSecondsLeft(value * 60);
        }
    };

    // ─── Render ───

    const dots = Array.from({ length: config.sessionsBeforeLongBreak }, (_, i) => i < completedThisCycle % config.sessionsBeforeLongBreak || (completedThisCycle > 0 && completedThisCycle % config.sessionsBeforeLongBreak === 0));

    const totalTodayMinutes = todaySessions.reduce((a, s) => a + s.totalMinutesStudied, 0);

    return (
        <div className="pom-root">
            {/* ── Selector de materia ── */}
            <div className="pom-subject-select">
                <label className="pom-label">Materia vinculada</label>
                <div className="pom-select-wrap">
                    {linkedEventColor && (
                        <span className="pom-color-dot" style={{ background: linkedEventColor }} />
                    )}
                    <select
                        className="pom-select"
                        value={linkedEventId ?? ''}
                        onChange={e => handleSelectEvent(e.target.value)}
                    >
                        <option value="">Sin materia</option>
                        {scheduleEvents.map(ev => (
                            <option key={ev.id} value={ev.id}>{ev.title}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* ── Timer circular ── */}
            <div className="pom-circle-wrap">
                <div style={{ position: 'relative', display: 'inline-block' }}>
                    <CircleProgress progress={progress} color={accentColor} />
                    <div className="pom-time-overlay">
                        <span className="pom-time">{formatTime(secondsLeft)}</span>
                        <span className="pom-mode-label">{modeLabel(mode)}</span>
                    </div>
                </div>
            </div>

            {/* ── Dots de sesión ── */}
            <div className="pom-sessions-dots">
                {dots.map((done, i) => (
                    <span key={i} className={`pom-dot ${done ? 'pom-dot--done' : 'pom-dot--empty'}`}
                        style={done ? { background: accentColor } : {}} />
                ))}
            </div>

            {/* ── Controles ── */}
            <div className="pom-controls">
                <button className="pom-btn-skip" onClick={handleReset} title="Reiniciar">
                    <RotateCcw size={16} />
                </button>
                <button
                    className="pom-btn-main"
                    style={{ background: accentColor }}
                    onClick={handleStartPause}
                >
                    {isRunning ? <><Pause size={18} /> Pausar</> : <><Play size={18} /> {secondsLeft < totalSeconds ? 'Reanudar' : 'Iniciar'}</>}
                </button>
                <button className="pom-btn-skip" onClick={handleSkip} title="Saltar">
                    <SkipForward size={16} />
                </button>
            </div>

            {/* ── Ajustes expandibles ── */}
            <button className="pom-settings-toggle" onClick={() => setShowSettings(s => !s)}>
                <Settings size={14} />
                Ajustes
                {showSettings ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showSettings && (
                <div className="pom-settings-panel">
                    {(
                        [
                            { key: 'workMinutes', label: 'Enfoque', min: 1, max: 120 },
                            { key: 'breakMinutes', label: 'Descanso corto', min: 1, max: 60 },
                            { key: 'longBreakMinutes', label: 'Descanso largo', min: 1, max: 120 },
                            { key: 'sessionsBeforeLongBreak', label: 'Sesiones antes del descanso largo', min: 1, max: 10 },
                        ] as const
                    ).map(({ key, label, min, max }) => (
                        <div key={key} className="pom-setting-row">
                            <label className="pom-label">{label}</label>
                            <div className="pom-setting-inputs">
                                <input
                                    type="range"
                                    min={min} max={max}
                                    value={config[key]}
                                    onChange={e => updateConfig(key, Number(e.target.value))}
                                    className="pom-slider"
                                    style={{ accentColor }}
                                />
                                <input
                                    type="number"
                                    min={min} max={max}
                                    value={config[key]}
                                    onChange={e => updateConfig(key, Math.max(min, Math.min(max, Number(e.target.value))))}
                                    className="pom-number-input"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Estadísticas del día ── */}
            <div className="pom-stats">
                <div className="pom-stats-summary">
                    <Timer size={14} />
                    <span>Hoy: <strong>{todaySessions.length}</strong> sesiones · <strong>{totalTodayMinutes}</strong> min estudiados</span>
                </div>
                {todaySessions.slice(-5).reverse().map(s => (
                    <div key={s.id} className="pom-stats-row">
                        {s.linkedEventColor && <span className="pom-color-dot" style={{ background: s.linkedEventColor }} />}
                        <span className="pom-stats-subject">{s.linkedEventTitle ?? 'Sin materia'}</span>
                        <span className="pom-stats-mins">{s.totalMinutesStudied} min</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Helper: EventColor → hex ───

const COLOR_MAP: Record<string, string> = {
    blue: '#3b82f6', cyan: '#06b6d4', teal: '#14b8a6', green: '#22c55e',
    lime: '#84cc16', yellow: '#eab308', orange: '#f97316', red: '#ef4444',
    pink: '#ec4899', purple: '#a855f7', violet: '#8b5cf6', gray: '#6b7280',
};

function colorToHex(color: string): string {
    return COLOR_MAP[color] ?? color;
}

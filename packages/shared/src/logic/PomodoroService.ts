import * as Y from 'yjs';
import type { PomodoroSession } from '../domain/Entities';

export class PomodoroService {
    private doc: Y.Doc;

    constructor(doc: Y.Doc) {
        this.doc = doc;
    }

    private getSessions(): Y.Map<PomodoroSession> {
        return this.doc.getMap<PomodoroSession>('pomodoro-sessions');
    }

    createSession(poolId: string, config: Partial<Pick<PomodoroSession, 'workMinutes' | 'breakMinutes' | 'longBreakMinutes' | 'sessionsBeforeLongBreak' | 'linkedEventId' | 'linkedEventTitle' | 'linkedEventColor'>>): PomodoroSession {
        const sessions = this.getSessions();
        const id = Math.random().toString(36).substr(2, 9);
        const session: PomodoroSession = {
            id,
            poolId,
            linkedEventId: config.linkedEventId,
            linkedEventTitle: config.linkedEventTitle,
            linkedEventColor: config.linkedEventColor,
            workMinutes: config.workMinutes ?? 25,
            breakMinutes: config.breakMinutes ?? 5,
            longBreakMinutes: config.longBreakMinutes ?? 15,
            sessionsBeforeLongBreak: config.sessionsBeforeLongBreak ?? 4,
            completedSessions: 0,
            totalMinutesStudied: 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        this.doc.transact(() => sessions.set(id, session));
        return session;
    }

    updateSession(id: string, updates: Partial<PomodoroSession>): void {
        const sessions = this.getSessions();
        const session = sessions.get(id);
        if (session) {
            this.doc.transact(() =>
                sessions.set(id, { ...session, ...updates, updatedAt: Date.now() })
            );
        }
    }

    getSessionsForPool(poolId: string): PomodoroSession[] {
        return Array.from(this.getSessions().values()).filter(s => s.poolId === poolId);
    }

    getTodaySessions(poolId: string): PomodoroSession[] {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        return this.getSessionsForPool(poolId).filter(s => s.createdAt >= startOfDay.getTime());
    }

    getTotalMinutesToday(poolId: string): number {
        return this.getTodaySessions(poolId).reduce((acc, s) => acc + s.totalMinutesStudied, 0);
    }
}

import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import type { NetworkAdapter } from '../../core/ports/Ports';
import type { Peer } from '../../core/domain/Entities';

/**
 * ICE Servers: STUN (conectividad directa) + TURN (relay para redes restringidas).
 */
const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject',
    },
    {
        urls: 'turns:openrelay.metered.ca:443?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject',
    },
];

/**
 * Signaling server para descubrimiento de peers.
 * SOLO usamos el signaling LOCAL en ws://localhost:4444.
 */
const DEFAULT_SIGNALING = [
    'ws://localhost:4444',
];

export interface NetworkConfig {
    signalingServers?: string[];
    iceServers?: RTCIceServer[];
}

export class YjsWebRTCAdapter implements NetworkAdapter {
    private doc: Y.Doc;
    public provider: WebrtcProvider | null = null;
    private onPeerJoinCallback: ((peer: Peer) => void) | null = null;
    private onPeerLeaveCallback: ((peerId: string) => void) | null = null;
    private config: NetworkConfig;
    private connected = false;

    constructor(doc: Y.Doc, config?: NetworkConfig) {
        this.doc = doc;
        this.config = config || {};
    }

    async connect(poolId: string, signalingUrl?: string): Promise<void> {
        // Guard: don't connect twice to the same room
        if (this.connected && this.provider) {
            console.log(`[Fluent] Already connected to: ${poolId}, skipping`);
            return;
        }

        // Si se provee una URL específica (ej: IP del host), usarla.
        // Si no, usar la configuración existente o el default (localhost:4444).
        const signaling = signalingUrl ? [signalingUrl] : (this.config.signalingServers || DEFAULT_SIGNALING);
        const iceServers = this.config.iceServers || DEFAULT_ICE_SERVERS;

        this.provider = new WebrtcProvider(poolId, this.doc, {
            signaling: signaling,
            password: null as any,
            peerOpts: {
                config: {
                    iceServers: iceServers,
                },
            },
        } as any);

        this.connected = true;

        this.provider.awareness.on('change', () => {
            this.handleAwarenessUpdate();
        });

        console.log(`[Fluent] Conectado al pool P2P: ${poolId}`);
        console.log(`[Fluent] Signaling servers:`, signaling);
        console.log(`[Fluent] ICE Servers configurados:`, iceServers.length);
    }

    disconnect(): void {
        if (this.provider) {
            try {
                this.provider.destroy();
            } catch (err) {
                console.warn('[Fluent] Error during provider.destroy():', err);
            }
            this.provider = null;
        }
        this.connected = false;
    }

    broadcast(_message: any): void {
        // Yjs uses Shared Types for sync
    }

    onPeerJoin(callback: (peer: Peer) => void): void {
        this.onPeerJoinCallback = callback;
    }

    onPeerLeave(callback: (peerId: string) => void): void {
        this.onPeerLeaveCallback = callback;
    }

    getAwarenessState(): any {
        return this.provider?.awareness.getStates();
    }

    getPeerCount(): number {
        const states = this.provider?.awareness.getStates();
        return states ? states.size : 0;
    }

    private handleAwarenessUpdate() {
        const states = this.provider?.awareness.getStates();
        if (!states) return;
        if (this.onPeerJoinCallback) { /* TODO */ }
        if (this.onPeerLeaveCallback) { /* TODO */ }
    }
}

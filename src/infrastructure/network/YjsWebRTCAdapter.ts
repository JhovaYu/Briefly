import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import type { NetworkAdapter } from '../../core/ports/Ports';
import type { Peer } from '../../core/domain/Entities';

export class YjsWebRTCAdapter implements NetworkAdapter {
    private doc: Y.Doc;
    public provider: WebrtcProvider | null = null;
    private onPeerJoinCallback: ((peer: Peer) => void) | null = null;
    private onPeerLeaveCallback: ((peerId: string) => void) | null = null;

    constructor(doc: Y.Doc) {
        this.doc = doc;
    }

    async connect(poolId: string): Promise<void> {
        const signaling = ['wss://signaling.yjs.dev', 'wss://y-webrtc-signaling-eu.herokuapp.com', 'wss://y-webrtc-signaling-us.herokuapp.com'];

        this.provider = new WebrtcProvider(poolId, this.doc, {
            signaling: signaling,
            password: null as any,
        });

        this.provider.awareness.on('change', () => {
            this.handleAwarenessUpdate();
        });

        console.log(`Connected to P2P pool: ${poolId}`);
    }

    disconnect(): void {
        if (this.provider) {
            this.provider.destroy();
            this.provider = null;
        }
    }

    broadcast(_message: any): void {
        console.warn("Broadcast not fully implemented in Yjs adapter directly, use Shared Types.");
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

    private handleAwarenessUpdate() {
        const states = this.provider?.awareness.getStates();
        if (!states) return;

        states.forEach((_state: any, _clientID: number) => {
            if (this.onPeerJoinCallback) {
                // Logic
            }
        });

        if (this.onPeerLeaveCallback) {
            // Logic
        }
    }
}

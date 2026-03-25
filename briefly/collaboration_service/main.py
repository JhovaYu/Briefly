import json
from collections import defaultdict
from typing import Dict, List

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Briefly Collaboration Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket rooms: room_id -> list of connected WebSockets
rooms: Dict[str, List[WebSocket]] = defaultdict(list)


@app.websocket("/ws/{doc_id}")
async def collaboration_ws(ws: WebSocket, doc_id: str):
    await ws.accept()
    rooms[doc_id].append(ws)
    try:
        while True:
            data = await ws.receive_bytes()
            # Broadcast to all peers in the same room
            for peer in rooms[doc_id]:
                if peer != ws:
                    try:
                        await peer.send_bytes(data)
                    except Exception:
                        pass
    except WebSocketDisconnect:
        if ws in rooms[doc_id]:
            rooms[doc_id].remove(ws)
        if not rooms[doc_id]:
            del rooms[doc_id]
    except Exception:
        if ws in rooms[doc_id]:
            rooms[doc_id].remove(ws)
        if doc_id in rooms and not rooms[doc_id]:
            del rooms[doc_id]


class BroadcastPayload(BaseModel):
    type: str
    card_id: str = ""
    column: str = ""
    old_column: str = ""
    moved_by: str = ""


@app.post("/broadcast/{room_id}")
async def broadcast(room_id: str, payload: BroadcastPayload):
    """Broadcast a JSON message to all WebSocket clients in a room."""
    message = json.dumps(payload.model_dump()).encode("utf-8")
    sent = 0
    if room_id in rooms:
        for ws in rooms[room_id]:
            try:
                await ws.send_bytes(message)
                sent += 1
            except Exception:
                pass
    return {"sent_to": sent}


@app.get("/health")
def health():
    return {"status": "ok", "service": "collaboration", "active_rooms": len(rooms)}

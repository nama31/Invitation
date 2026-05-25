"""
WebSocket connection manager — singleton shared across the application.

Usage:
    from app.core.ws_manager import manager

    # In a WebSocket endpoint:
    await manager.connect(websocket)

    # After a state-changing operation:
    await manager.broadcast({"type": "seating_updated"})
"""

import json
from typing import List

from fastapi import WebSocket


class ConnectionManager:
    """Thread-safe (asyncio) in-memory WebSocket connection manager."""

    def __init__(self) -> None:
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        """Accept the WebSocket handshake and register the connection."""
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        """Remove a closed/errored connection from the pool."""
        try:
            self.active_connections.remove(websocket)
        except ValueError:
            pass  # already removed — nothing to do

    async def broadcast(self, message: dict) -> None:
        """
        Send *message* (as JSON text) to every active connection.
        Stale/dead connections are silently removed from the pool.
        """
        encoded = json.dumps(message)
        dead: List[WebSocket] = []

        for connection in self.active_connections:
            try:
                await connection.send_text(encoded)
            except Exception:
                dead.append(connection)

        for conn in dead:
            self.disconnect(conn)


# Shared singleton — import this wherever you need to broadcast.
manager = ConnectionManager()

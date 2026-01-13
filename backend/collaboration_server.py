"""
WebSocket Collaboration Server
Real-time multi-user editing with presence awareness and conflict resolution
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from typing import Dict, Set, Optional
import json
import asyncio
from datetime import datetime
from dataclasses import dataclass, asdict
from collections import defaultdict

router = APIRouter(prefix="/collaboration", tags=["collaboration"])

@dataclass
class User:
    id: str
    name: str
    color: str = "#4ECDC4"
    cursor: Optional[dict] = None
    selected_object: Optional[str] = None
    last_active: float = 0

@dataclass
class Room:
    id: str
    users: Dict[str, User]
    connections: Dict[str, WebSocket]
    object_locks: Dict[str, str]  # object_id -> user_id
    scene_version: int = 0
    created_at: float = 0

# Room manager
class CollaborationManager:
    def __init__(self):
        self.rooms: Dict[str, Room] = {}
        self.user_rooms: Dict[str, str] = {}  # user_id -> room_id
        
    def get_or_create_room(self, room_id: str) -> Room:
        if room_id not in self.rooms:
            self.rooms[room_id] = Room(
                id=room_id,
                users={},
                connections={},
                object_locks={},
                scene_version=0,
                created_at=datetime.now().timestamp()
            )
        return self.rooms[room_id]
    
    async def join_room(self, room_id: str, user_id: str, user_name: str, websocket: WebSocket):
        room = self.get_or_create_room(room_id)
        
        # Create user
        user = User(
            id=user_id,
            name=user_name,
            last_active=datetime.now().timestamp()
        )
        
        room.users[user_id] = user
        room.connections[user_id] = websocket
        self.user_rooms[user_id] = room_id
        
        # Notify others about new user
        await self.broadcast_to_room(room_id, {
            "type": "presence",
            "payload": {
                "action": "join",
                "userName": user_name,
                "users": [asdict(u) for u in room.users.values()]
            },
            "userId": user_id,
            "timestamp": datetime.now().timestamp()
        }, exclude_user=user_id)
        
        # Send current room state to new user
        await websocket.send_json({
            "type": "room_state",
            "payload": {
                "users": [asdict(u) for u in room.users.values()],
                "locks": room.object_locks,
                "version": room.scene_version
            },
            "timestamp": datetime.now().timestamp()
        })
        
        return room
    
    async def leave_room(self, user_id: str):
        if user_id not in self.user_rooms:
            return
            
        room_id = self.user_rooms[user_id]
        room = self.rooms.get(room_id)
        
        if room:
            user = room.users.get(user_id)
            user_name = user.name if user else "Unknown"
            
            # Remove user's locks
            locks_to_remove = [obj_id for obj_id, uid in room.object_locks.items() if uid == user_id]
            for obj_id in locks_to_remove:
                del room.object_locks[obj_id]
                await self.broadcast_to_room(room_id, {
                    "type": "unlock",
                    "payload": {"objectId": obj_id},
                    "userId": user_id,
                    "timestamp": datetime.now().timestamp()
                })
            
            # Remove user
            if user_id in room.users:
                del room.users[user_id]
            if user_id in room.connections:
                del room.connections[user_id]
            del self.user_rooms[user_id]
            
            # Notify others
            await self.broadcast_to_room(room_id, {
                "type": "presence",
                "payload": {
                    "action": "leave",
                    "userName": user_name
                },
                "userId": user_id,
                "timestamp": datetime.now().timestamp()
            })
            
            # Clean up empty rooms
            if not room.users:
                del self.rooms[room_id]
    
    async def broadcast_to_room(self, room_id: str, message: dict, exclude_user: str = None):
        room = self.rooms.get(room_id)
        if not room:
            return
            
        disconnected = []
        for user_id, ws in room.connections.items():
            if user_id != exclude_user:
                try:
                    await ws.send_json(message)
                except Exception:
                    disconnected.append(user_id)
        
        # Clean up disconnected users
        for user_id in disconnected:
            await self.leave_room(user_id)
    
    async def handle_message(self, user_id: str, message: dict):
        if user_id not in self.user_rooms:
            return
            
        room_id = self.user_rooms[user_id]
        room = self.rooms.get(room_id)
        
        if not room:
            return
        
        msg_type = message.get("type")
        payload = message.get("payload", {})
        timestamp = datetime.now().timestamp()
        
        if msg_type == "heartbeat":
            # Update last active
            if user_id in room.users:
                room.users[user_id].last_active = timestamp
            return
        
        elif msg_type == "presence":
            action = payload.get("action")
            if action == "update" and user_id in room.users:
                room.users[user_id].cursor = payload.get("cursor")
                room.users[user_id].selected_object = payload.get("selectedObject")
                room.users[user_id].last_active = timestamp
            
            # Broadcast to others
            await self.broadcast_to_room(room_id, {
                "type": "presence",
                "payload": payload,
                "userId": user_id,
                "timestamp": timestamp
            }, exclude_user=user_id)
        
        elif msg_type == "object_update":
            room.scene_version += 1
            await self.broadcast_to_room(room_id, {
                "type": "object_update",
                "payload": {**payload, "version": room.scene_version},
                "userId": user_id,
                "timestamp": timestamp
            }, exclude_user=user_id)
        
        elif msg_type == "object_create":
            room.scene_version += 1
            await self.broadcast_to_room(room_id, {
                "type": "object_create",
                "payload": {**payload, "version": room.scene_version},
                "userId": user_id,
                "timestamp": timestamp
            }, exclude_user=user_id)
        
        elif msg_type == "object_delete":
            room.scene_version += 1
            # Remove any locks on deleted object
            obj_id = payload.get("objectId")
            if obj_id in room.object_locks:
                del room.object_locks[obj_id]
            
            await self.broadcast_to_room(room_id, {
                "type": "object_delete",
                "payload": {**payload, "version": room.scene_version},
                "userId": user_id,
                "timestamp": timestamp
            }, exclude_user=user_id)
        
        elif msg_type == "camera_sync":
            await self.broadcast_to_room(room_id, {
                "type": "camera_sync",
                "payload": payload,
                "userId": user_id,
                "timestamp": timestamp
            }, exclude_user=user_id)
        
        elif msg_type == "lock":
            obj_id = payload.get("objectId")
            # Check if already locked by someone else
            if obj_id in room.object_locks and room.object_locks[obj_id] != user_id:
                # Send lock denied
                ws = room.connections.get(user_id)
                if ws:
                    await ws.send_json({
                        "type": "lock_denied",
                        "payload": {"objectId": obj_id, "lockedBy": room.object_locks[obj_id]},
                        "timestamp": timestamp
                    })
            else:
                room.object_locks[obj_id] = user_id
                await self.broadcast_to_room(room_id, {
                    "type": "lock",
                    "payload": payload,
                    "userId": user_id,
                    "timestamp": timestamp
                })
        
        elif msg_type == "unlock":
            obj_id = payload.get("objectId")
            if obj_id in room.object_locks and room.object_locks[obj_id] == user_id:
                del room.object_locks[obj_id]
                await self.broadcast_to_room(room_id, {
                    "type": "unlock",
                    "payload": payload,
                    "userId": user_id,
                    "timestamp": timestamp
                })
        
        elif msg_type == "chat":
            await self.broadcast_to_room(room_id, {
                "type": "chat",
                "payload": payload,
                "userId": user_id,
                "timestamp": timestamp
            })

# Global manager instance
manager = CollaborationManager()

@router.websocket("/ws/{room_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    room_id: str,
    userId: str = Query(...),
    userName: str = Query(...)
):
    await websocket.accept()
    
    try:
        # Join room
        await manager.join_room(room_id, userId, userName, websocket)
        
        # Message loop
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                await manager.handle_message(userId, message)
            except json.JSONDecodeError:
                pass
                
    except WebSocketDisconnect:
        await manager.leave_room(userId)
    except Exception as e:
        print(f"WebSocket error: {e}")
        await manager.leave_room(userId)

@router.get("/rooms")
async def list_rooms():
    """List all active collaboration rooms"""
    return {
        "rooms": [
            {
                "id": room.id,
                "userCount": len(room.users),
                "users": [{"id": u.id, "name": u.name} for u in room.users.values()],
                "createdAt": room.created_at
            }
            for room in manager.rooms.values()
        ]
    }

@router.get("/rooms/{room_id}")
async def get_room(room_id: str):
    """Get details of a specific room"""
    room = manager.rooms.get(room_id)
    if not room:
        return {"error": "Room not found"}
    
    return {
        "id": room.id,
        "users": [asdict(u) for u in room.users.values()],
        "locks": room.object_locks,
        "version": room.scene_version,
        "createdAt": room.created_at
    }

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import asyncio
import json
import random
from typing import List

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()

@router.websocket("/stream")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Wait for any messages from client (optional)
            data = await websocket.receive_text()
            # If client sends {"subscribe": "AAPL"}, we could handle it here
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# Background task to stream simulated live tick data
async def stream_live_data():
    symbols = ['AAPL', 'EURUSD', 'GBPUSD', 'BTC-USD']
    # Simulated base prices
    prices = {sym: 150.0 + random.random()*100 for sym in symbols}
    
    while True:
        await asyncio.sleep(1) # Stream every second
        if not manager.active_connections:
            continue
            
        update_data = {}
        for sym in symbols:
            # Simulate a small tick movement
            movement = (random.random() - 0.5) * 0.1
            prices[sym] += movement
            update_data[sym] = {
                "price": round(prices[sym], 4),
                "bid": round(prices[sym] - 0.02, 4),
                "ask": round(prices[sym] + 0.02, 4)
            }
            
        await manager.broadcast(json.dumps({"type": "tick", "data": update_data}))

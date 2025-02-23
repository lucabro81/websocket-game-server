import { WebSocket, WebSocketServer } from 'ws';
import { Room } from './room';
import { GameStateMessage, GameMessageType, PlayerId, RoomId, HandlerFunction, RoomStatus } from './types';

export class GameServer<P, S> {
  private wss: WebSocketServer;
  private connections: Map<WebSocket, PlayerId> = new Map(); // ws -> playerId
  private rooms: Map<RoomId, Room> = new Map(); // roomId -> Room
  private playerRooms: Map<PlayerId, RoomId> = new Map(); // playerId -> roomId
  private gameStates: Map<RoomId, GameStateMessage<P, S>> = new Map(); // roomId -> GameState
  private gameMessagesMap: Map<string, HandlerFunction> = new Map();

  constructor(port: number = 8080) {
    this.wss = new WebSocketServer({ port });
    this.setupWebSocketServer();
    this.setupGameMessages();
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('New client connected');

      ws.on('message', (message: string) => {
        try {
          const parsedMessage = JSON.parse(message.toString());
          this.handleMessage(ws, parsedMessage);
        } catch (error) {
          console.error('Error parsing message:', error);
          this.sendError(ws, 'INVALID_MESSAGE', 'Invalid message format');
        }
      });

      ws.on('close', () => {
        const playerId = this.connections.get(ws);
        if (playerId) {
          this.handlePlayerDisconnect(ws, playerId);
        }
        this.connections.delete(ws);
        console.log('Client disconnected');
      });
    });
  }

  private setupGameMessages() {
    this.gameMessagesMap.set(GameMessageType.CREATE_ROOM, this.handleCreateRoom);
    this.gameMessagesMap.set(GameMessageType.JOIN_ROOM, this.handleJoinRoom);
    this.gameMessagesMap.set(GameMessageType.GAME_STATE_UPDATE, (ws, message, data) => {
      const playerId = this.connections.get(ws);
      if (!playerId) return;

      const roomId = this.playerRooms.get(playerId);
      if (!roomId) return;

      const room = this.rooms.get(roomId);
      if (!room) return;

      room.handleMessage(ws, message);
      this.handleGameStateUpdate(ws, data);
    });
    this.gameMessagesMap.set(GameMessageType.PLAYER_DIED, this.relayMessageToRoom);
  }

  addRelayMessageToRoom(type: string) {
    this.gameMessagesMap.set(type, this.relayMessageToRoom);
  }

  addHandler(type: string, handler: HandlerFunction) {
    this.gameMessagesMap.set(type, handler);
  }

  private handleMessage(ws: WebSocket, message: any) {
    const { type, data } = message;

    const handler = this.gameMessagesMap.get(type);
    if (handler) {
      handler(ws, data, message);
    } else {
      this.sendError(ws, 'UNKNOWN_MESSAGE', 'Unknown message type');
    }
  }

  private handleCreateRoom(ws: WebSocket) {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase(); // Simple room code
    const playerId = Math.random().toString(36).substring(2, 10); // Simple player id

    const room = new Room(roomId);
    this.rooms.set(roomId, room);

    if (!room.addPlayer(playerId, ws)) {
      this.rooms.delete(roomId);
      return this.sendError(ws, 'ROOM_ERROR', 'Could not create room');
    }

    this.connections.set(ws, playerId);
    this.playerRooms.set(playerId, roomId);

    console.log('Room created, sending message to client');

    ws.send(JSON.stringify({
      type: GameMessageType.ROOM_CREATED,
      data: {
        roomId,
        playerId
      }
    }));
  }

  private async handleJoinRoom(ws: WebSocket, data: { roomId: string }) {
    const { roomId } = data;
    const room = this.rooms.get(roomId);

    if (!room) {
      return this.sendError(ws, 'ROOM_NOT_FOUND', 'Room not found');
    }

    const playerId = Math.random().toString(36).substring(2, 10);

    if (!room.addPlayer(playerId, ws)) {
      return this.sendError(ws, 'ROOM_FULL', 'Room is full');
    }

    this.connections.set(ws, playerId);
    this.playerRooms.set(playerId, roomId);

    // Get current game state if room is already playing
    if (room.getStatus() === RoomStatus.PLAYING) {
      const gameState = this.gameStates.get(roomId);
      if (gameState) {
        ws.send(JSON.stringify({
          type: GameMessageType.GAME_STATE,
          data: gameState
        }));
      }
    }

    // Send join confirmation to the new player
    ws.send(JSON.stringify({
      type: GameMessageType.ROOM_JOINED,
      data: {
        roomId,
        playerId
      }
    }));
    // Request game state from an existing player
    const currentState = await this.requestGameState(room, playerId);
    console.log(`Server sending game state to ${playerId}:`, currentState);
    if (currentState) {
      this.gameStates.set(roomId, currentState);

      // Send state to the new player
      ws.send(JSON.stringify({
        type: GameMessageType.GAME_STATE,
        data: currentState
      }));
    }

    // Notify others in the room
    room.broadcast({
      type: GameMessageType.PLAYER_JOINED,
      data: { playerId }
    }, playerId); // Exclude the new player from this broadcast


    // If room is ready to start, notify everyone
    if (room.getStatus() === RoomStatus.READY) {
      room.broadcast({
        type: GameMessageType.GAME_CAN_START,
        data: { roomId }
      });
    }
  }

  private async requestGameState(room: Room, excludePlayerId: string): Promise<GameStateMessage<P, S> | null> {
    return new Promise((resolve) => {
      let responded = false;
      const timeout = setTimeout(() => {
        if (!responded) {
          resolve(null);
        }
      }, 2000); // 1 second timeout


      // Set up one-time handler for the response
      const stateHandler = (ws: WebSocket, message: any) => {
        if (message.type === GameMessageType.GAME_STATE_UPDATE) {
          responded = true;
          clearTimeout(timeout);
          resolve(message.data);
        }
      };





      // Remove handler after timeout
      setTimeout(() => {
        room.removeMessageHandler(stateHandler);
      }, 2000);

      room.addMessageHandler(stateHandler);
      // Request state from any player except the new one
      room.broadcast({
        type: GameMessageType.REQUEST_GAME_STATE,
        data: {}
      }, excludePlayerId);
    });
  }

  private handleGameStateUpdate(ws: WebSocket, state: GameStateMessage<P, S>) {
    const playerId = this.connections.get(ws);
    if (!playerId) return;

    const roomId = this.playerRooms.get(playerId);
    if (!roomId) return;

    this.gameStates.set(roomId, state);


  }

  private relayMessageToRoom(ws: WebSocket, message: any) {

    const playerId = this.connections.get(ws);

    // console.log(`Server relaying message from ${playerId}:`, message);

    if (!playerId) return;

    const roomId = this.playerRooms.get(playerId);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (!room) return;

    // Relay the message to all other players in the room
    room.broadcast(message, playerId);
  }

  private handlePlayerDisconnect(ws: WebSocket, playerId: string) {
    const roomId = this.playerRooms.get(playerId);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (!room) return;

    room.removePlayer(playerId);
    this.playerRooms.delete(playerId);

    // Notify others in the room
    room.broadcast({
      type: GameMessageType.PLAYER_LEFT,
      data: { playerId }
    });

    // If room is empty, remove it
    if (room.getPlayerCount() === 0) {
      this.rooms.delete(roomId);
    }
  }

  private sendError(ws: WebSocket, code: string, message: string) {
    ws.send(JSON.stringify({
      type: GameMessageType.ERROR,
      data: { code, message }
    }));
  }

  close() {
    this.wss.close();
  }
}
import { Vector2D } from "snake-game-engine";

export enum GameMessageType {
  // Room Management
  CREATE_ROOM = 'create-room',
  ROOM_CREATED = 'room-created',
  JOIN_ROOM = 'join-room',
  ROOM_JOINED = 'room-joined',
  PLAYER_JOINED = 'player-joined',
  PLAYER_LEFT = 'player-left',
  ROOM_FULL = 'room-full',
  GAME_CAN_START = 'game-can-start',
  START_GAME = 'start-game',
  GAME_STATE = 'game-state',
  GAME_STATE_UPDATE = 'game-state-update',
  REQUEST_GAME_STATE = 'request-game-state',
  ERROR = 'error'
}

// Room constants
export const ROOM_CONSTANTS = {
  MAX_PLAYERS: 4,
  MIN_PLAYERS_TO_START: 2
} as const;

// General game message interfaces
export interface RoomCreatedMessage {
  roomId: string;
  playerId: string;
}

export interface JoinRoomMessage {
  roomId: string;
}

export interface PlayerJoinedMessage {
  playerId: string;
  position: Vector2D;
}

export interface GameStateMessage {
  players: { id: string; snake: Vector2D[] }[];
  foodPosition: Vector2D;
}

export interface ErrorMessage {
  code: string;
  message: string;
}
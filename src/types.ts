import { WebSocket } from "ws";

export type HandlerFunction = (ws: WebSocket, data?: any, message?: any) => void;
export type RoomId = string;
export type PlayerId = string;

export enum RoomStatus {
  WAITING = 'waiting',
  READY = 'ready',
  PLAYING = 'playing'
}

export enum GameMessageType {
  // Room Management
  CREATE_ROOM = 'create-room',
  ROOM_CREATED = 'room-created',
  JOIN_ROOM = 'join-room',
  ROOM_JOINED = 'room-joined',
  PLAYER_JOINED = 'player-joined',
  PLAYER_LEFT = 'player-left',
  PLAYER_DIED = 'player-died',
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

export interface GameStateMessage<P = any, S = any> {
  players: P[];
  state: S;
}

export interface ErrorMessage {
  code: string;
  message: string;
}
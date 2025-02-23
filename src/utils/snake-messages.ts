import { Vector2D } from "snake-game-engine";

export enum SnakeMessageType {
  // Gameplay specific
  PLAYER_POSITION_UPDATE = 'player-position-update',
  FOOD_COLLECTED = 'food-collected',
  PLAYER_DIED = 'player-died'
}

// Snake specific message interfaces
export interface PlayerPositionMessage {
  playerId: string;
  positions: Vector2D[];
}

export interface FoodCollectedMessage {
  collectedBy: string;
  newFoodPosition: Vector2D;
}

export interface PlayerDiedMessage {
  playerId: string;
  finalPositions: Vector2D[];
}
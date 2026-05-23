export interface Tile {
  id: string;
  left: number;
  right: number;
}

export interface PlacedTile {
  tile: Tile;
  leftVal: number;  // The dot value displayed on the left of this visual tile
  rightVal: number; // The dot value displayed on the right of this visual tile
}

export type PlayerId = 'p1' | 'p2' | 'p3' | 'p4';

export interface Player {
  id: PlayerId;
  name: string;
  avatar: string;
  isBot: boolean;
  hand: Tile[];
  team: 1 | 2;
  isSpeaking: boolean;
  voiceLevel: number; // 0 to 100
  status: 'playing' | 'passed' | 'thinking' | 'idle';
}

export interface ScoreHand {
  id: string;
  roundNumber: number;
  team1Score: number;
  team2Score: number;
  winType: 'normal' | 'blocked' | 'manual';
  notes: string;
}

export interface GameMessage {
  id: string;
  senderId: PlayerId | 'system';
  senderName: string;
  text: string;
  timestamp: Date;
  isQuickMsg?: boolean;
}

export type GameMode = 2 | 4; // 2 players or 4 players

export interface GameState {
  mode: GameMode;
  players: Record<PlayerId, Player>;
  currentPlayerIndex: PlayerId;
  boneyard: Tile[]; // unused in 4-player
  placedTiles: PlacedTile[];
  leftEnd: number; // -1 if empty
  rightEnd: number; // -1 if empty
  targetScore: number; // e.g. 100, 200
  team1TotalScore: number;
  team2TotalScore: number;
  scoresHistory: ScoreHand[];
  status: 'setup' | 'playing' | 'round_over' | 'game_over';
  winnerId: PlayerId | null;
  winningTeam: 1 | 2 | null;
  roundNumber: number;
  starterId: PlayerId; // who started this round
  blocked: boolean;
}

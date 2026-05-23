import React, { useState, useEffect } from 'react';
import { Tile, PlacedTile, Player, ScoreHand, GameMessage, GameState, GameMode, PlayerId } from './types';
import { DominoTile } from './components/DominoTile';
import { GameBoard } from './components/GameBoard';
import { ScoreBoard } from './components/ScoreBoard';
import { ChatAndVoice } from './components/ChatAndVoice';
import {
  playClickSound,
  playPlaceSound,
  playPassSound,
  playWinRoundSound,
  playWinGameSound,
} from './utils/audio';
import {
  Sparkles,
  Award,
  Plus,
  Compass,
  Volume2,
  Users,
  Grid,
  Bot,
  User,
  HelpCircle,
  HelpCircle as RulesIcon
} from 'lucide-react';

// Create all 28 tiles in a double-six set
const createDoubleSixSet = (): Tile[] => {
  const set: Tile[] = [];
  for (let i = 0; i <= 6; i++) {
    for (let j = i; j <= 6; j++) {
      set.push({
        id: `tile-${i}-${j}`,
        left: i,
        right: j,
      });
    }
  }
  return set;
};

export default function App() {
  // Game state
  const [gameState, setGameState] = useState<GameState>({
    mode: 4,
    players: {
      p1: { id: 'p1', name: 'أنت 🤠', avatar: '🤠', isBot: false, hand: [], team: 1, isSpeaking: false, voiceLevel: 0, status: 'idle' },
      p2: { id: 'p2', name: 'كارلوس 🤖', avatar: '🤖', isBot: true, hand: [], team: 2, isSpeaking: false, voiceLevel: 0, status: 'idle' },
      p3: { id: 'p3', name: 'غابرييل 👽', avatar: '👽', isBot: true, hand: [], team: 1, isSpeaking: false, voiceLevel: 0, status: 'idle' },
      p4: { id: 'p4', name: 'صوفيا 🦊', avatar: '🦊', isBot: true, hand: [], team: 2, isSpeaking: false, voiceLevel: 0, status: 'idle' },
    },
    currentPlayerIndex: 'p1',
    boneyard: [],
    placedTiles: [],
    leftEnd: -1,
    rightEnd: -1,
    targetScore: 100,
    team1TotalScore: 0,
    team2TotalScore: 0,
    scoresHistory: [],
    status: 'setup',
    winnerId: null,
    winningTeam: null,
    roundNumber: 1,
    starterId: 'p1',
    blocked: false,
  });

  const [messages, setMessages] = useState<GameMessage[]>([
    {
      id: 'welcome',
      senderId: 'system',
      senderName: 'النظام',
      text: 'مرحباً بك في نادي الدومينو! اختر الإعدادات وانقر على بدء المباراة.',
      timestamp: new Date(),
    },
  ]);

  const [rulesOpen, setRulesOpen] = useState(false);

  // Helper function to trigger bot chatting bubbles on text & voice feed
  const triggerBotSpeech = (botId: PlayerId, text: string) => {
    // 1. Send text message
    const botPlayer = gameState.players[botId];
    if (!botPlayer || !botPlayer.isBot) return;

    const newMsg: GameMessage = {
      id: `bot-msg-${Date.now()}-${Math.random()}`,
      senderId: botId,
      senderName: botPlayer.name,
      text: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMsg]);

    // 2. Animate Voice Indicator speaking
    setGameState((prev) => {
      const updatedPlayers = { ...prev.players };
      updatedPlayers[botId] = {
        ...updatedPlayers[botId],
        isSpeaking: true,
        voiceLevel: 75 + Math.random() * 25,
      };
      return { ...prev, players: updatedPlayers };
    });

    // Stop speaking after 2.8 seconds
    setTimeout(() => {
      setGameState((prev) => {
        const updatedPlayers = { ...prev.players };
        if (updatedPlayers[botId]) {
          updatedPlayers[botId] = {
            ...updatedPlayers[botId],
            isSpeaking: false,
            voiceLevel: 0,
          };
        }
        return { ...prev, players: updatedPlayers };
      });
    }, 2800);
  };

  // Standard bot reaction responses to trigger dynamically
  const triggerRoundStartSpeech = () => {
    const speechDelay = 1000 + Math.random() * 1000;
    setTimeout(() => {
      const quotes = ["Good luck to everyone!", "Let's play a clean game 🀰", "May the best tiles win!"];
      const botIds: PlayerId[] = gameState.mode === 4 ? ['p2', 'p3', 'p4'] : ['p2'];
      const chosenBot = botIds[Math.floor(Math.random() * botIds.length)];
      const quote = quotes[Math.floor(Math.random() * quotes.length)];
      triggerBotSpeech(chosenBot, quote);
    }, speechDelay);
  };

  // Check tile playability for a player's tile against the board ends
  const checkTilePlayability = (tile: Tile, leftEnd: number, rightEnd: number) => {
    if (leftEnd === -1 && rightEnd === -1) {
      return { left: true, right: true }; // table is open
    }
    const matchesLeft = tile.left === leftEnd || tile.right === leftEnd;
    const matchesRight = tile.left === rightEnd || tile.right === rightEnd;

    // Strict Rule: After playing the double-six in the very first match / round 1,
    // players must start playing from the right side of the starter tile (placedTiles.length === 1).
    if (gameState.roundNumber === 1 && gameState.placedTiles.length === 1) {
      return { left: false, right: matchesRight };
    }

    return { left: matchesLeft, right: matchesRight };
  };

  // Shift turn to the next player
  const advanceTurn = (currState: GameState) => {
    const order: PlayerId[] = currState.mode === 4 ? ['p1', 'p2', 'p3', 'p4'] : ['p1', 'p2'];
    const currIdx = order.indexOf(currState.currentPlayerIndex);
    const nextIdx = (currIdx + 1) % order.length;
    const nextPlayerId = order[nextIdx];

    // Check if the game is completely blocked or players cleared hands
    const updatedState = {
      ...currState,
      currentPlayerIndex: nextPlayerId,
    };

    // Before finishing transition, audit if game is finished / blocked
    checkRoundOverConditions(updatedState);
  };

  // Perform a tile play on the board
  const playTile = (playerId: PlayerId, tileId: string, end: 'left' | 'right') => {
    setGameState((prev) => {
      const player = prev.players[playerId];
      const tile = player.hand.find((t) => t.id === tileId);
      if (!tile) return prev;

      // Filter out tile from hand
      const updatedHand = player.hand.filter((t) => t.id !== tileId);
      const isDouble = tile.left === tile.right;

      let newLeftEnd = prev.leftEnd;
      let newRightEnd = prev.rightEnd;
      let newPlacedTiles = [...prev.placedTiles];

      let placedTile: PlacedTile;

      if (prev.leftEnd === -1 && prev.rightEnd === -1) {
        // First tile ever played
        placedTile = {
          tile,
          leftVal: tile.left,
          rightVal: tile.right,
        };
        newLeftEnd = tile.left;
        newRightEnd = tile.right;
        newPlacedTiles.push(placedTile);
      } else if (end === 'left') {
        // Connecting to the left end
        if (tile.right === prev.leftEnd) {
          placedTile = { tile, leftVal: tile.left, rightVal: tile.right };
        } else {
          placedTile = { tile, leftVal: tile.right, rightVal: tile.left };
        }
        newLeftEnd = placedTile.leftVal;
        newPlacedTiles = [placedTile, ...newPlacedTiles];
      } else {
        // Connecting to the right end
        if (tile.left === prev.rightEnd) {
          placedTile = { tile, leftVal: tile.left, rightVal: tile.right };
        } else {
          placedTile = { tile, leftVal: tile.right, rightVal: tile.left };
        }
        newRightEnd = placedTile.rightVal;
        newPlacedTiles.push(placedTile);
      }

      // Play Sound
      playPlaceSound(isDouble);

      // Create a game log message
      const endText = end === 'left' ? 'اليسار' : 'اليمين';
      const textLog = `لعب ${player.name} الورقة [${tile.left}|${tile.right}] على جهة ${endText}`;
      const newLogs: GameMessage[] = [
        ...messages,
        {
          id: `log-${Date.now()}-${Math.random()}`,
          senderId: 'system',
          senderName: 'النظام',
          text: textLog,
          timestamp: new Date(),
        },
      ];
      setMessages(newLogs);

      // Update player profile
      const updatedPlayers = { ...prev.players };
      updatedPlayers[playerId] = {
        ...player,
        hand: updatedHand,
        status: 'playing',
      };

      const partialState = {
        ...prev,
        players: updatedPlayers,
        placedTiles: newPlacedTiles,
        leftEnd: newLeftEnd,
        rightEnd: newRightEnd,
      };

      // Check if this player finished their tiles
      if (updatedHand.length === 0) {
        // DOMINO WIN
        triggerRoundWinner(playerId, partialState, false);
        return partialState;
      }

      advanceTurn(partialState);
      return partialState;
    });
  };

  // Helper to draw a tile from the boneyard
  const drawFromBoneyard = (playerId: PlayerId) => {
    setGameState((prev) => {
      if (prev.boneyard.length === 0) return prev;

      const updatedBoneyard = [...prev.boneyard];
      const drawnTile = updatedBoneyard.shift()!;

      const player = prev.players[playerId];
      const updatedHand = [...player.hand, drawnTile];

      const updatedPlayers = { ...prev.players };
      updatedPlayers[playerId] = {
        ...player,
        hand: updatedHand,
      };

      playClickSound();

      // Log action
      const newMsg: GameMessage = {
        id: `draw-${Date.now()}-${Math.random()}`,
        senderId: 'system',
        senderName: 'النظام',
        text: `سحب ${player.name} ورقة من بنك الأوراق. (المتبقي: ${updatedBoneyard.length})`,
        timestamp: new Date(),
      };
      setMessages((prevMsg) => [...prevMsg, newMsg]);

      return {
        ...prev,
        boneyard: updatedBoneyard,
        players: updatedPlayers,
      };
    });
  };

  // Player passes turn
  const passTurn = (playerId: PlayerId) => {
    setGameState((prev) => {
      const player = prev.players[playerId];
      playPassSound();

      // Log pass
      const newMsg: GameMessage = {
        id: `pass-${Date.now()}-${Math.random()}`,
        senderId: 'system',
        senderName: 'النظام',
        text: `اضطر ${player.name} للتمرير!`,
        timestamp: new Date(),
      };
      setMessages((prevMsg) => [...prevMsg, newMsg]);

      // If Bot, speak on pass to show live conversation
      if (player.isBot) {
        setTimeout(() => {
          const quotes = [
            "تباً، تمرير! ليس لدي أوراق مناسبة.",
            "تمرير... يدي تبدو سيئة للغاية.",
            "لا توجد لعبة هنا، دورك!",
          ];
          triggerBotSpeech(playerId, quotes[Math.floor(Math.random() * quotes.length)]);
        }, 500);
      }

      const updatedPlayers = { ...prev.players };
      updatedPlayers[playerId] = {
        ...player,
        status: 'passed',
      };

      const partialState = {
        ...prev,
        players: updatedPlayers,
      };

      advanceTurn(partialState);
      return partialState;
    });
  };

  // Calculate sum of dots on remaining player hands
  const countHandDots = (hand: Tile[]) => {
    return hand.reduce((sum, tile) => sum + tile.left + tile.right, 0);
  };

  // Check if round is over or blocked
  const checkRoundOverConditions = (currState: GameState) => {
    const list = currState.mode === 4 ? ['p1', 'p2', 'p3', 'p4'] : ['p1', 'p2'] as PlayerId[];

    // 1. Check if anyone has playable tiles
    let anyoneCanPlay = false;
    list.forEach((id) => {
      const p = currState.players[id];
      p.hand.forEach((tile) => {
        const matches = checkTilePlayability(tile, currState.leftEnd, currState.rightEnd);
        if (matches.left || matches.right) {
          anyoneCanPlay = true;
        }
      });
    });

    // 2. If nobody can play and boneyard is empty, it is blocked!
    if (!anyoneCanPlay) {
      if (currState.mode === 2 && currState.boneyard.length > 0) {
        // Still can draw, not blocked
        return;
      }

      // BLOCKED GAME
      triggerRoundWinner(currState.currentPlayerIndex, currState, true);
    }
  };

  // Trigger win sequence at end of round
  const triggerRoundWinner = (lastPlayerId: PlayerId, currState: GameState, isBlocked: boolean) => {
    playWinRoundSound();

    let roundWinnerId = lastPlayerId;
    let winTeam: 1 | 2 = 1;
    let earnedPoints = 0;
    let noteText = '';

    const list: PlayerId[] = currState.mode === 4 ? ['p1', 'p2', 'p3', 'p4'] : ['p1', 'p2'];

    if (isBlocked) {
      // Find who has the lowest dot counts
      const counts = list.map((id) => ({
        id,
        dots: countHandDots(currState.players[id].hand),
        team: currState.players[id].team,
      }));

      // Sort by dots ascending
      counts.sort((a, b) => a.dots - b.dots);
      const lowestCountObj = counts[0];
      roundWinnerId = lowestCountObj.id;
      winTeam = lowestCountObj.team;

      // In blocked game, winner gets the sum of all remaining dots from all losers
      earnedPoints = counts.reduce((tot, item) => tot + item.dots, 0);
      noteText = `لعبة مغلقة، وفاز بها ${currState.players[roundWinnerId].name} (بقي معه ${lowestCountObj.dots} نقطة)`;
    } else {
      // Standard domino win
      const winner = currState.players[lastPlayerId];
      winTeam = winner.team;

      // Earned points is sum of dots in everyone else's hands
      earnedPoints = list.reduce((totalDots, id) => {
        if (id === lastPlayerId) return totalDots;
        return totalDots + countHandDots(currState.players[id].hand);
      }, 0);

      noteText = `دومينو! مسحت بواسطة ${winner.name}`;
    }

    // Trigger congratulations chitchat from bot
    setTimeout(() => {
      const winnerPlayer = currState.players[roundWinnerId];
      const botCongratulates = ["جولة رائعة جداً!", "واو، فوز عظيم!", "أحسنت المسح. كانت قريبة جداً."];
      const botChatterId: PlayerId = currState.mode === 4
        ? (roundWinnerId === 'p2' || roundWinnerId === 'p4' ? 'p3' : 'p2')
        : (roundWinnerId === 'p1' ? 'p2' : 'p1') as PlayerId;

      if (botChatterId !== 'p1') {
        triggerBotSpeech(botChatterId, botCongratulates[Math.floor(Math.random() * botCongratulates.length)]);
      }
    }, 1500);

    // Record score into running history totals
    setGameState((prev) => {
      const newTeam1Total = winTeam === 1 ? prev.team1TotalScore + earnedPoints : prev.team1TotalScore;
      const newTeam2Total = winTeam === 2 ? prev.team2TotalScore + earnedPoints : prev.team2TotalScore;

      const newHand: ScoreHand = {
        id: `hand-${Date.now()}`,
        roundNumber: prev.roundNumber,
        team1Score: winTeam === 1 ? earnedPoints : 0,
        team2Score: winTeam === 2 ? earnedPoints : 0,
        winType: isBlocked ? 'blocked' : 'normal',
        notes: noteText,
      };

      const finalStatus =
        newTeam1Total >= prev.targetScore || newTeam2Total >= prev.targetScore
          ? 'game_over'
          : 'round_over';

      if (finalStatus === 'game_over') {
        playWinGameSound();
      }

      return {
        ...prev,
        team1TotalScore: newTeam1Total,
        team2TotalScore: newTeam2Total,
        scoresHistory: [newHand, ...prev.scoresHistory],
        status: finalStatus,
        winningTeam: finalStatus === 'game_over' ? winTeam : null,
        blocked: isBlocked,
        winnerId: roundWinnerId,
      };
    });
  };

  // Bot AI Turn handler decider
  const makeBotDecision = (botId: PlayerId) => {
    const player = gameState.players[botId];
    
    const isFirstPlayOfRound1 = gameState.placedTiles.length === 0 && gameState.roundNumber === 1;
    let rawOptions = player.hand.map((tile) => {
      const playability = checkTilePlayability(tile, gameState.leftEnd, gameState.rightEnd);
      return { tile, playability };
    });

    if (isFirstPlayOfRound1) {
      const hasDoubleSix = player.hand.some((t) => t.left === 6 && t.right === 6);
      if (hasDoubleSix) {
        rawOptions = rawOptions.filter((op) => op.tile.left === 6 && op.tile.right === 6);
      }
    }

    const playableOptions = rawOptions.filter((op) => op.playability.left || op.playability.right);

    if (playableOptions.length > 0) {
      // Heuristically play: prefer doubles, then highest sum of dots on tile
      playableOptions.sort((a, b) => {
        const scoreA = (a.tile.left === a.tile.right ? 100 : 0) + (a.tile.left + a.tile.right);
        const scoreB = (b.tile.left === b.tile.right ? 100 : 0) + (b.tile.left + b.tile.right);
        return scoreB - scoreA;
      });

      const selectedOption = playableOptions[0];
      // Pick played end
      let side: 'left' | 'right' = 'left';
      if (selectedOption.playability.left && selectedOption.playability.right) {
        // If matched both, favor side with fewer tiles or random
        side = Math.random() > 0.5 ? 'left' : 'right';
      } else if (selectedOption.playability.right) {
        side = 'right';
      }

      playTile(botId, selectedOption.tile.id, side);
    } else {
      // Cannot play
      if (gameState.mode === 2 && gameState.boneyard.length > 0) {
        // In 2-p, draw!
        drawFromBoneyard(botId);
        // Briefly evaluate again since we got new tile (with artificial timing)
        setTimeout(() => {
          setGameState((prev) => {
            // Re-trigger turn evaluation
            return { ...prev };
          });
        }, 1000);
      } else {
        // In 4-p or when boneyard empty, pass!
        passTurn(botId);
      }
    }
  };

  // Watch for bot turns
  useEffect(() => {
    if (gameState.status === 'playing') {
      const activePlayer = gameState.players[gameState.currentPlayerIndex];
      if (activePlayer && activePlayer.isBot) {
        const timer = setTimeout(() => {
          makeBotDecision(gameState.currentPlayerIndex);
        }, 1800);
        return () => clearTimeout(timer);
      }
    }
  }, [gameState.currentPlayerIndex, gameState.status, gameState.boneyard.length]);

  // Command to Start a new fresh Match
  const startMatch = (chosenMode: GameMode) => {
    playClickSound();

    // Prepare fresh deck of 28 tiles
    const fullSet = createDoubleSixSet();
    const shuffled = [...fullSet].sort(() => Math.random() - 0.5);

    // Deal hands
    const p1Hand = shuffled.slice(0, 7);
    const p2Hand = shuffled.slice(7, 14);
    let p3Hand: Tile[] = [];
    let p4Hand: Tile[] = [];
    let restBoneyard: Tile[] = [];

    if (chosenMode === 4) {
      p3Hand = shuffled.slice(14, 21);
      p4Hand = shuffled.slice(21, 28);
    } else {
      restBoneyard = shuffled.slice(14, 28);
    }

    // Standard starting rule: find who has Double-Six [6|6] (the 6-point double)
    let startingPlayerId: PlayerId = 'p1';
    if (chosenMode === 4) {
      if (p1Hand.some((t) => t.left === 6 && t.right === 6)) startingPlayerId = 'p1';
      else if (p2Hand.some((t) => t.left === 6 && t.right === 6)) startingPlayerId = 'p2';
      else if (p3Hand.some((t) => t.left === 6 && t.right === 6)) startingPlayerId = 'p3';
      else if (p4Hand.some((t) => t.left === 6 && t.right === 6)) startingPlayerId = 'p4';
    } else {
      // 2 players, check highest double
      const getHighestDoubleValue = (hand: Tile[]) => {
        const doubles = hand.filter((t) => t.left === t.right);
        if (doubles.length === 0) return -1;
        return Math.max(...doubles.map((t) => t.left));
      };

      const p1Highest = getHighestDoubleValue(p1Hand);
      const p2Highest = getHighestDoubleValue(p2Hand);

      if (p1Highest >= p2Highest) {
        startingPlayerId = 'p1';
      } else {
        startingPlayerId = 'p2';
      }
    }

    const nextPlayersState: Record<PlayerId, Player> = {
      p1: { id: 'p1', name: 'You 🤠', avatar: '🤠', isBot: false, hand: p1Hand, team: 1, isSpeaking: false, voiceLevel: 0, status: 'playing' },
      p2: { id: 'p2', name: 'Carlos 🤖', avatar: '🤖', isBot: true, hand: p2Hand, team: 2, isSpeaking: false, voiceLevel: 0, status: 'playing' },
      p3: { id: 'p3', name: 'Gabriel 👽', avatar: '👽', isBot: true, hand: p3Hand, team: 1, isSpeaking: false, voiceLevel: 0, status: chosenMode === 4 ? 'playing' : 'idle' },
      p4: { id: 'p4', name: 'Sophia 🦊', avatar: '🦊', isBot: true, hand: p4Hand, team: 2, isSpeaking: false, voiceLevel: 0, status: chosenMode === 4 ? 'playing' : 'idle' },
    };

    setGameState({
      mode: chosenMode,
      players: nextPlayersState,
      currentPlayerIndex: startingPlayerId,
      boneyard: restBoneyard,
      placedTiles: [],
      leftEnd: -1,
      rightEnd: -1,
      targetScore: gameState.targetScore,
      team1TotalScore: 0,
      team2TotalScore: 0,
      scoresHistory: [],
      status: 'playing',
      winnerId: null,
      winningTeam: null,
      roundNumber: 1,
      starterId: startingPlayerId,
      blocked: false,
    });

    setMessages([
      {
        id: 'start-log',
        senderId: 'system',
        senderName: 'النظام',
        text: `بدأت المباراة! تبدأ الجولة الأولى بالستة المزدوجة [6|6] يلعبها ${nextPlayersState[startingPlayerId].name}. يستمر تناوب الدور جهة اليمين!`,
        timestamp: new Date(),
      },
    ]);

    triggerRoundStartSpeech();
  };

  // Commands to start a subsequent round with running totals preserved
  const startNextRound = () => {
    playClickSound();

    const fullSet = createDoubleSixSet();
    const shuffled = [...fullSet].sort(() => Math.random() - 0.5);

    const prevStarterIdx = gameState.starterId;
    const order: PlayerId[] = gameState.mode === 4 ? ['p1', 'p2', 'p3', 'p4'] : ['p1', 'p2'];
    const currIdx = order.indexOf(prevStarterIdx);
    const nextRoundStarterId = order[(currIdx + 1) % order.length];

    const p1Hand = shuffled.slice(0, 7);
    const p2Hand = shuffled.slice(7, 14);
    let p3Hand: Tile[] = [];
    let p4Hand: Tile[] = [];
    let restBoneyard: Tile[] = [];

    if (gameState.mode === 4) {
      p3Hand = shuffled.slice(14, 21);
      p4Hand = shuffled.slice(21, 28);
    } else {
      restBoneyard = shuffled.slice(14, 28);
    }

    setGameState((prev) => {
      const nextPlayersState: Record<PlayerId, Player> = {
        p1: { ...prev.players.p1, hand: p1Hand, status: 'playing' },
        p2: { ...prev.players.p2, hand: p2Hand, status: 'playing' },
        p3: { ...prev.players.p3, hand: p3Hand, status: prev.mode === 4 ? 'playing' : 'idle' },
        p4: { ...prev.players.p4, hand: p4Hand, status: prev.mode === 4 ? 'playing' : 'idle' },
      };

      return {
        ...prev,
        players: nextPlayersState,
        currentPlayerIndex: nextRoundStarterId,
        boneyard: restBoneyard,
        placedTiles: [],
        leftEnd: -1,
        rightEnd: -1,
        status: 'playing',
        winnerId: null,
        roundNumber: prev.roundNumber + 1,
        starterId: nextRoundStarterId,
        blocked: false,
      };
    });

    setMessages((prevMsg) => [
      ...prevMsg,
      {
        id: `round-log-${Date.now()}-${Math.random()}`,
        senderId: 'system',
        senderName: 'النظام',
        text: `بدأت الجولة ${gameState.roundNumber + 1}. يبدأ اللاعب ${gameState.players[nextRoundStarterId].name} اللعب.`,
        timestamp: new Date(),
      },
    ]);

    triggerRoundStartSpeech();
  };

  // Set the voice connection levels
  const handleVoiceTracking = (playerId: PlayerId, value: number) => {
    setGameState((prev) => {
      if (!prev.players[playerId]) return prev;
      const updatedPlayers = { ...prev.players };
      updatedPlayers[playerId] = {
        ...updatedPlayers[playerId],
        voiceLevel: value,
      };
      return { ...prev, players: updatedPlayers };
    });
  };

  // Add a message into the chat room log
  const handleAddMessage = (text: string, isQuickMsg?: boolean) => {
    const freshMsg: GameMessage = {
      id: `msg-${Date.now()}-${Math.random()}`,
      senderId: 'p1',
      senderName: 'You 🤠',
      text: text,
      timestamp: new Date(),
      isQuickMsg: isQuickMsg,
    };
    setMessages((prev) => [...prev, freshMsg]);

    // Triggers occasional playful bot textual/voice answers
    const delay = 1000 + Math.random() * 800;
    setTimeout(() => {
      const otherBots: PlayerId[] = gameState.mode === 4 ? ['p2', 'p3', 'p4'] : ['p2'];
      const responder = otherBots[Math.floor(Math.random() * otherBots.length)];

      if (isQuickMsg && text.includes("Capicu")) {
        triggerBotSpeech(responder, "Wow, Capicu play is epic! 😮");
      } else if (isQuickMsg && text.includes("Pass")) {
        triggerBotSpeech(responder, "Tough break partner, I got your back!");
      } else if (text.toLowerCase().includes("game")) {
        triggerBotSpeech(responder, "Outstanding game so far!");
      }
    }, delay);
  };

  // ScoreBoard event handlers
  const handleScoreAdd = (t1Pt: number, t2Pt: number, notes?: string) => {
    setGameState((prev) => {
      const newT1Total = prev.team1TotalScore + t1Pt;
      const newT2Total = prev.team2TotalScore + t2Pt;

      const newHand: ScoreHand = {
        id: `manual-hand-${Date.now()}-${Math.random()}`,
        roundNumber: prev.scoresHistory.length + 1,
        team1Score: t1Pt,
        team2Score: t2Pt,
        winType: 'manual',
        notes: notes || 'Manual points added',
      };

      const finalStatus =
        newT1Total >= prev.targetScore || newT2Total >= prev.targetScore ? 'game_over' : prev.status;

      if (finalStatus === 'game_over') {
        playWinGameSound();
      }

      return {
        ...prev,
        team1TotalScore: newT1Total,
        team2TotalScore: newT2Total,
        scoresHistory: [newHand, ...prev.scoresHistory],
        status: finalStatus as any,
        winningTeam: finalStatus === 'game_over' ? (newT1Total >= prev.targetScore ? 1 : 2) : null,
      };
    });
  };

  const handleScoreDelete = (id: string) => {
    setGameState((prev) => {
      const foundIdx = prev.scoresHistory.findIndex((h) => h.id === id);
      if (foundIdx === -1) return prev;

      const hand = prev.scoresHistory[foundIdx];
      const updatedHistory = prev.scoresHistory.filter((h) => h.id !== id);

      return {
        ...prev,
        team1TotalScore: Math.max(0, prev.team1TotalScore - hand.team1Score),
        team2TotalScore: Math.max(0, prev.team2TotalScore - hand.team2Score),
        scoresHistory: updatedHistory,
        status: 'playing', // revert game over if deleted
        winnerId: null,
        winningTeam: null,
      };
    });
  };

  const handleResetScores = () => {
    playClickSound();
    setGameState((prev) => ({
      ...prev,
      team1TotalScore: 0,
      team2TotalScore: 0,
      scoresHistory: [],
      status: prev.status === 'game_over' ? 'setup' : prev.status,
      winnerId: null,
      winningTeam: null,
    }));
    setMessages((prev) => [
      ...prev,
      {
        id: `reset-scores-${Date.now()}`,
        senderId: 'system',
        senderName: 'النظام',
        text: 'تم تصفير لوحة النتائج وإعادتها إلى الصفر.',
        timestamp: new Date(),
      },
    ]);
  };

  // Setup lobby parameters
  const userHand = gameState.players.p1?.hand || [];
  const isUserTurn = gameState.currentPlayerIndex === 'p1' && gameState.status === 'playing';

  // Find user options
  const userPlayableOptions = userHand.map((tile) => {
    return {
      tile,
      playability: checkTilePlayability(tile, gameState.leftEnd, gameState.rightEnd),
    };
  });

  const hasAnyPlayable = userPlayableOptions.some((op) => op.playability.left || op.playability.right);
  const showBoneyardDraw = gameState.mode === 2 && !hasAnyPlayable && gameState.boneyard.length > 0 && isUserTurn;
  const showPassAction = ((gameState.mode === 4) || (gameState.mode === 2 && gameState.boneyard.length === 0)) && !hasAnyPlayable && isUserTurn;

  const renderPlayerSeat = (playerId: PlayerId, direction: 'North' | 'South' | 'West' | 'East') => {
    const p = gameState.players[playerId];
    if (!p) return null;

    const isActive = p.id === gameState.currentPlayerIndex && gameState.status === 'playing';
    
    // Relationship badge
    let relationBadge = "";
    let relationColor = "text-zinc-500";
    if (p.id === 'p1') {
      relationBadge = "YOU";
      relationColor = "text-amber-400 bg-amber-400/10";
    } else if (gameState.mode === 4) {
      if (p.id === 'p3') {
        relationBadge = "PARTNER";
        relationColor = "text-blue-400 bg-blue-400/10";
      } else {
        relationBadge = "OPPONENT";
        relationColor = "text-red-400 bg-red-400/10";
      }
    } else {
      if (p.id === 'p2') {
        relationBadge = "OPPONENT";
        relationColor = "text-red-400 bg-red-400/10";
      } else {
        relationBadge = "SPECTATOR";
        relationColor = "text-zinc-400 bg-zinc-800/40 border border-zinc-700/20";
      }
    }

    // Voice tracking level animation bars
    const renderVoiceWave = () => {
      if (!p.isSpeaking && p.voiceLevel === 0) return null;
      const level = p.voiceLevel || (p.isSpeaking ? 30 : 0);
      const height1 = Math.max(4, Math.round(level * 0.15));
      const height2 = Math.max(4, Math.round(level * 0.25));
      const height3 = Math.max(4, Math.round(level * 0.1));
      
      return (
        <div className="flex items-end gap-0.5 h-4 ml-1.5" title="Live Voice Transmission">
          <div className="w-1 bg-emerald-400 rounded-full animate-pulse" style={{ height: `${height1}px` }} />
          <div className="w-1 bg-emerald-500 rounded-full animate-pulse" style={{ height: `${height2}px` }} />
          <div className="w-1 bg-emerald-400 rounded-full animate-pulse" style={{ height: `${height3}px` }} />
        </div>
      );
    };

    return (
      <div
        id={`seat-${playerId}`}
        className={`relative flex flex-col p-3 rounded-xl bg-zinc-950/90 border transition-all duration-300 w-full max-w-[145px] shadow-2xl
          ${isActive 
            ? 'border-amber-400 bg-zinc-900/90 ring-1 ring-amber-400/30 scale-102 shadow-amber-500/5' 
            : 'border-zinc-850 bg-zinc-950/70 hover:bg-zinc-950 text-zinc-400'
          }`}
      >
        {/* Compass position label */}
        <div className="absolute -top-2.5 right-3 px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded-full text-[8.5px] font-black tracking-widest text-zinc-500 uppercase">
          {direction}
        </div>

        {/* Player Identity header */}
        <div className="flex items-center gap-2">
          <div className="relative">
            {/* Avatar frame */}
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-lg bg-zinc-900 border-2 transition-transform duration-300
              ${isActive ? 'border-amber-400 scale-105' : 'border-zinc-800'}`}
            >
              <span className="select-none">{p.avatar}</span>
            </div>
            {/* Active turn indicator circle */}
            {isActive && (
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500"></span>
              </span>
            )}
          </div>

          <div className="flex flex-col text-left min-w-0">
            <span className="font-extrabold text-[11px] text-zinc-200 truncate leading-snug">
              {p.name}
            </span>
            <div className="flex items-center gap-1 mt-0.5" style={{ minHeight: '14px' }}>
              <span className={`text-[8px] font-bold px-1 py-0.5 rounded leading-none ${relationColor} tracking-wider`}>
                {relationBadge}
              </span>
              {renderVoiceWave()}
            </div>
          </div>
        </div>

        {/* Display visual Tile backs matching how many domino tiles they have */}
        <div className="mt-2.5 pt-2 border-t border-zinc-900/60 flex flex-col gap-1 text-left" dir="rtl">
          <div className="flex items-center justify-between text-[9px] uppercase font-mono tracking-wider text-zinc-400">
            <span>{gameState.mode === 2 && (p.id === 'p3' || p.id === 'p4') ? 'مراقب' : 'ترتيب الأوراق في اليد'}</span>
            <strong className="text-zinc-200">
              {gameState.mode === 2 && (p.id === 'p3' || p.id === 'p4') ? '—' : p.hand.length}
            </strong>
          </div>
          
          <div className="flex items-center gap-1 h-5 overflow-hidden">
            {gameState.mode === 2 && (p.id === 'p3' || p.id === 'p4') ? (
              <span className="text-[9px] text-zinc-500 font-semibold uppercase tracking-wider font-mono">
                🛋️ يشاهد المباراة
              </span>
            ) : (
              <>
                {Array.from({ length: p.hand.length }).map((_, i) => (
                  <div 
                    key={i} 
                    className="w-2 h-4 bg-gradient-to-br from-zinc-100 to-zinc-350 border border-zinc-500 rounded-[2px] shadow-[0_1px_1px_rgba(0,0,0,0.5)] flex items-center justify-center select-none"
                    style={{ transform: `rotate(${Math.round(Math.sin(i) * 5)}deg)` }}
                    title={`${p.name}'s tile`}
                  >
                    <div className="w-[0.5px] h-2.5 bg-zinc-650 opacity-60" />
                  </div>
                ))}
                {p.hand.length === 0 && (
                  <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider animate-pulse flex items-center gap-1">
                    🎉 يد فارغة
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Live Game Status text label */}
        <div className="mt-2 flex items-center justify-between" dir="rtl">
          <span className="text-[7.5px] font-mono uppercase tracking-widest text-zinc-500">
            الحالة:
          </span>
          <span className={`text-[8.5px] font-mono uppercase font-bold tracking-wider
            ${p.status === 'passed' ? 'text-red-400' : isActive ? 'text-amber-400 animate-pulse' : 'text-zinc-400'}`}
          >
            {gameState.mode === 2 && (p.id === 'p3' || p.id === 'p4')
              ? '👀 مشاهدة فقط'
              : p.status === 'passed'
              ? '❌ تم التمرير'
              : isActive
              ? '✍️ يفكر...'
              : 'مستعد'}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans flex flex-col antialiased">
      {/* Dynamic Header */}
      <header className="relative border-b border-zinc-850 bg-zinc-950/85 backdrop-blur-md z-40 px-6 py-4 flex items-center justify-between" dir="rtl">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 bg-amber-500 rounded-lg flex items-center justify-center font-black text-black text-xl shadow-lg shadow-amber-500/10">
            🀰
          </div>
          <div className="text-right">
            <h1 className="text-sm font-black tracking-widest text-zinc-100 uppercase">
              نادي الدومينو
            </h1>
            <p className="text-[10px] text-zinc-500 font-mono tracking-wider uppercase">
              باقة الستة المزدوجة الفاخرة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setRulesOpen(!rulesOpen)}
            className="px-3.5 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-xs font-semibold text-zinc-300 hover:text-amber-500 transition-all flex items-center gap-1.5 active:scale-95"
          >
            <HelpCircle className="w-4 h-4" />
            قوانين اللعبة
          </button>
        </div>
      </header>

      {/* Rules overlay drawer */}
      {rulesOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-6 animate-fadeIn pb-12" dir="rtl">
          <div className="max-w-xl bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl relative text-right">
            <h2 className="text-zinc-100 font-bold text-lg border-b border-zinc-800 pb-3 mb-4 flex items-center gap-2 justify-start">
              <RulesIcon className="text-amber-500 w-5 h-5 animate-pulse" /> قوانين اللعبة وطريقة اللعب
            </h2>
            <div className="text-xs text-zinc-350 flex flex-col gap-3 leading-relaxed max-h-[400px] overflow-y-auto pl-2">
              <p>
                <strong>دومينو الستة المزدوجة [6|6]</strong> تُلعب بـ 28 ورقة. تحتوي كل ورقة على جزأين بداخل كل منهما من 0 إلى 6 نقاط.
              </p>
              <div>
                <h4 className="font-semibold text-zinc-200 mt-2 text-sm">🔄 تتبع نقاط الفريقين</h4>
                <p>تتراكم نقاط لوحة الصدارة جولة بعد جولة. عند انتهاء الجولة، تُضاف النقاط المكتسبة لصالح فريقك. يمكنك تغيير الهدف (من 50 إلى 300 نقطة) من القائمة المنسدلة بالأعلى.</p>
              </div>
              <div>
                <h4 className="font-semibold text-zinc-200 text-sm">👥 وضع لاعبين (1 ضد 1) مقابل 4 لاعبين (شراكة)</h4>
                <ul className="list-disc pr-5 flex flex-col gap-1 mt-1 text-right">
                  <li><strong>وضع 4 لاعبين:</strong> اللعب القياسي كشريكين متقابلين. يمثل الفريق 1 (أنت 🤠 وغابرييل 👽)، بينما يمثل الفريق 2 (كارلوس 🤖 وصوفيا 🦊). يحمل كل لاعب 7 أوراق. لا يوجد بنك أوراق للمساندة؛ إذا عجزت عن اللعب، يجب عليك التمرير (باص)!</li>
                  <li><strong>وضع لاعبين:</strong> تحدي 1 ضد 1 ضد كارلوس. الفريق 1 هو أنت، والفريق 2 هو كارلوس. توضع الـ 14 ورقة الإضافية في <strong>بنك الأوراق</strong>. إذا عجزت عن اللعب، يجب عليك السحب منه.</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-zinc-200 text-sm">🎙️ لوحة الصوت والمحادثات</h4>
                <p>تتميز بتتبع تفاعلي حقيقي لمستوى صوت الميكروفون. تحدث لتجربة الموجات الصوتية في الوقت الفعلي. ستتفاعل الروبوتات تفاعلاً مرحاً مع كل حدث على الطاولة.</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setRulesOpen(false)}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 font-bold text-black text-xs uppercase tracking-wide rounded shadow-md active:scale-95 transition-all"
              >
                إغلاق الدليل
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Central Layout Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col gap-6">

        {gameState.status === 'setup' ? (
          /* ================== LOBBY ROOM / SETUP ================== */
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto bg-zinc-950 border border-zinc-850 rounded-2xl py-12 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-radial-at-c from-amber-500/5 to-transparent pointer-events-none" />

            <div className="h-16 w-16 bg-zinc-900 border border-amber-500/25 rounded-2xl flex items-center justify-center text-4xl mb-6 shadow-md shadow-amber-500/5">
              🀰
            </div>

            <h2 className="text-zinc-100 font-black text-2xl tracking-wide uppercase">
              ردهة نادي الدومينو
            </h2>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm font-medium leading-relaxed">
              استمتع بمباراة دومينو حقيقية مجهزة بلوحات تسجيل نقاط تفاعلية، ومؤشرات التقاط صوت طبيعية، ورسائل تكتيكية سريعة.
            </p>

            <div className="w-full mt-8 flex flex-col gap-4 text-right">
              <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest font-mono text-right border-r-2 border-amber-500 pr-2 pb-0.5">
                اختر نمط اللعب المفضل:
              </span>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setGameState((prev) => ({ ...prev, mode: 2 }))}
                  className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all shadow-md active:scale-95
                    ${gameState.mode === 2
                      ? 'bg-amber-500/10 border-amber-500 text-amber-500'
                      : 'bg-zinc-900/40 border-zinc-850 text-zinc-400 hover:border-zinc-700'
                    }`}
                >
                  <User className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase">لاعبان (1 ضد 1)</span>
                  <span className="text-[9px] text-zinc-500 font-mono">تحدي فردي مع سحب أوراق</span>
                </button>

                <button
                  onClick={() => setGameState((prev) => ({ ...prev, mode: 4 }))}
                  className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all shadow-md active:scale-95
                    ${gameState.mode === 4
                      ? 'bg-amber-500/10 border-amber-500 text-amber-500'
                      : 'bg-zinc-900/40 border-zinc-850 text-zinc-400 hover:border-zinc-700'
                    }`}
                >
                  <Users className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase">4 لاعبين (شراكة)</span>
                  <span className="text-[9px] text-zinc-500 font-mono">منافسة تشاركية 2 ضد 2</span>
                </button>
              </div>

              <div className="mt-4 flex flex-col gap-2.5 text-right bg-zinc-900/35 border border-zinc-850 p-4 rounded-xl" dir="rtl">
                <span className="text-[10px] font-mono font-bold tracking-wider text-zinc-500 uppercase">
                  ترتيب اللاعبين للقاء الحامي
                </span>
                <p className="text-xs text-zinc-400 leading-relaxed text-right">
                  {gameState.mode === 4 ? (
                    <span>
                      • <strong>الفريق 1:</strong> أنت 🤠 وغابرييل 👽 (شراكة متقابلة) <br />
                      • <strong>الفريق 2:</strong> كارلوس 🤖 وصوفيا 🦊
                    </span>
                  ) : (
                    <span>
                      • <strong>الفريق 1:</strong> أنت 🤠 <br />• <strong>الفريق 2:</strong> كارلوس 🤖
                    </span>
                  )}
                </p>
              </div>
            </div>

            <button
              onClick={() => startMatch(gameState.mode)}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-widest rounded-xl mt-8 shadow-lg shadow-amber-500/10 transition-all active:scale-95"
            >
              بدء المباراة الحالية
            </button>
          </div>
        ) : (
          /* ================== MAIN GAMEPLAY GRAPHICS ================== */
          <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 items-start">
            {/* COLUMN 1: ScoreBoard columns in visual top layout (cols 4, but let's make it spam the row) */}
            <div className="lg:col-span-12 w-full">
              <ScoreBoard
                mode={gameState.mode}
                team1Score={gameState.team1TotalScore}
                team2Score={gameState.team2TotalScore}
                scoresHistory={gameState.scoresHistory}
                targetScore={gameState.targetScore}
                onAddScore={handleScoreAdd}
                onDeleteScore={handleScoreDelete}
                onResetScores={handleResetScores}
                onSetTargetScore={(tar) => setGameState((prev) => ({ ...prev, targetScore: tar }))}
                team1Name={gameState.mode === 4 ? "الفريق 1 (أنت وغابرييل)" : "أنت"}
                team2Name={gameState.mode === 4 ? "الفريق 2 (كارلوس وصوفيا)" : "كارلوس"}
              />
            </div>

            {/* COLUMN 2: DOMINO BOARD & PLAYER CONTROLS (cols 8) */}
            <div className="lg:col-span-8 flex flex-col gap-6 w-full">
              {/* Immersive 4-Direction Seating Board Table */}
              <div className="relative w-full bg-zinc-950/45 border border-zinc-900/40 rounded-3xl p-4 md:p-6 shadow-2xl flex flex-col gap-5 items-center justify-center overflow-hidden">
                {/* Table Ambient Felt Center Circle */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-amber-500/5 blur-[100px] pointer-events-none select-none" />

                {/* NORTH SEAT */}
                <div className="relative z-10 flex justify-center w-full animate-fadeIn">
                  {renderPlayerSeat('p3', 'North')}
                </div>

                {/* MIDDLE ROW: WEST SEAT, BOARD, EAST SEAT */}
                <div className="relative z-10 w-full flex flex-col xl:flex-row gap-4 xl:gap-6 items-center justify-between animate-fadeIn">
                  {/* WEST SEAT */}
                  <div className="flex xl:shrink-0 justify-center xl:justify-end w-full xl:w-auto animate-fadeIn col-span-1">
                    {renderPlayerSeat('p2', 'West')}
                  </div>

                  {/* MAIN BOARD CENTER PIECE */}
                  <div className="flex-1 w-full min-w-0">
                    {gameState.status === 'round_over' || gameState.status === 'game_over' ? (
                      /* Round Over Screen / Restart Banner */
                      <div className="relative p-6 rounded-2xl bg-zinc-900 border border-amber-500/20 text-center flex flex-col items-center justify-center shadow-lg min-h-[320px]">
                        {gameState.status === 'game_over' ? (
                          <>
                            <Award className="w-12 h-12 text-yellow-500 animate-pulse mb-3" />
                            <h2 className="text-xl font-bold uppercase tracking-wider text-amber-500 font-sans">
                              {gameState.winningTeam === 1 ? '🥇 أبطال اللعبة بالفوز الساحق!' : '🏆 الفريق 2 يفوز بالمباراة الكبرى!'}
                            </h2>
                            <p className="text-xs text-zinc-400 max-w-sm mt-1 leading-relaxed font-sans">
                              تم تجاوز الهدف المحدد البالغ <strong>{gameState.targetScore}</strong> نقطة. يا له من انتصار رائع! العب بنمط آخر من الردهة.
                            </p>
                            <button
                              onClick={() => setGameState((prev) => ({ ...prev, status: 'setup' }))}
                              className="mt-6 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 font-extrabold text-black text-xs uppercase tracking-widest rounded-lg shadow-lg active:scale-95 transition-all font-sans"
                            >
                              العودة إلى ردهة الإعداد للعب مجدداً
                            </button>
                          </>
                        ) : (
                          <>
                            <h2 className="text-lg font-extrabold uppercase tracking-wide text-zinc-100 font-sans">
                              اكتملت الجولة {gameState.roundNumber}
                            </h2>
                            <p className="text-xs text-zinc-400 mt-1 max-w-sm leading-relaxed font-sans" dir="rtl">
                              الفائز: <strong>{gameState.winnerId ? gameState.players[gameState.winnerId].name : 'N/A'}</strong> <br />
                              {gameState.blocked ? '🔒 انتهت الجولة بقفل اللعبة،' : '🀰 انتهت بمسح اليد تماماً،'}{' '}
                              تمت إضافة نقاط الجولة للفريق.
                            </p>

                            <button
                              onClick={startNextRound}
                              className="mt-5 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 font-extrabold text-black text-xs uppercase tracking-wider rounded-lg shadow-lg active:scale-95 transition-all font-sans"
                            >
                              موزع الجولة التالية
                            </button>
                          </>
                        )}
                      </div>
                    ) : (
                      /* Active Table Game Board */
                      <GameBoard
                        placedTiles={gameState.placedTiles}
                        leftEnd={gameState.leftEnd}
                        rightEnd={gameState.rightEnd}
                      />
                    )}
                  </div>

                  {/* EAST SEAT */}
                  <div className="flex xl:shrink-0 justify-center xl:justify-start w-full xl:w-auto animate-fadeIn col-span-1">
                    {renderPlayerSeat('p4', 'East')}
                  </div>
                </div>

                {/* SOUTH SEAT */}
                <div className="relative z-10 flex justify-center w-full animate-fadeIn">
                  {renderPlayerSeat('p1', 'South')}
                </div>
              </div>

              {/* Boneyard Pile Display */}
              {gameState.mode === 2 && gameState.status === 'playing' && (
                <div className="bg-zinc-950 border border-zinc-850 rounded-2xl p-4 flex items-center justify-between shadow-2xl" dir="rtl">
                  <div className="flex items-center gap-2.5 text-right">
                    <Grid className="w-4 h-4 text-emerald-500" />
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 font-sans">
                        بنك السحب الاحتياطي (الساحب)
                      </span>
                      <p className="text-[10px] text-zinc-500 font-mono mt-0.5 text-right">
                        أوراق بنك السحب المتبقية: <strong className="text-zinc-300 font-sans">{gameState.boneyard.length}</strong>
                      </p>
                    </div>
                  </div>

                  {showBoneyardDraw ? (
                    <button
                      onClick={() => drawFromBoneyard('p1')}
                      className="px-4 py-2 bg-emerald-550 hover:bg-emerald-500 hover:shadow-emerald-550/10 text-black font-extrabold text-xs uppercase tracking-wider rounded-lg shadow-md active:scale-95 transition-all font-sans"
                    >
                      اسحب ورقة قابلة للعب
                    </button>
                  ) : (
                    <span className="text-[10px] uppercase font-mono text-zinc-600 font-sans">
                      {gameState.boneyard.length > 0 ? "مغلق - العب من يدك" : "البنك فارغ تماماً"}
                    </span>
                  )}
                </div>
              )}

              {/* Active Player Deck Hand */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-2.5xl p-6 shadow-2xl flex flex-col gap-4 relative overflow-visible" dir="rtl">
                {/* Background visual detail */}
                <div className="absolute inset-0 bg-radial-at-b from-amber-500/5 to-transparent pointer-events-none select-none rounded-2.5xl" />

                <div className="relative z-10 flex items-center justify-between border-b border-zinc-900 pb-2">
                  <span className="text-[10px] font-extrabold uppercase font-mono tracking-widest text-amber-500 flex items-center gap-1">
                    أوراقك الحالية 🤠
                  </span>
                  <span className="text-xs text-zinc-500 font-mono">
                    {userHand.length} أوراق
                  </span>
                </div>

                {/* Hand of Tiles rendered */}
                <div className="relative z-10 flex flex-wrap items-center justify-center gap-3.5 py-4 px-2 min-h-[140px]">
                  {gameState.status !== 'playing' ? (
                    <div className="text-zinc-650 text-xs font-sans select-none text-center">
                      يدك مغلقة مؤقتاً أثناء فرز الجولات أو أثناء التواجد في الردهة الرئيسية.
                    </div>
                  ) : userHand.length === 0 ? (
                    <div className="text-emerald-500 font-bold uppercase tracking-wide animate-pulse font-sans">
                      لقد لعبت جميع أوراقك بنجاح! 🎉
                    </div>
                  ) : (
                    userHand.map((tile) => {
                      const playableInfo = checkTilePlayability(
                        tile,
                        gameState.leftEnd,
                        gameState.rightEnd
                      );
                      const isPlayable = isUserTurn && (playableInfo.left || playableInfo.right);

                      // If first move of round, we must play Double Six if we have it
                      const hasDoubleSixIdx = userHand.findIndex((t) => t.left === 6 && t.right === 6);
                      let isForcedDoubleSix = false;
                      if (hasDoubleSixIdx !== -1 && gameState.placedTiles.length === 0 && gameState.roundNumber === 1 && gameState.starterId === 'p1') {
                        isForcedDoubleSix = true;
                      }

                      const actualPlayableEnds = isForcedDoubleSix
                        ? { left: tile.left === 6 && tile.right === 6, right: tile.left === 6 && tile.right === 6 }
                        : isPlayable
                        ? playableInfo
                        : { left: false, right: false };

                      return (
                        <DominoTile
                          key={tile.id}
                          tile={tile}
                          size="md"
                          playableEnds={actualPlayableEnds}
                          onPlay={(end) => playTile('p1', tile.id, end)}
                          disabled={isUserTurn ? (!isPlayable && !isForcedDoubleSix) : true}
                        />
                      );
                    })
                  )}
                </div>

                {/* Interactive hand status / actions */}
                <div className="relative z-10 mt-2 pt-3 border-t border-zinc-900 flex justify-between items-center flex-wrap gap-4" dir="rtl">
                  {isUserTurn ? (
                    hasAnyPlayable ? (
                      <span className="text-xs font-bold text-amber-500 animate-pulse flex items-center gap-1.5 font-sans">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" /> اختر إحدى أوراقك المتوهجة لمطابقة الأطراف على الطاولة! ✨
                      </span>
                    ) : showBoneyardDraw ? (
                      <span className="text-xs text-zinc-400 font-medium font-sans">
                        ليس لديك أوراق مطابقة صالحة للعب! يرجى السحب من بنك الأوراق الاحتياطي.
                      </span>
                    ) : showPassAction ? (
                      <div className="flex items-center justify-between w-full" dir="rtl">
                        <span className="text-xs text-red-400 font-semibold uppercase tracking-wider font-sans">
                          مغلق! لا تتوفر لديك أوراق مطابقة صالحة للعب
                        </span>
                        <button
                          onClick={() => passTurn('p1')}
                          className="px-5 py-2 bg-red-650 hover:bg-red-700 font-bold text-white text-xs uppercase tracking-wider rounded shadow-md active:scale-95 transition-all font-sans"
                        >
                          تمرير دوري (باص)
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-500 font-sans">جاري التفكير وتهيأة الخيارات...</span>
                    )
                  ) : (
                    <span className="text-xs text-zinc-505 font-sans">
                      ⌛ في انتظار دور اللاعبين الآخرين لاتخاذ قراراتهم في اللعب...
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* COLUMN 3: CHAT AND GROUP VOICE CONTROLS (cols 4) */}
            <div className="lg:col-span-4 w-full">
              <ChatAndVoice
                mode={gameState.mode}
                players={gameState.players}
                messages={messages}
                currentPlayerId={gameState.currentPlayerIndex}
                onSendMessage={handleAddMessage}
                onTalkingActive={handleVoiceTracking}
              />
            </div>
          </div>
        )}
      </main>

      {/* Premium Footer */}
      <footer className="mt-auto border-t border-zinc-900 bg-zinc-950 py-4 text-center">
        <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
          برنامج نادي الدومينو • جماليات بصرية وملمس واقعي بالكامل • محلل صوت تفاعلي مباشر
        </p>
      </footer>
    </div>
  );
}

import React from 'react';
import { Tile } from '../types';

interface DominoTileProps {
  tile: Tile;
  onClick?: () => void;
  disabled?: boolean;
  playableEnds?: { left: boolean; right: boolean };
  onPlay?: (end: 'left' | 'right') => void;
  horizontal?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isBackside?: boolean;
}

export const DominoTile: React.FC<DominoTileProps> = ({
  tile,
  onClick,
  disabled = false,
  playableEnds = { left: false, right: false },
  onPlay,
  horizontal = false,
  size = 'md',
  isBackside = false,
}) => {
  // Dot coordinate mapping on a standard 3x3 grid relative to a 100x100 half-tile canvas
  // C: 50,50 (center)
  // TL: 25,25 (top-left), TR: 75,25 (top-right)
  // ML: 25,50 (middle-left), MR: 75,50 (middle-right)
  // BL: 25,75 (bottom-left), BR: 75,75 (bottom-right)
  const getDotPositions = (val: number): [number, number][] => {
    switch (val) {
      case 1:
        return [[50, 50]];
      case 2:
        return [
          [25, 25],
          [75, 75],
        ];
      case 3:
        return [
          [25, 25],
          [50, 50],
          [75, 75],
        ];
      case 4:
        return [
          [25, 25],
          [75, 25],
          [25, 75],
          [75, 75],
        ];
      case 5:
        return [
          [25, 25],
          [75, 25],
          [50, 50],
          [25, 75],
          [75, 75],
        ];
      case 6:
        return [
          [25, 25],
          [75, 25],
          [25, 50],
          [75, 50],
          [25, 75],
          [75, 75],
        ];
      default:
        return [];
    }
  };

  const drawDots = (val: number) => {
    const dots = getDotPositions(val);
    const radius = size === 'sm' ? 4 : size === 'md' ? 5.5 : 7;
    return dots.map(([cx, cy], idx) => (
      <circle
        key={idx}
        cx={cx}
        cy={cy}
        r={radius}
        fill="url(#blackGrad)"
        className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]"
      />
    ));
  };

  // Dimensional ratios
  const dimensions = {
    sm: { w: 36, h: 72, radius: 3, dotRad: 3 },
    md: { w: 50, h: 100, radius: 4, dotRad: 4 },
    lg: { w: 68, h: 136, radius: 6, dotRad: 5 },
    xl: { w: 84, h: 168, radius: 8, dotRad: 6 },
  }[size];

  const width = horizontal ? dimensions.h : dimensions.w;
  const height = horizontal ? dimensions.w : dimensions.h;

  const isPlayable = playableEnds.left || playableEnds.right;

  if (isBackside) {
    // Back profile of the domino tile (luxurious textured look)
    return (
      <div
        style={{ width, height, borderRadius: dimensions.radius }}
        className="relative bg-zinc-900 border border-zinc-800 flex items-center justify-center select-none shadow-lg overflow-hidden"
      >
        {/* Intricate golden geometric pattern or crest representing the card back */}
        <div className="absolute inset-2 border border-dashed border-amber-600/35 rounded-sm flex items-center justify-center opacity-60">
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 40 80"
            className="text-amber-500/30"
            fill="currentColor"
          >
            <path d="M 0,0 L 40,80 M 40,0 L 0,80" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2" />
            <circle cx="20" cy="40" r="10" stroke="currentColor" strokeWidth="0.5" fill="none" />
            <circle cx="20" cy="40" r="5" stroke="currentColor" strokeWidth="0.5" fill="none" />
            <polygon points="20,15 25,25 15,25" stroke="currentColor" strokeWidth="0.5" fill="none" />
            <polygon points="20,65 25,55 15,55" stroke="currentColor" strokeWidth="0.5" fill="none" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => {
        if (!disabled && onClick && !isPlayable) {
          onClick();
        }
      }}
      style={{ width, height, borderRadius: dimensions.radius }}
      id={`domino-${tile.id}`}
      className={`
        relative select-none flex flex-col justify-between transition-all duration-300 shadow-xl overflow-visible cursor-pointer group
        ${disabled ? 'opacity-40 cursor-not-allowed scale-95' : 'hover:translate-y-[-4px] hover:shadow-zinc-500/10 active:scale-95'}
        ${isPlayable ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-black animate-pulse' : 'border border-zinc-350 bg-gradient-to-br from-zinc-50 to-zinc-200'}
      `}
    >
      {/* Absolute overlay for play-direction selection when playable */}
      {isPlayable && onPlay && (
        <div className="absolute inset-0 z-20 flex items-center justify-center gap-1 bg-black/75 rounded-lg opacity-100 backdrop-blur-xs transition-opacity duration-200">
          {playableEnds.left && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPlay('left');
              }}
              style={{ fontSize: size === 'sm' ? '10px' : '12px' }}
              className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-black font-bold uppercase rounded-sm transition-all shadow-md active:scale-95 text-[10px]"
            >
              Left
            </button>
          )}
          {playableEnds.right && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPlay('right');
              }}
              style={{ fontSize: size === 'sm' ? '10px' : '12px' }}
              className="px-2 py-1 bg-emerald-500 hover:bg-emerald-400 text-black font-bold uppercase rounded-sm transition-all shadow-md active:scale-95 text-[10px]"
            >
              Right
            </button>
          )}
        </div>
      )}

      {/* SVG Container for Drawing Domino Ends */}
      <svg
        width="100%"
        height="100%"
        viewBox={horizontal ? '0 0 200 100' : '0 0 100 200'}
        className="pointer-events-none select-none"
      >
        <defs>
          <radialGradient id="blackGrad" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#4b5563" />
            <stop offset="30%" stopColor="#1f2937" />
            <stop offset="100%" stopColor="#030712" />
          </radialGradient>
          <filter id="softGlow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {horizontal ? (
          <>
            {/* Left Compartment */}
            <g transform="translate(0, 0)">
              {drawDots(tile.left)}
            </g>

            {/* Central Pin & Separator line */}
            <line
              x1="100"
              y1="4"
              x2="100"
              y2="96"
              stroke="#52525b"
              strokeWidth="2.5"
              strokeDasharray="1 1"
            />
            <circle
              cx="100"
              cy="50"
              r="3.5"
              fill="#d97706"
              stroke="#27272a"
              strokeWidth="1.5"
              id="brass-pin"
            />

            {/* Right Compartment */}
            <g transform="translate(100, 0)">
              {drawDots(tile.right)}
            </g>
          </>
        ) : (
          <>
            {/* Top Compartment */}
            <g transform="translate(0, 0)">
              {drawDots(tile.left)}
            </g>

            {/* Central Pin & Separator line */}
            <line
              x1="4"
              y1="100"
              x2="96"
              y2="100"
              stroke="#52525b"
              strokeWidth="2.5"
              strokeDasharray="1 1"
            />
            <circle
              cx="50"
              cy="100"
              r="3.5"
              fill="#d97706"
              stroke="#27272a"
              strokeWidth="1.5"
              id="brass-pin-vert"
            />

            {/* Bottom Compartment */}
            <g transform="translate(0, 100)">
              {drawDots(tile.right)}
            </g>
          </>
        )}
      </svg>

      {/* Little preview label for accessibility / easy reading */}
      <span className="sr-only">
        Domino Tile {tile.left} and {tile.right}
      </span>
    </div>
  );
};

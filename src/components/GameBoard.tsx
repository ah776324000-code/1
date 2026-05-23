import React, { useRef, useEffect } from 'react';
import { PlacedTile } from '../types';
import { DominoTile } from './DominoTile';
import { Compass, Sparkles, MoveLeft, MoveRight } from 'lucide-react';

interface GameBoardProps {
  placedTiles: PlacedTile[];
  leftEnd: number;
  rightEnd: number;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  placedTiles,
  leftEnd,
  rightEnd,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto scroll to the right of the board when a tile is added
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollLeft = (containerRef.current.scrollWidth - containerRef.current.clientWidth) / 2;
    }
  }, [placedTiles.length]);

  return (
    <div className="relative w-full bg-zinc-950/95 rounded-2xl border border-zinc-800 p-6 shadow-2xl overflow-hidden min-h-[300px] flex flex-col justify-between">
      {/* Background visual detail: Luxurious graphite black playing field with subtle dots */}
      <div className="absolute inset-0 bg-[#09090b]" />
      <div className="absolute inset-0 bg-[radial-gradient(#fafafa_1.0px,transparent_1.0px)] bg-[size:24px_24px] opacity-[0.05] pointer-events-none" />

      {/* Board header */}
      <div className="relative z-10 flex items-center justify-between border-b border-zinc-800 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <Compass className="w-4.5 h-4.5 text-amber-500 animate-spin-slow" />
          <h3 className="text-xs font-bold tracking-wider text-zinc-300 uppercase">
            لوحة المباراة الموسعة
          </h3>
        </div>
        <div className="flex gap-4 text-[11px] font-mono text-zinc-400">
          <span>الأوراق على الطاولة: <strong className="text-zinc-105 font-extrabold">{placedTiles.length}</strong></span>
          {placedTiles.length > 0 && (
            <span className="flex items-center gap-1 text-zinc-300">
              الأطراف: <span className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-amber-500 font-extrabold">{leftEnd}</span> 
              ... 
              <span className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-emerald-500 font-bold">{rightEnd}</span>
            </span>
          )}
        </div>
      </div>

      {/* Domino Train Container */}
      <div
        ref={containerRef}
        className="relative z-10 flex items-center justify-start md:justify-center overflow-x-auto gap-3 py-6 px-10 md:max-w-full scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent select-none min-h-[190px]"
        style={{ scrollBehavior: 'smooth' }}
      >
        {placedTiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-zinc-400 gap-3 w-full animate-pulse">
            <Sparkles className="w-10 h-10 text-amber-500/80" />
            <p className="text-sm font-bold uppercase tracking-wide text-zinc-200">
              الطاولة مفتوحة — العب أي ورقة للبدء
            </p>
            <p className="text-xs text-zinc-400 italic">
              تبدأ الجولة الأولى بالستة المزدوجة [6|6]
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-4 min-w-max mx-auto px-2">
            {/* Left End Indicator */}
            <div className="flex flex-col items-center justify-center mx-3 scale-100">
              <span className="text-[10px] font-mono text-amber-500 font-bold tracking-widest uppercase flex items-center gap-1">
                <MoveLeft className="w-3.5 h-3.5" /> اليسار
              </span>
              <div className="mt-1.5 h-10 w-10 rounded-full bg-zinc-900 border-2 border-amber-500 flex items-center justify-center font-bold text-base text-amber-500 shadow-md">
                {leftEnd}
              </div>
            </div>

            {/* Render Chain of Placed Dominoes */}
            {placedTiles.map(({ tile, leftVal, rightVal }, idx) => {
              const isDouble = tile.left === tile.right;
              // On the board, if it's double, we render it VERTICALLY (horizontal = false)
              // If it's single, we render it HORIDONTALLY (horizontal = true) to link them elegantly
              const isHorizontalPlay = !isDouble;

              // Setup a tile representing the proper board end values
              // If the placed values are flipped to match the chain, we pass a composite tile
              const displayTile = {
                id: tile.id,
                left: leftVal,
                right: rightVal,
              };

              return (
                <div
                  key={`${tile.id}-${idx}`}
                  className="flex items-center justify-center transition-all duration-500 scale-100 hover:scale-105"
                >
                  <DominoTile
                    tile={displayTile}
                    horizontal={isHorizontalPlay}
                    size="md"
                    disabled={false}
                  />
                </div>
              );
            })}

            {/* Right End Indicator */}
            <div className="flex flex-col items-center justify-center mx-3 scale-100">
              <span className="text-[10px] font-mono text-emerald-500 font-bold tracking-widest uppercase flex items-center gap-1">
                اليمين <MoveRight className="w-3.5 h-3.5" />
              </span>
              <div className="mt-1.5 h-10 w-10 rounded-full bg-zinc-900 border-2 border-emerald-500 flex items-center justify-center font-bold text-base text-emerald-500 shadow-md">
                {rightEnd}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Decorative board border rails */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-16 bg-zinc-800 rounded-r-lg" />
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-16 bg-zinc-800 rounded-l-lg" />
    </div>
  );
};

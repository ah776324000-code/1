import React, { useState } from 'react';
import { ScoreHand, GameMode } from '../types';
import { Trophy, Plus, RefreshCw, Trash2, ShieldAlert } from 'lucide-react';

interface ScoreBoardProps {
  mode: GameMode;
  team1Score: number;
  team2Score: number;
  scoresHistory: ScoreHand[];
  targetScore: number;
  onAddScore: (team1Points: number, team2Points: number, notes?: string) => void;
  onDeleteScore: (id: string) => void;
  onResetScores: () => void;
  onSetTargetScore: (target: number) => void;
  team1Name?: string;
  team2Name?: string;
}

export const ScoreBoard: React.FC<ScoreBoardProps> = ({
  mode,
  team1Score,
  team2Score,
  scoresHistory,
  targetScore,
  onAddScore,
  onDeleteScore,
  onResetScores,
  onSetTargetScore,
  team1Name = "Team 1",
  team2Name = "Team 2",
}) => {
  const [team1Input, setTeam1Input] = useState('');
  const [team2Input, setTeam2Input] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [showManualForm, setShowManualForm] = useState(false);

  const handleSubmitScore = (e: React.FormEvent) => {
    e.preventDefault();
    const t1Points = parseInt(team1Input) || 0;
    const t2Points = parseInt(team2Input) || 0;

    if (t1Points > 0 || t2Points > 0) {
      onAddScore(t1Points, t2Points, notesInput || 'Manual score');
      setTeam1Input('');
      setTeam2Input('');
      setNotesInput('');
      setShowManualForm(false);
    }
  };

  const getPercentage = (score: number) => {
    return Math.min(100, (score / targetScore) * 100);
  };

  return (
    <div className="w-full bg-[#0d1712] border-[10px] border-[#5e3d23] rounded-3xl p-6 shadow-[inset_0_4px_12px_rgba(0,0,0,0.9),0_15px_35px_rgba(0,0,0,0.75)] flex flex-col gap-6 relative overflow-hidden">
      {/* Blackboard grain background helper */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(25,48,35,0.5)_0%,rgba(9,15,12,0.9)_100%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none opacity-40" />

      {/* Target points banner */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-zinc-850/80 pb-4">
        <div>
          <h2 className="text-zinc-50 font-space font-bold text-xl tracking-wide flex items-center gap-1.5 drop-shadow-[0_1px_2px_rgba(255,255,255,0.1)]">
            📋 لوحة تسجيل نقاط اللعبة
          </h2>
          <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
            {mode === 4 ? "4 لاعبين (شراكة متقابلة)" : "لاعبان (مباراة 1 ضد 1)"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-[11px] font-mono text-zinc-300 uppercase tracking-wide">
            الهدف المحدد:
          </label>
          <select
            value={targetScore}
            onChange={(e) => onSetTargetScore(Number(e.target.value))}
            className="bg-[#14231b] border border-zinc-800 text-zinc-100 text-xs font-mono rounded px-2.5 py-1.5 focus:outline-none focus:border-amber-500"
          >
            <option value={50}>50 نقطة</option>
            <option value={100}>100 نقطة (قياسي)</option>
            <option value={150}>150 نقطة</option>
            <option value={200}>200 نقطة (محترف)</option>
            <option value={300}>300 نقطة (كلاسيكي)</option>
          </select>
          <button
            onClick={onResetScores}
            title="إعادة تعيين النقاط"
            className="p-1.5 bg-[#14231b] border border-zinc-800 hover:border-red-500/50 hover:bg-red-950/20 text-zinc-400 hover:text-red-400 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* TWO COLUMNS FOR CALCULATING TEAM SCORES */}
      <div className="relative z-10 grid grid-cols-2 gap-4 md:gap-8">
        {/* Blackboard vertical divide lines represented in dashed chalk style */}
        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[2px] border-l-2 border-dashed border-zinc-700/60" />

        {/* TEAM 1 COLUMN */}
        <div className="flex flex-col items-center justify-center p-5 bg-[#111e16] border border-zinc-800/40 rounded-2xl relative overflow-hidden shadow-inner">
          {team1Score >= targetScore && (
            <div className="absolute top-2 right-2 text-yellow-500 animate-bounce">
              <Trophy className="w-5 h-5" />
            </div>
          )}
          <span className="text-xs font-space text-amber-300 font-bold uppercase tracking-widest drop-shadow-[0_1px_4px_rgba(252,211,77,0.3)]">
            {team1Name}
          </span>
          <div className="my-1.5 flex flex-col items-center">
            {/* LARGE CHALK SCORE */}
            <span className="text-4xl md:text-5xl lg:text-6xl font-caveat font-bold text-[#faf8f5] leading-none select-none drop-shadow-[0_0_8px_rgba(255,255,255,0.7)] animate-fadeIn">
              {team1Score}
            </span>
            <span className="text-zinc-400 font-mono text-[10px] tracking-widest mt-1 uppercase">
              الهدف: {targetScore}
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden mt-3 border border-zinc-850">
            <div
              className="bg-amber-400 h-full rounded-full transition-all duration-1000"
              style={{ width: `${getPercentage(team1Score)}%` }}
            />
          </div>
        </div>

        {/* TEAM 2 COLUMN */}
        <div className="flex flex-col items-center justify-center p-5 bg-[#111e16] border border-zinc-800/40 rounded-2xl relative overflow-hidden shadow-inner">
          {team2Score >= targetScore && (
            <div className="absolute top-2 right-2 text-yellow-500 animate-bounce">
              <Trophy className="w-5 h-5" />
            </div>
          )}
          <span className="text-xs font-space text-emerald-300 font-bold uppercase tracking-widest drop-shadow-[0_1px_4px_rgba(110,231,183,0.3)]">
            {team2Name}
          </span>
          <div className="my-1.5 flex flex-col items-center">
            {/* LARGE CHALK SCORE */}
            <span className="text-4xl md:text-5xl lg:text-6xl font-caveat font-bold text-emerald-100 leading-none select-none drop-shadow-[0_0_8px_rgba(110,231,183,0.7)] animate-fadeIn">
              {team2Score}
            </span>
            <span className="text-zinc-400 font-mono text-[10px] tracking-widest mt-1 uppercase">
              الهدف: {targetScore}
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden mt-3 border border-zinc-850">
            <div
              className="bg-emerald-400 h-full rounded-full transition-all duration-1000"
              style={{ width: `${getPercentage(team2Score)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Interactive Manual Logging & Score Records */}
      <div className="relative z-10 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowManualForm(!showManualForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-semibold text-zinc-300 hover:text-amber-500 hover:border-amber-500/50 transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            {showManualForm ? "إخفاء محرر النقاط" : "تسجيل نقاط الجولة يدوياً"}
          </button>
          <span className="text-[10px] font-mono text-zinc-500">
            الجولات المسجلة: <strong className="text-zinc-300">{scoresHistory.length}</strong>
          </span>
        </div>

        {showManualForm && (
          <form
            onSubmit={handleSubmitScore}
            className="bg-zinc-900/90 border border-zinc-850 p-4 rounded-xl flex flex-col gap-3.5 animate-fadeIn z-10"
          >
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-1">
                  نقاط {team1Name}
                </label>
                <input
                  type="number"
                  min="0"
                  max="168"
                  value={team1Input}
                  onChange={(e) => setTeam1Input(e.target.value)}
                  placeholder="0"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 font-mono text-sm text-zinc-200 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-1">
                  نقاط {team2Name}
                </label>
                <input
                  type="number"
                  min="0"
                  max="168"
                  value={team2Input}
                  onChange={(e) => setTeam2Input(e.target.value)}
                  placeholder="0"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 font-mono text-sm text-zinc-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-1">
                ملاحظات الجولة (اختياري)
              </label>
              <input
                type="text"
                maxLength={60}
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                placeholder="مثال: الفوز بالكابيكو، جولة مغلقة..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="flex justify-end gap-2 mt-1">
              <button
                type="button"
                onClick={() => setShowManualForm(false)}
                className="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 font-bold text-black text-xs uppercase tracking-wide rounded shadow-md active:scale-95"
              >
                إضافة النقاط
              </button>
            </div>
          </form>
        )}

        {/* Hand score log history list */}
        {scoresHistory.length > 0 ? (
          <div className="bg-zinc-925 border border-zinc-850/80 rounded-xl overflow-hidden max-h-[150px] overflow-y-auto">
            <table className="w-full font-mono text-left border-collapse" dir="rtl">
              <thead>
                <tr className="bg-zinc-900 border-b border-zinc-850 text-[9px] uppercase tracking-wider text-zinc-500">
                  <th className="px-3.5 py-2 text-right">الجولة</th>
                  <th className="px-3.5 py-2 text-right">{team1Name}</th>
                  <th className="px-3.5 py-2 text-right">{team2Name}</th>
                  <th className="px-3.5 py-2 text-right">ملاحظات</th>
                  <th className="px-3.5 py-2 text-left">إجراء</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-zinc-900">
                {scoresHistory.map((hand) => (
                  <tr
                    key={hand.id}
                    className="hover:bg-zinc-900/50 text-zinc-300 transition-colors"
                  >
                    <td className="px-3.5 py-2 font-semibold">ج-{hand.roundNumber}</td>
                    <td className="px-3.5 py-2 text-amber-500 font-bold font-mono">
                      {hand.team1Score > 0 ? `+${hand.team1Score}` : '0'}
                    </td>
                    <td className="px-3.5 py-2 text-emerald-500 font-bold font-mono">
                      {hand.team2Score > 0 ? `+${hand.team2Score}` : '0'}
                    </td>
                    <td className="px-3.5 py-2 text-[10px] text-zinc-550 max-w-[120px] truncate">
                      {hand.notes}
                    </td>
                    <td className="px-3.5 py-2 text-left">
                      <button
                        onClick={() => onDeleteScore(hand.id)}
                        title="حذف المدخلة"
                        className="p-1 hover:text-red-400 text-zinc-500 transition-colors inline-flex justify-center"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-4 bg-zinc-900/10 border border-dashed border-zinc-850 rounded-xl text-zinc-650 text-[10px] uppercase font-mono tracking-wider">
            لم تُجر أي جولة بعد. ستظهر نقاط المباريات تلقائياً عند انتهاء الأيدي.
          </div>
        )}
      </div>
    </div>
  );
};

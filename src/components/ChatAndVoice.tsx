import React, { useState, useEffect, useRef } from 'react';
import { Player, GameMessage, GameMode, PlayerId } from '../types';
import {
  Mic,
  MicOff,
  PhoneCall,
  PhoneOff,
  Send,
  MessageSquare,
  Volume2,
  Users,
  Check,
  Zap
} from 'lucide-react';

interface ChatAndVoiceProps {
  mode: GameMode;
  players: Record<string, Player>;
  messages: GameMessage[];
  currentPlayerId: PlayerId;
  onSendMessage: (text: string, isQuickMsg?: boolean) => void;
  onTalkingActive?: (playerId: PlayerId, value: number) => void;
}

export const ChatAndVoice: React.FC<ChatAndVoiceProps> = ({
  mode,
  players,
  messages,
  currentPlayerId,
  onSendMessage,
  onTalkingActive,
}) => {
  // Voice chat states
  const [inVoiceChannel, setInVoiceChannel] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [userMicStream, setUserMicStream] = useState<MediaStream | null>(null);
  const [liveVolume, setLiveVolume] = useState(0);

  // Chat states
  const [textVal, setTextVal] = useState('');
  const [activeTab, setActiveTab] = useState<'voice' | 'text'>('voice');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const micCheckIntervalRef = useRef<number | null>(null);

  // Quick chats templates
  const quickMessages = [
    "كابيكو! 👍",
    "تمرير! 😭",
    "الستة المزدوجة قادمة! 🀰",
    "مباراة سعيدة جميعاً!",
    "اللعبة مغلقة، احسبوا النقاط!",
    "لعبة ممتازة يا شريكي! 🤝",
    "بنك الأوراق كان كريماً معي! 🎉",
    "لا يوجد أوراق في يدي!"
  ];

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeTab]);

  // Handle actual Microphone Access for group voice simulation
  useEffect(() => {
    if (inVoiceChannel && !isMuted) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          setUserMicStream(stream);

          // Build Real Audio Analyser
          try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            const ctx = new AudioContextClass();
            audioCtxRef.current = ctx;

            const analyser = ctx.createAnalyser();
            analyser.fftSize = 64;
            analyserRef.current = analyser;

            const source = ctx.createMediaStreamSource(stream);
            sourceRef.current = source;
            source.connect(analyser);

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const analyzeMic = () => {
              if (analyserRef.current) {
                analyser.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) {
                  sum += dataArray[i];
                }
                const avg = sum / bufferLength;
                // Normalize to a solid level
                const finalLevel = Math.min(100, Math.round((avg / 80) * 100));
                setLiveVolume(finalLevel);

                // Notify parent state if needed
                if (onTalkingActive) {
                  onTalkingActive('p1', finalLevel);
                }
                micCheckIntervalRef.current = requestAnimationFrame(analyzeMic);
              }
            };
            analyzeMic();
          } catch (err) {
            console.warn("Unable to initialize real Web Audio analyser: ", err);
          }
        })
        .catch((err) => {
          console.warn("Microphone access declined or unavailable. Falling back to simple simulator indicators.", err);
        });
    } else {
      cleanupMicrophone();
    }

    return () => {
      cleanupMicrophone();
    };
  }, [inVoiceChannel, isMuted]);

  const cleanupMicrophone = () => {
    if (micCheckIntervalRef.current) {
      cancelAnimationFrame(micCheckIntervalRef.current);
      micCheckIntervalRef.current = null;
    }
    if (userMicStream) {
      userMicStream.getTracks().forEach((track) => track.stop());
      setUserMicStream(null);
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    setLiveVolume(0);
    if (onTalkingActive) {
      onTalkingActive('p1', 0);
    }
  };

  const handleSendText = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (textVal.trim()) {
      onSendMessage(textVal.trim());
      setTextVal('');
    }
  };

  // Helper to determine active players
  const activePlayersList = (Object.values(players) as Player[]).filter((p) => {
    if (mode === 2) {
      return p.id === 'p1' || p.id === 'p2';
    }
    return true; // 4 players
  });

  return (
    <div className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col h-[520px] shadow-2xl" dir="rtl">
      {/* Tab Switcher */}
      <div className="flex border-b border-zinc-800 bg-zinc-925">
        <button
          onClick={() => setActiveTab('voice')}
          className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider transition-all border-b-2
            ${activeTab === 'voice'
              ? 'border-amber-500 text-amber-500 bg-zinc-900/40'
              : 'border-transparent text-zinc-550 hover:text-zinc-300'
            }`}
        >
          <Volume2 className="w-4 h-4" />
          غرفة الصوت
          {inVoiceChannel && (
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('text')}
          className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider transition-all border-b-2
            ${activeTab === 'text'
              ? 'border-amber-500 text-amber-500 bg-zinc-900/40'
              : 'border-transparent text-zinc-550 hover:text-zinc-300'
            }`}
        >
          <MessageSquare className="w-4 h-4" />
          سجل المحادثة
          {messages.length > 0 && (
            <span className="px-1.5 py-0.5 bg-zinc-800 rounded-full text-[9px] font-mono text-zinc-300">
              {messages.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'voice' ? (
        /* ================== GROUP VOICE CHAT PANEL ================== */
        <div className="flex-1 p-5 flex flex-col justify-between bg-zinc-950">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
              <span className="text-[10px] uppercase font-mono text-zinc-500 tracking-wider flex items-center gap-1">
                <Users className="w-3.5 h-3.5" /> قناة الصوت الجماعية - نشطة
              </span>
              <span className="text-xs text-zinc-400 font-mono">
                متصل: {activePlayersList.length}
              </span>
            </div>

            {/* List of active players in the Voice lobby */}
            <div className="flex flex-col gap-3">
              {activePlayersList.map((player) => {
                const isUser = player.id === 'p1';
                // Active indicators
                const isSpeakingAndIn = inVoiceChannel && (isUser ? (!isMuted && liveVolume > 15) : player.isSpeaking);
                const currentLevel = isUser ? (isMuted ? 0 : liveVolume) : (player.isSpeaking ? player.voiceLevel : 0);

                return (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-300
                      ${isSpeakingAndIn
                        ? 'bg-zinc-900 border-amber-500/35 shadow-sm shadow-amber-500/5'
                        : 'bg-zinc-900/35 border-zinc-900'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar with Voice indicators */}
                      <div className="relative">
                        <div
                          style={{ fontSize: '18px' }}
                          className={`w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center select-none border-2
                            ${isSpeakingAndIn ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-zinc-700'}`}
                        >
                          {player.avatar}
                        </div>
                        {isSpeakingAndIn && (
                          <div className="absolute -bottom-1 -right-1 p-0.5 bg-amber-500 rounded-full text-black">
                            <Volume2 className="w-3 h-3" />
                          </div>
                        )}
                        {isUser && isMuted && (
                          <div className="absolute -bottom-1 -right-1 p-0.5 bg-red-600 rounded-full text-zinc-100">
                            <MicOff className="w-3 h-3" />
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-zinc-200 font-bold text-xs">
                            {player.name}
                          </span>
                          {isUser ? (
                            <span className="text-[9px] font-mono bg-zinc-800 text-zinc-400 uppercase px-1 py-0.2 rounded">
                              أنت
                            </span>
                          ) : (
                            <span className="text-[9px] font-mono bg-zinc-800/65 text-zinc-550 uppercase px-1 py-0.2 rounded">
                              روبوت
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                          {isSpeakingAndIn ? '🎙️ يتحدث...' : 'خامل'}
                        </p>
                      </div>
                    </div>

                    {/* Speech equalizer waves */}
                    <div className="flex items-center gap-0.5 h-6">
                      {isSpeakingAndIn ? (
                        Array.from({ length: 5 }).map((_, waveIdx) => (
                          <div
                            key={waveIdx}
                            style={{
                              height: `${Math.max(25, Math.min(100, (currentLevel * (0.4 + Math.random() * 0.6))))}%`,
                              animationDelay: `${waveIdx * 0.08}s`,
                            }}
                            className="w-1 bg-amber-500 rounded-full animate-voiceWave min-h-[4px]"
                          />
                        ))
                      ) : (
                        Array.from({ length: 5 }).map((_, waveIdx) => (
                          <div
                            key={waveIdx}
                            className="w-1 h-1 bg-zinc-800 rounded-full"
                          />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Voice room action controls */}
          <div className="mt-4 pt-4 border-t border-zinc-900 bg-zinc-950 flex flex-col gap-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/60 border border-zinc-850">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-zinc-350">
                  {inVoiceChannel ? "متصل بالغرفة" : "غير متصل"}
                </span>
                <span className="text-[10px] text-zinc-505 font-mono">
                  {inVoiceChannel
                    ? isMuted
                      ? "صوت الميكروفون مكتوم"
                      : "التقاط الصوت الحي نشط"
                    : "انضم للتحدث مع زملائك في الفريق"}
                </span>
              </div>

              {inVoiceChannel && (
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className={`p-2 rounded-lg transition-all active:scale-90 shadow-md flex items-center justify-center
                    ${isMuted
                      ? 'bg-red-950/40 border border-red-500/45 text-red-400 hover:bg-red-950/60'
                      : 'bg-zinc-800 border border-zinc-700 text-zinc-200 hover:bg-zinc-700'
                    }`}
                >
                  {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              )}
            </div>

            <div className="flex gap-2">
              {inVoiceChannel ? (
                <button
                  onClick={() => setInVoiceChannel(false)}
                  className="w-full py-2.5 px-4 bg-red-650 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wide rounded-lg shadow-md hover:shadow-red-900/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <PhoneOff className="w-4 h-4" />
                  مغادرة المحادثة الصوتية
                </button>
              ) : (
                <button
                  onClick={() => setInVoiceChannel(true)}
                  className="w-full py-2.5 px-4 bg-amber-550 hover:bg-amber-500 text-black font-bold text-xs uppercase tracking-wide rounded-lg shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <PhoneCall className="w-4 h-4" />
                  الاتصال بالصوت
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ================== MESSAGE CHAT LOG PANEL ================== */
        <div className="flex-1 flex flex-col justify-between bg-zinc-950 overflow-hidden">
          {/* Scrollable messages area */}
          <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-2.5 scrollbar-thin scrollbar-thumb-zinc-805">
            {messages.map((message) => {
              const isSys = message.senderId === 'system';
              const isMe = message.senderId === 'p1';
              const playerObj = players[message.senderId];

              if (isSys) {
                return (
                  <div
                    key={message.id}
                    className="self-center bg-zinc-900 border border-zinc-850 px-3 py-1.5 rounded-full text-[9.5px] font-mono text-zinc-400 tracking-wide text-center"
                  >
                    🚀 {message.text}
                  </div>
                );
              }

              return (
                <div
                  key={message.id}
                  className={`flex flex-col max-w-[80%] rounded-xl px-3.5 py-2 relative
                    ${isMe
                      ? 'self-end bg-amber-550 text-black rounded-tr-none'
                      : 'self-start bg-zinc-900 text-zinc-200 rounded-tl-none border border-zinc-850'
                    }`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span
                      className={`text-[10px] font-extrabold capitalize
                        ${isMe ? 'text-black' : 'text-amber-500'}`}
                    >
                      {playerObj?.avatar} {message.senderName}
                    </span>
                    <span
                      className={`text-[8.5px] font-mono
                        ${isMe ? 'text-zinc-800' : 'text-zinc-550'}`}
                    >
                      {new Date(message.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-xs break-words leading-relaxed">{message.text}</p>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick presets area */}
          <div className="px-4 py-2 bg-zinc-925 border-t border-zinc-900">
            <span className="text-[8px] font-mono font-bold tracking-widest text-zinc-500 uppercase flex items-center gap-1 mb-1.5">
              <Zap className="w-3 h-3 text-amber-500" /> رسائل سريعة
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-[64px] overflow-y-auto w-full">
              {quickMessages.map((msg, idx) => (
                <button
                  key={idx}
                  onClick={() => onSendMessage(msg, true)}
                  className="text-[10px] py-1 px-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded hover:text-amber-400 font-medium transition-all active:scale-95"
                >
                  {msg}
                </button>
              ))}
            </div>
          </div>

          {/* Text transmission inputs */}
          <form
            onSubmit={handleSendText}
            className="p-3 border-t border-zinc-900 bg-zinc-950 flex gap-2"
          >
            <input
              type="text"
              value={textVal}
              onChange={(e) => setTextVal(e.target.value)}
              placeholder="اكتب رسالة..."
              className="flex-1 bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-500 placeholder-zinc-550"
            />
            <button
              type="submit"
              className="p-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-all shadow-md active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

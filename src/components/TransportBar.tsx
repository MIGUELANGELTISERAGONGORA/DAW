import React, { useEffect } from 'react';
import { Play, Pause, Square, Volume2, VolumeX, RotateCcw } from 'lucide-react';

interface TransportBarProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onSeek: (time: number) => void;
  masterVolume: number;
  onMasterVolumeChange: (vol: number) => void;
}

export const TransportBar: React.FC<TransportBarProps> = ({
  isPlaying,
  currentTime,
  duration,
  onPlay,
  onPause,
  onStop,
  onSeek,
  masterVolume,
  onMasterVolumeChange,
}) => {
  // Global spacebar shortcut handler (safeguarded against input text fields)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        const activeElem = document.activeElement;
        const isInput = activeElem && (
          activeElem.tagName === 'INPUT' ||
          activeElem.tagName === 'TEXTAREA' ||
          (activeElem as HTMLElement).isContentEditable
        );

        if (!isInput) {
          e.preventDefault();
          if (isPlaying) {
            onPause();
          } else {
            onPlay();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, onPlay, onPause]);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00.0';
    const mins = Math.floor(secs / 60);
    const remSecs = (secs % 60).toFixed(1);
    const padMins = mins < 10 ? `0${mins}` : `${mins}`;
    const padSecs = parseFloat(remSecs) < 10 ? `0${remSecs}` : `${remSecs}`;
    return `${padMins}:${padSecs}`;
  };

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleScrubChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPct = parseFloat(e.target.value);
    const seekTime = (newPct / 100) * duration;
    onSeek(seekTime);
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-sm space-y-2">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Main Controls: Play, Pause, Stop */}
        <div className="flex items-center space-x-3">
          <button
            onClick={isPlaying ? onPause : onPlay}
            disabled={duration === 0}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all shadow-md cursor-pointer ${
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-600 text-white font-bold'
                : 'bg-sky-600 hover:bg-sky-700 text-white font-bold shadow-sky-600/20'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
            title={isPlaying ? 'Pausa (Espacio)' : 'Reproducir (Espacio)'}
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>

          <button
            onClick={onStop}
            disabled={duration === 0}
            className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center justify-center transition-colors disabled:opacity-40 cursor-pointer"
            title="Detener y Volver al Inicio"
          >
            <Square className="w-4 h-4 fill-current text-slate-700" />
          </button>

          <div className="h-6 w-px bg-slate-200" />

          {/* Digital Time Counter */}
          <div className="font-mono bg-slate-50 border border-slate-200 px-3 py-1 rounded text-xs tracking-wider">
            <span className="text-sky-800 font-bold">{formatTime(currentTime)}</span>
            <span className="text-slate-400 mx-1.5">/</span>
            <span className="text-slate-500 font-medium">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Master Timeline Scrubbing Bar */}
        <div className="flex-1 w-full space-y-1">
          <div className="relative flex items-center">
            <input
              type="range"
              min="0"
              max="100"
              step="0.1"
              value={progressPct || 0}
              onChange={handleScrubChange}
              disabled={duration === 0}
              className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-sky-600 disabled:cursor-not-allowed border border-slate-200"
            />
          </div>
          <div className="flex justify-between text-[10px] text-sky-400/50 font-mono">
            <span>00:00</span>
            <span>Atajo: [Espacio] Play/Pausa</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Master Volume Slider */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => onMasterVolumeChange(masterVolume === 0 ? 1 : 0)}
            className="text-sky-300 hover:text-white transition-colors"
          >
            {masterVolume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-sky-300" />}
          </button>
          <input
            type="range"
            min="0"
            max="1.5"
            step="0.05"
            value={masterVolume}
            onChange={(e) => onMasterVolumeChange(parseFloat(e.target.value))}
            className="w-20 h-1.5 bg-[#050a16] rounded appearance-none cursor-pointer accent-sky-400"
          />
          <span className="font-mono text-[11px] text-sky-300 w-8">
            {Math.round(masterVolume * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
};

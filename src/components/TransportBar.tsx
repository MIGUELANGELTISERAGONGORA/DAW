import React, { useEffect } from 'react';
import { Play, Pause, Square, Volume2, VolumeX, Mic, Sliders, Music, Zap, Activity } from 'lucide-react';

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
  pitchShift?: number;
  onPitchShiftChange?: (semitones: number) => void;
  speed?: number;
  onSpeedChange?: (speed: number) => void;
  keySignature?: string;
  bpm?: number;
  isRecordingMic?: boolean;
  onRecordMic?: () => void;
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
  pitchShift = 0,
  onPitchShiftChange,
  speed = 1.0,
  onSpeedChange,
  keySignature = 'Detectando...',
  bpm = 120,
  isRecordingMic = false,
  onRecordMic,
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
    <div className="bg-[#0b1428] border border-blue-900/60 rounded-xl p-3 shadow-xl space-y-3">
      {/* Upper DAW Control Strip: Playback, Time, Key, BPM & Mic */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
        {/* Main Transport Buttons */}
        <div className="flex items-center space-x-3 w-full lg:w-auto justify-between lg:justify-start">
          <div className="flex items-center space-x-2">
            <button
              onClick={isPlaying ? onPause : onPlay}
              disabled={duration === 0}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all shadow-md cursor-pointer ${
                isPlaying
                  ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 font-black'
                  : 'bg-sky-500 hover:bg-sky-400 text-slate-950 font-black shadow-sky-500/30'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
              title={isPlaying ? 'Pausa (Espacio)' : 'Reproducir (Espacio)'}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>

            <button
              onClick={onStop}
              disabled={duration === 0}
              className="w-9 h-9 rounded-lg bg-blue-950/80 hover:bg-blue-900 text-sky-200 border border-blue-800/60 flex items-center justify-center transition-colors disabled:opacity-40 cursor-pointer"
              title="Detener y Volver al Inicio"
            >
              <Square className="w-4 h-4 fill-current text-sky-300" />
            </button>

            {/* Mic Record Button */}
            {onRecordMic && (
              <button
                onClick={onRecordMic}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                  isRecordingMic
                    ? 'bg-rose-600 text-white border-rose-500 animate-pulse shadow-lg shadow-rose-600/40'
                    : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30'
                }`}
                title="Grabar Voz o Micrófono directo a la sesión"
              >
                <Mic className="w-4 h-4" />
                <span>{isRecordingMic ? 'Grabando (5s)...' : 'Grabar Voz'}</span>
              </button>
            )}
          </div>

          <div className="h-6 w-px bg-blue-900/60 hidden sm:block" />

          {/* Digital Time Counter */}
          <div className="font-mono bg-[#050a16] border border-blue-900/60 px-3 py-1.5 rounded text-xs tracking-wider">
            <span className="text-sky-300 font-bold">{formatTime(currentTime)}</span>
            <span className="text-sky-600 mx-1.5">/</span>
            <span className="text-sky-400/60">{formatTime(duration)}</span>
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
              className="w-full h-2 bg-[#050a16] rounded-lg appearance-none cursor-pointer accent-sky-400 disabled:cursor-not-allowed"
            />
          </div>
          <div className="flex justify-between text-[10px] text-sky-400/60 font-mono">
            <span>00:00</span>
            <span className="hidden sm:inline">Atajo: [Espacio] Play/Pausa</span>
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

      {/* Lower DAW FX & Pitch/Tempo Inspector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-blue-900/40 text-xs text-sky-200">
        {/* Pitch Shift Transposer */}
        <div className="flex items-center space-x-2 bg-[#050a16] border border-blue-900/60 px-3 py-1 rounded-lg">
          <Sliders className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-[11px] font-medium text-sky-300/80">Tono (Transpositor):</span>
          <div className="flex items-center space-x-1 font-mono">
            <button
              onClick={() => onPitchShiftChange && onPitchShiftChange(Math.max(-12, pitchShift - 1))}
              className="px-1.5 py-0.5 bg-blue-950 hover:bg-blue-900 rounded text-sky-300 border border-blue-800/60"
            >
              -
            </button>
            <span className="w-12 text-center font-bold text-sky-200">
              {pitchShift > 0 ? `+${pitchShift}` : pitchShift} sem
            </span>
            <button
              onClick={() => onPitchShiftChange && onPitchShiftChange(Math.min(12, pitchShift + 1))}
              className="px-1.5 py-0.5 bg-blue-950 hover:bg-blue-900 rounded text-sky-300 border border-blue-800/60"
            >
              +
            </button>
          </div>
          {pitchShift !== 0 && (
            <button
              onClick={() => onPitchShiftChange && onPitchShiftChange(0)}
              className="text-[10px] text-rose-400 hover:underline"
            >
              Reset
            </button>
          )}
        </div>

        {/* Speed / Tempo Stretch */}
        <div className="flex items-center space-x-2 bg-[#050a16] border border-blue-900/60 px-3 py-1 rounded-lg">
          <Activity className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-[11px] font-medium text-sky-300/80">Velocidad / Tempo:</span>
          <input
            type="range"
            min="0.5"
            max="1.5"
            step="0.05"
            value={speed}
            onChange={(e) => onSpeedChange && onSpeedChange(parseFloat(e.target.value))}
            className="w-16 h-1 bg-blue-950 rounded appearance-none cursor-pointer accent-sky-400"
          />
          <span className="font-mono font-bold text-sky-200 w-10 text-center">
            {speed.toFixed(2)}x
          </span>
          {speed !== 1.0 && (
            <button
              onClick={() => onSpeedChange && onSpeedChange(1.0)}
              className="text-[10px] text-rose-400 hover:underline"
            >
              1.0x
            </button>
          )}
        </div>

        {/* Detected Key & BPM Inspector */}
        <div className="flex items-center space-x-3 bg-sky-500/10 border border-sky-500/30 px-3 py-1 rounded-lg">
          <div className="flex items-center space-x-1.5 text-sky-300">
            <Music className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-[11px] font-semibold">Tonalidad:</span>
            <span className="font-mono font-bold text-sky-100">{keySignature}</span>
          </div>
          <span className="text-sky-600">•</span>
          <div className="flex items-center space-x-1.5 text-sky-300">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] font-semibold">Tempo:</span>
            <span className="font-mono font-bold text-amber-300">{bpm} BPM</span>
          </div>
        </div>
      </div>
    </div>
  );
};


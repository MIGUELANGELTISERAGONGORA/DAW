import React, { useEffect, useRef } from 'react';
import { AudioTrackState } from '../types';
import { Volume2, Music, Download, FolderOpen, Layers, HardDrive, Sliders, Zap } from 'lucide-react';
import { audioBufferToWav } from '../lib/pitchDetection';

interface MultiTrackMixerProps {
  tracks: AudioTrackState[];
  onToggleMute: (trackId: string) => void;
  onToggleSolo: (trackId: string) => void;
  onVolumeChange: (trackId: string, volume: number) => void;
  onPanChange?: (trackId: string, pan: number) => void;
  onSensitivityChange?: (trackId: string, sensitivity: number) => void;
  onOpenSheetMusic: (track: AudioTrackState) => void;
  onExportMixdown: () => void;
  onOpenOutputFolder: () => void;
  currentTime: number;
  duration: number;
  isExportingMix: boolean;
}

export const MultiTrackMixer: React.FC<MultiTrackMixerProps> = ({
  tracks,
  onToggleMute,
  onToggleSolo,
  onVolumeChange,
  onPanChange,
  onSensitivityChange,
  onOpenSheetMusic,
  onExportMixdown,
  onOpenOutputFolder,
  currentTime,
  duration,
  isExportingMix,
}) => {
  return (
    <div className="bg-[#0b1428] border border-blue-900/60 rounded-xl p-4 shadow-2xl space-y-4 shadow-blue-950/40">
      {/* Header & Export Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-900/40 pb-3">
        <div className="flex items-center space-x-2">
          <Layers className="w-4 h-4 text-sky-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-sky-100 flex items-center gap-1.5">
            <span>Mezclador Multipista Pro</span>
            <span className="bg-blue-600/30 text-sky-300 text-[10px] px-2 py-0.5 rounded-full border border-blue-500/30">
              Alta Sensibilidad ({tracks.length} Stems)
            </span>
          </h2>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onOpenOutputFolder}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-950/80 hover:bg-blue-900/80 text-sky-200 border border-blue-800/60 transition-colors cursor-pointer"
          >
            <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>Carpeta Destino</span>
          </button>

          <button
            onClick={onExportMixdown}
            disabled={tracks.length === 0 || isExportingMix}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-md shadow-sky-500/20 transition-all disabled:opacity-40 cursor-pointer"
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>{isExportingMix ? 'Guardando en Disco...' : 'Guardar Mezcla HQ (.wav)'}</span>
          </button>
        </div>
      </div>

      {/* Track Strips Container */}
      {tracks.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-blue-900/40 rounded-xl bg-[#060b18]">
          <Music className="w-10 h-10 text-blue-500/40 mx-auto mb-2 animate-pulse" />
          <p className="text-xs text-sky-200/70 font-medium">No hay pistas separadas cargadas</p>
          <p className="text-[11px] text-sky-400/50 mt-1">Carga una canción y presiona "Iniciar Separación de Stems"</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tracks.map((track) => (
            <TrackStrip
              key={track.id}
              track={track}
              onToggleMute={onToggleMute}
              onToggleSolo={onToggleSolo}
              onVolumeChange={onVolumeChange}
              onPanChange={onPanChange}
              onSensitivityChange={onSensitivityChange}
              onOpenSheetMusic={onOpenSheetMusic}
              currentTime={currentTime}
              duration={duration}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface TrackStripProps {
  track: AudioTrackState;
  onToggleMute: (id: string) => void;
  onToggleSolo: (id: string) => void;
  onVolumeChange: (id: string, vol: number) => void;
  onPanChange?: (id: string, pan: number) => void;
  onSensitivityChange?: (id: string, sens: number) => void;
  onOpenSheetMusic: (track: AudioTrackState) => void;
  currentTime: number;
  duration: number;
}

const TrackStrip: React.FC<TrackStripProps> = ({
  track,
  onToggleMute,
  onToggleSolo,
  onVolumeChange,
  onPanChange,
  onSensitivityChange,
  onOpenSheetMusic,
  currentTime,
  duration,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Download individual stem WAV to local drive
  const handleDownloadStemToHardDrive = () => {
    if (!track.buffer) return;
    const wavBlob = audioBufferToWav(track.buffer);
    const url = URL.createObjectURL(wavBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${track.name.replace(/\s+/g, '_')}_Stem.wav`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Render static waveform onto canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !track.buffer) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const data = track.buffer.getChannelData(0);
    const step = Math.ceil(data.length / width);
    const amp = height / 2;

    ctx.fillStyle = track.color || '#38BDF8';

    for (let i = 0; i < width; i++) {
      let min = 1.0;
      let max = -1.0;
      for (let j = 0; j < step; j++) {
        const datum = data[i * step + j];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }

      const y1 = (1 + min) * amp;
      const y2 = (1 + max) * amp;
      ctx.fillRect(i, y1, 1, Math.max(1, y2 - y1));
    }
  }, [track.buffer, track.color]);

  const volumePct = Math.round(track.volume * 100);
  const playheadPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const panValue = track.pan !== undefined ? track.pan : 0;
  const panLabel = panValue === 0 ? 'C' : panValue < 0 ? `L${Math.abs(Math.round(panValue * 100))}` : `R${Math.round(panValue * 100)}`;
  const sensitivity = track.sensitivity || 1.0;

  return (
    <div
      className={`bg-[#060e22] border rounded-xl p-3 flex flex-col md:flex-row items-center gap-3 transition-all ${
        track.isMuted
          ? 'border-blue-900/30 opacity-60'
          : track.isSolo
          ? 'border-amber-500/70 bg-amber-500/10'
          : 'border-blue-900/60 hover:border-blue-700/60'
      }`}
    >
      {/* Track Info & Category */}
      <div className="flex items-center space-x-3 w-full md:w-56 shrink-0">
        <div
          className="w-3.5 h-10 rounded-full shrink-0 shadow-sm shadow-blue-500/30"
          style={{ backgroundColor: track.color }}
        />

        <div className="flex-1 min-w-0">
          <h3 className="text-xs font-bold text-sky-100 truncate">{track.name}</h3>
          <span className="text-[10px] text-sky-400/60 uppercase font-mono tracking-wider">
            {track.category}
          </span>
        </div>

        {/* Action Buttons: Download Stem & Partitura */}
        <div className="flex items-center space-x-1 shrink-0">
          <button
            onClick={handleDownloadStemToHardDrive}
            className="p-1.5 rounded bg-blue-950/80 hover:bg-sky-500 text-sky-200 hover:text-slate-950 border border-blue-800/60 transition-colors cursor-pointer"
            title="Descargar este Stem en tu Disco Duro (.wav)"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onOpenSheetMusic(track)}
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[11px] font-bold transition-colors cursor-pointer"
            title="Convertir esta pista en Partitura"
          >
            <Music className="w-3 h-3 text-sky-400" />
            <span>Partitura</span>
          </button>
        </div>
      </div>

      {/* Mute, Solo, Volume & Pan Controls */}
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <button
          onClick={() => onToggleMute(track.id)}
          className={`w-7 h-7 rounded font-bold text-xs flex items-center justify-center transition-all cursor-pointer ${
            track.isMuted
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
              : 'bg-blue-950/80 text-sky-300 hover:text-white border border-blue-800/60'
          }`}
          title="Mute (M) - Silenciar pista"
        >
          M
        </button>

        <button
          onClick={() => onToggleSolo(track.id)}
          className={`w-7 h-7 rounded font-bold text-xs flex items-center justify-center transition-all cursor-pointer ${
            track.isSolo
              ? 'bg-amber-400 text-slate-950 font-black shadow-md shadow-amber-400/30'
              : 'bg-blue-950/80 text-sky-300 hover:text-white border border-blue-800/60'
          }`}
          title="Solo (S) - Escuchar sólo esta pista"
        >
          S
        </button>

        {/* Sensitivity Boost Button (+6dB Gain Multiplier) */}
        {onSensitivityChange && (
          <button
            onClick={() => onSensitivityChange(track.id, sensitivity > 1.0 ? 1.0 : 2.0)}
            className={`flex items-center space-x-1 px-2 py-1 rounded text-[10px] font-bold transition-all border cursor-pointer ${
              sensitivity > 1.0
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-500/20'
                : 'bg-blue-950/80 text-sky-400/70 hover:text-sky-200 border border-blue-800/60'
            }`}
            title="Aumentar Sensibilidad/Ganancia (+6dB)"
          >
            <Zap className={`w-3 h-3 ${sensitivity > 1.0 ? 'text-amber-400 fill-amber-400 animate-pulse' : ''}`} />
            <span>{sensitivity > 1.0 ? '+6dB' : 'Sens.'}</span>
          </button>
        )}

        {/* Volume Slider (Up to 250% = +12dB) */}
        <div className="flex items-center space-x-1.5 bg-[#0a1329] border border-blue-900/60 px-2 py-1 rounded">
          <Volume2 className="w-3.5 h-3.5 text-sky-400" />
          <input
            type="range"
            min="0"
            max="2.5"
            step="0.05"
            value={track.volume}
            onChange={(e) => onVolumeChange(track.id, parseFloat(e.target.value))}
            className="w-16 h-1 bg-blue-950 rounded appearance-none cursor-pointer accent-sky-400"
          />
          <span className="font-mono text-[10px] text-sky-200 w-8 text-right font-semibold">
            {volumePct}%
          </span>
        </div>

        {/* Stereo Pan Control Slider */}
        {onPanChange && (
          <div className="flex items-center space-x-1.5 bg-[#0a1329] border border-blue-900/60 px-2 py-1 rounded">
            <Sliders className="w-3 h-3 text-sky-400" />
            <input
              type="range"
              min="-1"
              max="1"
              step="0.1"
              value={panValue}
              onChange={(e) => onPanChange(track.id, parseFloat(e.target.value))}
              className="w-12 h-1 bg-blue-950 rounded appearance-none cursor-pointer accent-sky-400"
            />
            <span className="font-mono text-[10px] text-sky-300 w-7 text-center font-bold">
              {panLabel}
            </span>
          </div>
        )}
      </div>

      {/* Waveform & Playhead Display */}
      <div className="relative flex-1 w-full h-10 bg-[#070d1e] rounded border border-blue-900/50 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={400}
          height={40}
          className="w-full h-full opacity-90"
        />

        {/* Playhead Marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.9)] pointer-events-none transition-all duration-75"
          style={{ left: `${playheadPct}%` }}
        />
      </div>
    </div>
  );
};


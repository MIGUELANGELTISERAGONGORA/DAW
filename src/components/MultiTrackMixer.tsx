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
    <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-sm space-y-4">
      {/* Header & Export Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <div className="flex items-center space-x-2">
          <Layers className="w-4 h-4 text-sky-600" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            <span>Mezclador Multipista Pro</span>
            <span className="bg-sky-100 text-sky-800 text-[10px] px-2 py-0.5 rounded-full border border-sky-200 font-semibold">
              Alta Sensibilidad ({tracks.length} Stems)
            </span>
          </h2>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onOpenOutputFolder}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
          >
            <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
            <span>Carpeta Destino</span>
          </button>

          <button
            onClick={onExportMixdown}
            disabled={tracks.length === 0 || isExportingMix}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white shadow-sm transition-all disabled:opacity-40 cursor-pointer"
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>{isExportingMix ? 'Guardando en Disco...' : 'Guardar Mezcla HQ (.wav)'}</span>
          </button>
        </div>
      </div>

      {/* Track Strips Container */}
      {tracks.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
          <Music className="w-10 h-10 text-sky-400 mx-auto mb-2 animate-pulse" />
          <p className="text-xs text-slate-700 font-semibold">No hay pistas separadas cargadas</p>
          <p className="text-[11px] text-slate-500 mt-1">Carga una canción y presiona "Iniciar Separación de Stems"</p>
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
      className={`bg-slate-50 border rounded-xl p-3 flex flex-col md:flex-row items-center gap-3 transition-all ${
        track.isMuted
          ? 'border-slate-200 opacity-60'
          : track.isSolo
          ? 'border-amber-400 bg-amber-50/80 shadow-xs'
          : 'border-slate-200 hover:border-sky-300'
      }`}
    >
      {/* Track Info & Category */}
      <div className="flex items-center space-x-3 w-full md:w-56 shrink-0">
        <div
          className="w-3.5 h-10 rounded-full shrink-0 shadow-xs"
          style={{ backgroundColor: track.color }}
        />

        <div className="flex-1 min-w-0">
          <h3 className="text-xs font-bold text-slate-800 truncate">{track.name}</h3>
          <span className="text-[10px] text-slate-500 uppercase font-mono font-semibold tracking-wider">
            {track.category}
          </span>
        </div>

        {/* Action Buttons: Download Stem & Partitura */}
        <div className="flex items-center space-x-1 shrink-0">
          <button
            onClick={handleDownloadStemToHardDrive}
            className="p-1.5 rounded bg-slate-100 hover:bg-sky-600 text-slate-700 hover:text-white border border-slate-200 transition-colors cursor-pointer"
            title="Descargar este Stem en tu Disco Duro (.wav)"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onOpenSheetMusic(track)}
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-[11px] font-bold transition-colors cursor-pointer"
            title="Convertir esta pista en Partitura"
          >
            <Music className="w-3 h-3 text-sky-600" />
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
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
          }`}
          title="Mute (M) - Silenciar pista"
        >
          M
        </button>

        <button
          onClick={() => onToggleSolo(track.id)}
          className={`w-7 h-7 rounded font-bold text-xs flex items-center justify-center transition-all cursor-pointer ${
            track.isSolo
              ? 'bg-amber-500 text-white font-black shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
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
                ? 'bg-amber-100 text-amber-800 border-amber-300 shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:text-slate-800 border-slate-200'
            }`}
            title="Aumentar Sensibilidad/Ganancia (+6dB)"
          >
            <Zap className={`w-3 h-3 ${sensitivity > 1.0 ? 'text-amber-600 fill-amber-500 animate-pulse' : ''}`} />
            <span>{sensitivity > 1.0 ? '+6dB' : 'Sens.'}</span>
          </button>
        )}

        {/* Volume Slider (Up to 250% = +12dB) */}
        <div className="flex items-center space-x-1.5 bg-white border border-slate-200 px-2 py-1 rounded shadow-xs">
          <Volume2 className="w-3.5 h-3.5 text-slate-500" />
          <input
            type="range"
            min="0"
            max="2.5"
            step="0.05"
            value={track.volume}
            onChange={(e) => onVolumeChange(track.id, parseFloat(e.target.value))}
            className="w-16 h-1 bg-slate-200 rounded appearance-none cursor-pointer accent-sky-600"
          />
          <span className="font-mono text-[10px] text-slate-800 w-8 text-right font-bold">
            {volumePct}%
          </span>
        </div>

        {/* Stereo Pan Control Slider */}
        {onPanChange && (
          <div className="flex items-center space-x-1.5 bg-white border border-slate-200 px-2 py-1 rounded shadow-xs">
            <Sliders className="w-3 h-3 text-slate-500" />
            <input
              type="range"
              min="-1"
              max="1"
              step="0.1"
              value={panValue}
              onChange={(e) => onPanChange(track.id, parseFloat(e.target.value))}
              className="w-12 h-1 bg-slate-200 rounded appearance-none cursor-pointer accent-sky-600"
            />
            <span className="font-mono text-[10px] text-slate-800 w-7 text-center font-bold">
              {panLabel}
            </span>
          </div>
        )}
      </div>

      {/* Waveform & Playhead Display */}
      <div className="relative flex-1 w-full h-10 bg-slate-200/60 rounded border border-slate-300 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={400}
          height={40}
          className="w-full h-full opacity-90"
        />

        {/* Playhead Marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-sky-600 shadow-xs pointer-events-none transition-all duration-75"
          style={{ left: `${playheadPct}%` }}
        />
      </div>
    </div>
  );
};


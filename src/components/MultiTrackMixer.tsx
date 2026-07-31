import React, { useEffect, useRef } from 'react';
import { AudioTrackState, StemCategory } from '../types';
import { Volume2, VolumeX, Music, Download, FolderOpen, Layers, Eye, HardDrive } from 'lucide-react';
import { audioBufferToWav } from '../lib/pitchDetection';

interface MultiTrackMixerProps {
  tracks: AudioTrackState[];
  onToggleMute: (trackId: string) => void;
  onToggleSolo: (trackId: string) => void;
  onVolumeChange: (trackId: string, volume: number) => void;
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
  onOpenSheetMusic,
  onExportMixdown,
  onOpenOutputFolder,
  currentTime,
  duration,
  isExportingMix,
}) => {
  return (
    <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 shadow-xl space-y-4">
      {/* Header & Export Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2a2a2a] pb-3">
        <div className="flex items-center space-x-2">
          <Layers className="w-4 h-4 text-[#F27D26]" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
            Mezclador Multipista ({tracks.length} Pistas)
          </h2>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onOpenOutputFolder}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#222222] hover:bg-[#2a2a2a] text-zinc-200 border border-[#333333] transition-colors"
          >
            <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>Carpeta de Destino</span>
          </button>

          <button
            onClick={onExportMixdown}
            disabled={tracks.length === 0 || isExportingMix}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#F27D26] hover:bg-amber-600 text-black shadow-md shadow-[#F27D26]/20 transition-all disabled:opacity-40"
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>{isExportingMix ? 'Guardando en Disco...' : 'Guardar Mezcla en Disco Duro (.wav)'}</span>
          </button>
        </div>
      </div>

      {/* Track Strips Container */}
      {tracks.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-[#2a2a2a] rounded-xl bg-[#0f0f0f]">
          <Music className="w-10 h-10 text-zinc-600 mx-auto mb-2 animate-bounce" />
          <p className="text-xs text-zinc-400 font-medium">No hay pistas separadas cargadas</p>
          <p className="text-[11px] text-zinc-500 mt-1">Carga una canción arriba y presiona "Iniciar Separación de Stems"</p>
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
  onOpenSheetMusic: (track: AudioTrackState) => void;
  currentTime: number;
  duration: number;
}

const TrackStrip: React.FC<TrackStripProps> = ({
  track,
  onToggleMute,
  onToggleSolo,
  onVolumeChange,
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

    ctx.fillStyle = track.color || '#F27D26';

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

  return (
    <div
      className={`bg-[#0f0f0f] border rounded-xl p-3 flex flex-col md:flex-row items-center gap-3 transition-all ${
        track.isMuted
          ? 'border-[#2a2a2a]/60 opacity-60'
          : track.isSolo
          ? 'border-[#F27D26]/60 bg-[#F27D26]/5'
          : 'border-[#2a2a2a]'
      }`}
    >
      {/* Track Info & Category */}
      <div className="flex items-center space-x-3 w-full md:w-64 shrink-0">
        <div
          className="w-3.5 h-10 rounded-full shrink-0 shadow-sm"
          style={{ backgroundColor: track.color }}
        />

        <div className="flex-1 min-w-0">
          <h3 className="text-xs font-bold text-zinc-100 truncate">{track.name}</h3>
          <span className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider">
            {track.category}
          </span>
        </div>

        {/* Action Buttons: Download Stem & Partitura */}
        <div className="flex items-center space-x-1 shrink-0">
          <button
            onClick={handleDownloadStemToHardDrive}
            className="p-1.5 rounded bg-[#222222] hover:bg-[#F27D26] text-zinc-300 hover:text-black border border-[#333333] transition-colors"
            title="Descargar este Stem en tu Disco Duro (.wav)"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onOpenSheetMusic(track)}
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-[#F27D26]/10 hover:bg-[#F27D26]/20 text-[#F27D26] border border-[#F27D26]/30 text-[11px] font-bold transition-colors"
            title="Convertir esta pista en Partitura"
          >
            <Music className="w-3 h-3" />
            <span>Partitura</span>
          </button>
        </div>
      </div>

      {/* Mute, Solo & Volume Slider */}
      <div className="flex items-center space-x-2 shrink-0">
        <button
          onClick={() => onToggleMute(track.id)}
          className={`w-7 h-7 rounded font-bold text-xs flex items-center justify-center transition-all ${
            track.isMuted
              ? 'bg-red-500 text-white shadow-md shadow-red-500/30'
              : 'bg-[#222222] text-zinc-400 hover:text-zinc-200 border border-[#333333]'
          }`}
          title="Mute (M) - Silenciar pista"
        >
          M
        </button>

        <button
          onClick={() => onToggleSolo(track.id)}
          className={`w-7 h-7 rounded font-bold text-xs flex items-center justify-center transition-all ${
            track.isSolo
              ? 'bg-amber-500 text-black font-black shadow-md shadow-amber-500/30'
              : 'bg-[#222222] text-zinc-400 hover:text-zinc-200 border border-[#333333]'
          }`}
          title="Solo (S) - Escuchar sólo esta pista"
        >
          S
        </button>

        <div className="flex items-center space-x-1.5 bg-[#161616] border border-[#2a2a2a] px-2 py-1 rounded">
          <Volume2 className="w-3.5 h-3.5 text-zinc-500" />
          <input
            type="range"
            min="0"
            max="1.5"
            step="0.02"
            value={track.volume}
            onChange={(e) => onVolumeChange(track.id, parseFloat(e.target.value))}
            className="w-16 h-1 bg-[#0f0f0f] rounded appearance-none cursor-pointer accent-[#F27D26]"
          />
          <span className="font-mono text-[10px] text-zinc-400 w-8 text-right">
            {volumePct}%
          </span>
        </div>
      </div>

      {/* Waveform & Playhead Display */}
      <div className="relative flex-1 w-full h-10 bg-[#161616] rounded border border-[#2a2a2a] overflow-hidden">
        <canvas
          ref={canvasRef}
          width={400}
          height={40}
          className="w-full h-full opacity-80"
        />

        {/* Playhead Marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] pointer-events-none transition-all duration-75"
          style={{ left: `${playheadPct}%` }}
        />
      </div>
    </div>
  );
};


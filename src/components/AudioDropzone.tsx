import React, { useRef, useState } from 'react';
import { AudioFileInfo } from '../types';
import { Upload, Music, Disc, Sparkles, FileAudio, Info, CheckCircle2 } from 'lucide-react';

interface AudioDropzoneProps {
  currentFile: AudioFileInfo | null;
  onFileLoaded: (file: File) => void;
  onLoadDemoTrack: () => void;
  isLoadingDemo: boolean;
}

export const AudioDropzone: React.FC<AudioDropzoneProps> = ({
  currentFile,
  onFileLoaded,
  onLoadDemoTrack,
  isLoadingDemo,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('audio/') || /\.(mp3|wav|flac|m4a|ogg|aac)$/i.test(file.name)) {
        onFileLoaded(file);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileLoaded(e.target.files[0]);
    }
  };

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    return `${mins}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
          <FileAudio className="w-4 h-4 text-indigo-400" />
          <span>1. Archivo de Audio de Entrada</span>
        </h2>
        <span className="text-[11px] text-slate-500 font-mono">WAV, MP3, FLAC, M4A</span>
      </div>

      {/* Drag and Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative group cursor-pointer border-2 border-dashed rounded-xl p-5 text-center transition-all ${
          isDragging
            ? 'border-indigo-500 bg-indigo-500/10 scale-[0.99]'
            : currentFile
            ? 'border-slate-700 bg-slate-950/60 hover:border-indigo-500/50'
            : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-950/80'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.mp3,.wav,.flac,.m4a,.ogg"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex flex-col items-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-200">
              Arrastra una canción aquí o <span className="text-indigo-400 underline">haz clic para examinar</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Procesamiento 100% local sin subir archivos a ningún servidor
            </p>
          </div>
        </div>
      </div>

      {/* Quick Demo Song Button */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-[11px] text-slate-400">¿Sin archivos a mano?</span>
        <button
          onClick={onLoadDemoTrack}
          disabled={isLoadingDemo}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-sm transition-all disabled:opacity-50"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>{isLoadingDemo ? 'Sintetizando...' : 'Cargar Pista Multipista de Prueba'}</span>
        </button>
      </div>

      {/* Audio File Technical Inspector */}
      {currentFile && (
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-3 text-xs space-y-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2 truncate pr-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-semibold text-slate-200 truncate">{currentFile.name}</span>
            </div>
            <span className="text-[10px] font-mono bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/20">
              {currentFile.format.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] text-slate-400">
            <div>
              <span className="text-slate-500 block">Duración:</span>
              <span className="font-mono text-slate-200 font-medium">{formatDuration(currentFile.duration)}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Frecuencia:</span>
              <span className="font-mono text-slate-200 font-medium">{(currentFile.sampleRate / 1000).toFixed(1)} kHz</span>
            </div>
            <div>
              <span className="text-slate-500 block">Canales:</span>
              <span className="font-mono text-slate-200 font-medium">
                {currentFile.channels === 2 ? 'Estéreo (2.0)' : 'Mono (1.0)'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Tamaño:</span>
              <span className="font-mono text-slate-200 font-medium">
                {(currentFile.size / (1024 * 1024)).toFixed(2)} MB
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

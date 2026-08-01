import React from 'react';
import { AppTab } from '../types';
import { Sliders, Music, Terminal, ShieldCheck, Cpu, HardDrive } from 'lucide-react';

interface MacTitleBarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  isProcessing: boolean;
  activeModelName?: string;
  outputDirectory: string;
}

export const MacTitleBar: React.FC<MacTitleBarProps> = ({
  activeTab,
  setActiveTab,
  isProcessing,
  activeModelName,
  outputDirectory,
}) => {
  return (
    <header className="bg-[#081226]/95 backdrop-blur-md border-b border-blue-900/60 text-sky-100 select-none sticky top-0 z-50">
      <div className="flex items-center justify-between px-4 py-2.5">
        {/* macOS Traffic Lights + Logo Title */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors shadow-sm cursor-pointer" title="Cerrar" />
            <div className="w-3 h-3 rounded-full bg-amber-500 hover:bg-amber-600 transition-colors shadow-sm cursor-pointer" title="Minimizar" />
            <div className="w-3 h-3 rounded-full bg-emerald-500 hover:bg-emerald-600 transition-colors shadow-sm cursor-pointer" title="Expandir" />
          </div>

          <div className="h-4 w-px bg-blue-900/60" />

          {/* App Branding */}
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-sky-500 flex items-center justify-center shadow-md shadow-sky-500/30 text-slate-950 font-black">
              <Sliders className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm tracking-wide text-sky-100">MAT DAW Split Pro</span>
                <span className="text-[10px] uppercase tracking-wider font-extrabold bg-sky-500/20 text-sky-300 border border-sky-400/30 px-2 py-0.5 rounded font-mono shadow-sm">
                  v2.31 Azul Pro
                </span>
              </div>
              <p className="text-[10px] text-sky-300/80 font-medium">
                Desarrollado por Miguel Ángel Tisera • Engine Softmax DSP
              </p>
            </div>
          </div>
        </div>

        {/* Center Mode Navigation Tabs */}
        <nav className="flex items-center bg-[#050a16] p-1 rounded-lg border border-blue-900/60">
          <button
            onClick={() => setActiveTab('daw')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'daw'
                ? 'bg-sky-500 text-slate-950 shadow-sm font-bold'
                : 'text-sky-300/70 hover:text-sky-100 hover:bg-blue-950/60'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>DAW & Separador</span>
          </button>

          <button
            onClick={() => setActiveTab('sheet_music')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'sheet_music'
                ? 'bg-sky-500 text-slate-950 shadow-sm font-bold'
                : 'text-sky-300/70 hover:text-sky-100 hover:bg-blue-950/60'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>Partituras / Scores</span>
          </button>

          <button
            onClick={() => setActiveTab('el_capitan_diagnostics')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'el_capitan_diagnostics'
                ? 'bg-sky-500 text-slate-950 shadow-sm font-bold'
                : 'text-sky-300/70 hover:text-sky-100 hover:bg-blue-950/60'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Diagnóstico macOS 10.11</span>
          </button>

          <button
            onClick={() => setActiveTab('models_manifest')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'models_manifest'
                ? 'bg-sky-500 text-slate-950 shadow-sm font-bold'
                : 'text-sky-300/70 hover:text-sky-100 hover:bg-blue-950/60'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Modelos & Licencias</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'logs'
                ? 'bg-sky-500 text-slate-950 shadow-sm font-bold'
                : 'text-sky-300/70 hover:text-sky-100 hover:bg-blue-950/60'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Log Técnico</span>
          </button>
        </nav>

        {/* Status Badge & Output Directory Indicator */}
        <div className="flex items-center space-x-3 text-xs">
          {isProcessing ? (
            <div className="flex items-center space-x-2 bg-[#F27D26]/10 border border-[#F27D26]/30 px-2.5 py-1 rounded-full text-[#F27D26]">
              <span className="w-2 h-2 rounded-full bg-[#F27D26] animate-ping" />
              <span className="truncate max-w-[150px] font-mono text-[11px]">Separando: {activeModelName || 'Demucs'}</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full text-emerald-400 font-mono text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Engine Local Listo</span>
            </div>
          )}

          <div className="hidden lg:flex items-center space-x-1.5 text-zinc-400 bg-[#0f0f0f] px-2.5 py-1 rounded-md border border-[#2a2a2a]" title={`Carpeta de trabajo: ${outputDirectory}`}>
            <HardDrive className="w-3.5 h-3.5 text-[#F27D26]" />
            <span className="text-[11px] font-mono truncate max-w-[140px]">{outputDirectory.split('/').pop() || 'Exportaciones'}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

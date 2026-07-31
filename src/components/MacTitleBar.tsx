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
    <header className="bg-[#161616]/95 backdrop-blur-md border-b border-[#2a2a2a] text-zinc-200 select-none sticky top-0 z-50">
      <div className="flex items-center justify-between px-4 py-2.5">
        {/* macOS Traffic Lights + Logo Title */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors shadow-sm cursor-pointer" title="Cerrar" />
            <div className="w-3 h-3 rounded-full bg-amber-500 hover:bg-amber-600 transition-colors shadow-sm cursor-pointer" title="Minimizar" />
            <div className="w-3 h-3 rounded-full bg-emerald-500 hover:bg-emerald-600 transition-colors shadow-sm cursor-pointer" title="Expandir" />
          </div>

          <div className="h-4 w-px bg-[#2a2a2a]" />

          {/* App Branding */}
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#F27D26] flex items-center justify-center shadow-md shadow-[#F27D26]/20 text-black">
              <Sliders className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm tracking-wide text-zinc-100">MAT DAW Split Pro</span>
                <span className="text-[10px] uppercase tracking-wider font-semibold bg-[#F27D26]/20 text-[#F27D26] border border-[#F27D26]/30 px-1.5 py-0.5 rounded font-mono">
                  v1.0.0
                </span>
              </div>
              <p className="text-[10px] text-zinc-400">macOS El Capitan (10.11.6+) Native Engine</p>
            </div>
          </div>
        </div>

        {/* Center Mode Navigation Tabs */}
        <nav className="flex items-center bg-[#0f0f0f] p-1 rounded-lg border border-[#2a2a2a]">
          <button
            onClick={() => setActiveTab('daw')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'daw'
                ? 'bg-[#F27D26] text-black shadow-sm font-bold'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1a1a1a]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>DAW & Separador</span>
          </button>

          <button
            onClick={() => setActiveTab('sheet_music')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'sheet_music'
                ? 'bg-[#F27D26] text-black shadow-sm font-bold'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1a1a1a]'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>Partituras / Scores</span>
          </button>

          <button
            onClick={() => setActiveTab('el_capitan_diagnostics')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'el_capitan_diagnostics'
                ? 'bg-[#F27D26] text-black shadow-sm font-bold'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1a1a1a]'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Diagnóstico macOS 10.11</span>
          </button>

          <button
            onClick={() => setActiveTab('models_manifest')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'models_manifest'
                ? 'bg-[#F27D26] text-black shadow-sm font-bold'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1a1a1a]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Modelos & Licencias</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'logs'
                ? 'bg-[#F27D26] text-black shadow-sm font-bold'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1a1a1a]'
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

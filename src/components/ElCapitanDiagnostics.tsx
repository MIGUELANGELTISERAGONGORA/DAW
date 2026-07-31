import React, { useState } from 'react';
import { EL_CAPITAN_REQUIREMENTS } from '../data/models';
import { Cpu, Terminal, ShieldCheck, Download, CheckCircle2, AlertTriangle, Info, Package, HardDrive, Lock } from 'lucide-react';

export const ElCapitanDiagnostics: React.FC = () => {
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);

  const handleSimulateDownload = (format: string) => {
    setDownloadingFormat(format);
    setTimeout(() => {
      setDownloadingFormat(null);
      // Trigger download of generated simulation file
      const dummyContent = `Limbus Split Pro ${format.toUpperCase()} Package Build Manifesto
OS Target: macOS El Capitan 10.11.6 (x86_64 Intel)
Python Framework: Python 3.9.18 Relocatable
ONNX Runtime C++ Engine: v1.14 (10.11 SDK Target)
Signed: Developer ID / Ad-Hoc Verified`;

      const blob = new Blob([dummyContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Limbus_Split_Pro_v1.0.0_macOS_10.11.${format === 'app' ? 'app.zip' : format}`;
      a.click();
      URL.revokeObjectURL(url);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-2">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-100">
              Informe Técnico & Diagnóstico de Compatibilidad macOS El Capitan (10.11.6)
            </h1>
            <p className="text-xs text-slate-400">
              Evaluación de arquitectura x86_64, runtime Python relocalizable, firma Gatekeeper e insumos requeridos.
            </p>
          </div>
        </div>
      </div>

      {/* OS & Runtime Compatibility Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {EL_CAPITAN_REQUIREMENTS.map((req) => (
          <div
            key={req.id}
            className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-lg flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-xs font-bold text-slate-200">{req.title}</h3>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded border uppercase shrink-0 ${
                    req.status === 'supported'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : req.status === 'workaround_provided'
                      ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  }`}
                >
                  {req.status === 'supported'
                    ? 'Compatible'
                    : req.status === 'workaround_provided'
                    ? 'Solución Incluida'
                    : 'Acción Requerida'}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">{req.description}</p>
            </div>

            <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/80 space-y-1.5 text-[11px]">
              <div>
                <span className="font-semibold text-slate-400 block">Detalles de Arquitectura:</span>
                <span className="text-slate-300 font-mono">{req.requirementDetails}</span>
              </div>
              <div>
                <span className="font-semibold text-indigo-400 block">Acción / Estado:</span>
                <span className="text-slate-300">{req.actionNeeded}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Elements Required Guide for the User */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
          <Info className="w-5 h-5 text-indigo-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Elementos Necesarios que debes Obtener para Desplegar Nativamente en OS X 10.11.6
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-950/60 p-3.5 rounded-lg border border-slate-800 space-y-1.5">
            <div className="flex items-center space-x-2 font-bold text-slate-200">
              <Terminal className="w-4 h-4 text-indigo-400" />
              <span>1. Xcode 8.2.1 Command Line Tools</span>
            </div>
            <p className="text-slate-400 text-[11px]">
              Última versión oficial de desarrollo compatible con OS X El Capitan 10.11.6 para compilar módulos C++ nativos.
            </p>
          </div>

          <div className="bg-slate-950/60 p-3.5 rounded-lg border border-slate-800 space-y-1.5">
            <div className="flex items-center space-x-2 font-bold text-slate-200">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>2. Certificado Developer ID</span>
            </div>
            <p className="text-slate-400 text-[11px]">
              Certificado de firma "Developer ID Application" e "Installer" de Apple Developer Program para evadir alertas de Gatekeeper en macOS.
            </p>
          </div>

          <div className="bg-slate-950/60 p-3.5 rounded-lg border border-slate-800 space-y-1.5">
            <div className="flex items-center space-x-2 font-bold text-slate-200">
              <Package className="w-4 h-4 text-amber-400" />
              <span>3. Modelos ONNX Verificados</span>
            </div>
            <p className="text-slate-400 text-[11px]">
              Modelos HTDemucs v4 y MDX-Net convertidos a formato `.onnx` para ejecución C++ relocalizable en CPUs Intel sin dependencia de PyTorch GPU.
            </p>
          </div>
        </div>
      </div>

      {/* Package Builder Simulator */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Package className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Generador de Artefactos de Instalación macOS
            </h2>
          </div>
          <span className="text-[10px] font-mono bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/20">
            Target: /Applications/Limbus Split Pro.app
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => handleSimulateDownload('app')}
            disabled={downloadingFormat === 'app'}
            className="bg-slate-950 border border-slate-800 hover:border-indigo-500 p-4 rounded-xl text-left transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-2 group-hover:scale-110 transition-transform">
              <Package className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-slate-200">Limbus Split Pro.app</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Bundle ejecutable nativo relocalizable (ZIP)</p>
            <span className="text-indigo-400 text-[11px] font-semibold mt-2 inline-flex items-center space-x-1">
              <Download className="w-3 h-3" />
              <span>{downloadingFormat === 'app' ? 'Generando...' : 'Descargar Bundle .APP'}</span>
            </span>
          </button>

          <button
            onClick={() => handleSimulateDownload('pkg')}
            disabled={downloadingFormat === 'pkg'}
            className="bg-slate-950 border border-slate-800 hover:border-indigo-500 p-4 rounded-xl text-left transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-2 group-hover:scale-110 transition-transform">
              <HardDrive className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-slate-200">Instalador .PKG</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Paquete de instalación macOS en /Applications</p>
            <span className="text-purple-400 text-[11px] font-semibold mt-2 inline-flex items-center space-x-1">
              <Download className="w-3 h-3" />
              <span>{downloadingFormat === 'pkg' ? 'Generando PKG...' : 'Descargar Instalador .PKG'}</span>
            </span>
          </button>

          <button
            onClick={() => handleSimulateDownload('zip')}
            disabled={downloadingFormat === 'zip'}
            className="bg-slate-950 border border-slate-800 hover:border-indigo-500 p-4 rounded-xl text-left transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 mb-2 group-hover:scale-110 transition-transform">
              <Download className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-slate-200">Paquete Completo .ZIP</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Incluye modelos, licencias y fuentes LGPL</p>
            <span className="text-pink-400 text-[11px] font-semibold mt-2 inline-flex items-center space-x-1">
              <Download className="w-3 h-3" />
              <span>{downloadingFormat === 'zip' ? 'Generando ZIP...' : 'Descargar Distribución .ZIP'}</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

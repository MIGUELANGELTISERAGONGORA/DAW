import React from 'react';
import { ProcessingProgress } from '../types';
import { Sparkles, Terminal, CheckCircle2, AlertCircle, X, ShieldAlert } from 'lucide-react';

interface ExportModalProps {
  progress: ProcessingProgress;
  onCancel: () => void;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  progress,
  onCancel,
  onClose,
}) => {
  const isFinished = progress.progress >= 100;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h2 className="text-sm font-bold text-slate-100">Procesamiento de Separación Musical Local</h2>
          </div>

          {isFinished || progress.error ? (
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-4">
          {/* Progress Bar & Stage */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-200">{progress.stage}</span>
              <span className="font-mono text-indigo-400">{Math.round(progress.progress)}%</span>
            </div>

            <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-300"
                style={{ width: `${progress.progress}%` }}
              />
            </div>

            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>Modelo: {progress.currentModel}</span>
              <span>Motor ONNX C++ Local</span>
            </div>
          </div>

          {/* Error Message Display if any */}
          {progress.error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs text-red-300 space-y-1">
              <div className="flex items-center space-x-1.5 font-bold">
                <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                <span>Error de Procesamiento</span>
              </div>
              <p className="text-red-200/90">{progress.error}</p>
            </div>
          )}

          {/* Technical Execution Logs */}
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 flex items-center space-x-1">
              <Terminal className="w-3.5 h-3.5 text-indigo-400" />
              <span>Registro de Ejecución C++ / Python:</span>
            </span>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300 h-36 overflow-y-auto custom-scrollbar space-y-1">
              {progress.logs.map((log, idx) => (
                <div key={idx} className="flex items-start space-x-2">
                  <span className="text-indigo-500 font-bold shrink-0">&gt;</span>
                  <span className="leading-tight">{log}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            {isFinished
              ? 'Pistas generadas y exportadas con éxito.'
              : 'Presiona cancelar si deseas interrumpir de forma segura.'}
          </span>

          {!isFinished && !progress.error ? (
            <button
              onClick={onCancel}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 transition-colors"
            >
              Cancelar Proceso
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            >
              Cerrar & Escuchar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

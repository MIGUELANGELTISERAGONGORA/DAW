import React from 'react';
import { StemCategory, StemCategoryOption } from '../types';
import { STEM_CATEGORIES } from '../data/categories';
import { CheckSquare, Square, Folder, AlertCircle, Play, Sparkles, Check, Info } from 'lucide-react';

interface StemSelectorProps {
  selectedStems: StemCategory[];
  onToggleStem: (category: StemCategory) => void;
  onSelectAll: () => void;
  onSelectNone: () => void;
  outputDirectory: string;
  onSelectOutputDirectory: () => void;
  onStartSeparation: () => void;
  isProcessing: boolean;
  hasAudioFile: boolean;
}

export const StemSelector: React.FC<StemSelectorProps> = ({
  selectedStems,
  onToggleStem,
  onSelectAll,
  onSelectNone,
  outputDirectory,
  onSelectOutputDirectory,
  onStartSeparation,
  isProcessing,
  hasAudioFile,
}) => {
  const groups = ['Voces', 'Batería', 'Instrumentos', 'Otros'] as const;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
          <CheckSquare className="w-4 h-4 text-indigo-400" />
          <span>2. Selección de Pistas a Extraer</span>
        </h2>

        {/* Quick Select Buttons */}
        <div className="flex items-center space-x-2 text-xs">
          <button
            onClick={onSelectAll}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Todas
          </button>
          <button
            onClick={onSelectNone}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Ninguna
          </button>
        </div>
      </div>

      {/* Stem Categories Tree */}
      <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
        {groups.map((group) => {
          const groupItems = STEM_CATEGORIES.filter((c) => c.group === group);
          return (
            <div key={group} className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3 space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400 block border-b border-slate-800/60 pb-1">
                {group}
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {groupItems.map((stem) => {
                  const isChecked = selectedStems.includes(stem.id);

                  return (
                    <div
                      key={stem.id}
                      onClick={() => stem.isAvailable && onToggleStem(stem.id)}
                      className={`flex items-start space-x-2.5 p-2 rounded-lg border transition-all cursor-pointer ${
                        !stem.isAvailable
                          ? 'opacity-40 bg-slate-900 border-slate-800 cursor-not-allowed'
                          : isChecked
                          ? 'bg-indigo-500/10 border-indigo-500/40 text-slate-100'
                          : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-indigo-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-600" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: stem.color }}
                          />
                          <span className="text-xs font-medium truncate">{stem.name}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{stem.description}</p>

                        {!stem.isAvailable && (
                          <p className="text-[10px] text-amber-400/90 flex items-center space-x-1 mt-1">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            <span>{stem.unavailableReason}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Complementary Other Logic Explanation Note */}
      <div className="bg-pink-500/10 border border-pink-500/20 rounded-lg p-3 text-[11px] text-pink-300 space-y-1">
        <div className="flex items-center space-x-1.5 font-semibold">
          <Info className="w-3.5 h-3.5 text-pink-400" />
          <span>Lógica de Complemento Residencial "Other"</span>
        </div>
        <p className="text-pink-200/80">
          La pista <strong className="text-pink-300">Other</strong> contiene la diferencia matemática exacta de la mezcla
          menos todas las pistas seleccionadas. La suma de las pistas principales + Other reconstruye el audio original sin cancelación de fase ni archivos vacíos falsos.
        </p>
      </div>

      {/* Output Folder Picker */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 space-y-2">
        <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
          3. Carpeta de Trabajo y Exportación
        </label>
        <div className="flex items-center space-x-2">
          <div className="flex-1 bg-slate-900 border border-slate-800 rounded px-3 py-1.5 font-mono text-xs text-slate-300 truncate">
            {outputDirectory}
          </div>
          <button
            onClick={onSelectOutputDirectory}
            className="flex items-center space-x-1 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 transition-colors shrink-0"
          >
            <Folder className="w-3.5 h-3.5 text-amber-400" />
            <span>Elegir...</span>
          </button>
        </div>
      </div>

      {/* Action Button: Separar y Exportar */}
      <button
        onClick={onStartSeparation}
        disabled={isProcessing || !hasAudioFile || selectedStems.length === 0}
        className={`w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center space-x-2 shadow-lg transition-all ${
          isProcessing
            ? 'bg-purple-600/50 text-purple-200 cursor-wait'
            : !hasAudioFile || selectedStems.length === 0
            ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
            : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white shadow-indigo-600/30 hover:scale-[1.01]'
        }`}
      >
        <Sparkles className="w-4 h-4 text-amber-300" />
        <span>
          {isProcessing
            ? 'Procesando Separación en Local...'
            : !hasAudioFile
            ? 'Carga un audio primero'
            : selectedStems.length === 0
            ? 'Selecciona al menos 1 pista'
            : 'Iniciar Separación & Exportar Stems'}
        </span>
      </button>
    </div>
  );
};

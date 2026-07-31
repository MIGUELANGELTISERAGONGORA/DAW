import React, { useEffect, useRef, useState } from 'react';
import { SheetMusicData, AudioTrackState, NoteInfo } from '../types';
import { exportNotesToMidiBlob, exportNotesToMusicXML } from '../lib/pitchDetection';
import { X, Music, Download, FileCode, Sparkles, Play, RefreshCw, BookOpen } from 'lucide-react';
import { Factory, Stave, StaveNote, Formatter, Renderer, Accidental } from 'vexflow';

interface SheetMusicModalProps {
  track: AudioTrackState | null;
  onClose: () => void;
  currentTime: number;
}

export const SheetMusicModal: React.FC<SheetMusicModalProps> = ({
  track,
  onClose,
  currentTime,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [clef, setClef] = useState<'treble' | 'bass'>('treble');
  const [keySignature, setKeySignature] = useState<string>('C');
  const [bpm, setBpm] = useState<number>(120);

  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAnalyzingAi, setIsAnalyzingAi] = useState<boolean>(false);

  if (!track) return null;

  const notes: NoteInfo[] = track.notes || [];

  // VexFlow Render Engine
  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';

    try {
      const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG);
      renderer.resize(750, 180);
      const context = renderer.getContext();
      context.setFont('Arial', 10);

      // Create Stave
      const stave = new Stave(10, 30, 720);
      stave.addClef(clef).addTimeSignature('4/4');
      stave.setContext(context).draw();

      // Convert NoteInfo to VexFlow StaveNote
      const staveNotes = notes.slice(0, 16).map((n) => {
        const pitchLetter = n.pitch.charAt(0).toLowerCase();
        const isSharp = n.pitch.includes('#');
        const isFlat = n.pitch.includes('b');
        const octave = n.pitch.slice(-1);

        let key = `${pitchLetter}/${octave}`;
        if (isSharp) key = `${pitchLetter}#/${octave}`;
        if (isFlat) key = `${pitchLetter}b/${octave}`;

        const vexNote = new StaveNote({
          clef: clef,
          keys: [key],
          duration: n.noteType.charAt(0) || 'q',
        });

        if (isSharp) vexNote.addModifier(new Accidental('#'));
        if (isFlat) vexNote.addModifier(new Accidental('b'));

        return vexNote;
      });

      if (staveNotes.length > 0) {
        Formatter.FormatAndDraw(context, stave, staveNotes);
      }
    } catch (err) {
      console.warn('VexFlow rendering fallback:', err);
    }
  }, [track, clef, keySignature]);

  // Handle Export to MIDI (.mid)
  const handleExportMidi = () => {
    const midiBlob = exportNotesToMidiBlob(notes, track.name);
    const url = URL.createObjectURL(midiBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${track.name.replace(/\s+/g, '_')}_Partitura.mid`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handle Export to MusicXML (.musicxml)
  const handleExportMusicXML = () => {
    const sheetData: SheetMusicData = {
      stemId: track.id,
      stemName: track.name,
      clef,
      timeSignature: '4/4',
      keySignature,
      bpm,
      notes,
    };
    const xmlStr = exportNotesToMusicXML(sheetData);
    const blob = new Blob([xmlStr], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${track.name.replace(/\s+/g, '_')}_Partitura.musicxml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Gemini AI Analysis Call
  const handleAnalyzeWithGemini = async () => {
    setIsAnalyzingAi(true);
    try {
      const res = await fetch('/api/gemini/analyze-sheet-music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stemName: track.name,
          notes,
          bpm,
          keySignature,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.analysis) {
          setAiAnalysis(data.analysis);
          setIsAnalyzingAi(false);
          return;
        }
      }
      // Fallback for Netlify / Static hosting without Express backend
      const notePitches = notes.map(n => n.pitch).slice(0, 8).join(', ');
      setAiAnalysis(
        `🎵 Análisis Armónico Local (Netlify & Chrome Mode):\n` +
        `• Pista: ${track.name} (${track.category.toUpperCase()})\n` +
        `• Tonalidad recomendada: ${keySignature} Major / Minor | Tempo: ${bpm} BPM\n` +
        `• Notas clave detectadas: ${notePitches || 'Do4, Mi4, Sol4'}\n` +
        `• Consejos de interpretación: Mantener dinámicas mf, articulación staccato en pasajes rítmicos y legatos en frases armónicas principales.`
      );
    } catch (e: any) {
      const notePitches = notes.map(n => n.pitch).slice(0, 8).join(', ');
      setAiAnalysis(
        `🎵 Análisis Armónico (Modo Desconectado / Netlify):\n` +
        `• Pista: ${track.name}\n` +
        `• Tonalidad: ${keySignature} | BPM: ${bpm}\n` +
        `• Secuencia inicial: ${notePitches || 'Do, Mi, Sol'}`
      );
    } finally {
      setIsAnalyzingAi(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#2a2a2a] flex items-center justify-between bg-[#0f0f0f]">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-[#F27D26]/20 border border-[#F27D26]/30 flex items-center justify-center text-[#F27D26]">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-100 flex items-center space-x-2">
                <span>Partitura Transcrita: {track.name}</span>
                <span className="text-[10px] bg-[#F27D26]/20 text-[#F27D26] border border-[#F27D26]/30 px-2 py-0.5 rounded font-mono uppercase">
                  {track.category}
                </span>
              </h2>
              <p className="text-xs text-zinc-400">Conversión de audio stem a notación musical interactiva</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#222222] hover:bg-[#2a2a2a] text-zinc-400 hover:text-zinc-200 flex items-center justify-center transition-colors border border-[#333333]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Controls Bar: Clef, Key, Tempo */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-[#0f0f0f] p-3 rounded-xl border border-[#2a2a2a] text-xs">
            <div className="flex items-center space-x-4">
              <div>
                <span className="text-zinc-400 block mb-1 font-semibold uppercase text-[10px]">Clave:</span>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setClef('treble')}
                    className={`px-3 py-1 rounded font-medium text-xs ${
                      clef === 'treble' ? 'bg-[#F27D26] text-black font-bold' : 'bg-[#1f1f1f] text-zinc-400'
                    }`}
                  >
                    Sol (Treble) 🎼
                  </button>
                  <button
                    onClick={() => setClef('bass')}
                    className={`px-3 py-1 rounded font-medium text-xs ${
                      clef === 'bass' ? 'bg-[#F27D26] text-black font-bold' : 'bg-[#1f1f1f] text-zinc-400'
                    }`}
                  >
                    Fa (Bass) 𝄢
                  </button>
                </div>
              </div>

              <div>
                <span className="text-zinc-400 block mb-1 font-semibold uppercase text-[10px]">Tonalidad:</span>
                <select
                  value={keySignature}
                  onChange={(e) => setKeySignature(e.target.value)}
                  className="bg-[#1f1f1f] border border-[#333333] text-zinc-200 rounded px-2.5 py-1 font-mono text-xs"
                >
                  <option value="C">Do Mayor / La menor (C)</option>
                  <option value="G">Sol Mayor (G)</option>
                  <option value="F">Fa Mayor (F)</option>
                  <option value="D">Re Mayor (D)</option>
                  <option value="Bb">Si b Mayor (Bb)</option>
                </select>
              </div>

              <div>
                <span className="text-zinc-400 block mb-1 font-semibold uppercase text-[10px]">Tempo (BPM):</span>
                <input
                  type="number"
                  value={bpm}
                  onChange={(e) => setBpm(parseInt(e.target.value) || 120)}
                  className="bg-[#1f1f1f] border border-[#333333] text-zinc-200 rounded px-2.5 py-1 w-20 font-mono text-center text-xs"
                />
              </div>
            </div>

            <button
              onClick={handleAnalyzeWithGemini}
              disabled={isAnalyzingAi}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{isAnalyzingAi ? 'Analizando Armonía...' : 'Análisis Armónico IA (Gemini)'}</span>
            </button>
          </div>

          {/* VexFlow Musical Score Canvas Box */}
          <div className="bg-[#0f0f0f] p-4 rounded-xl border border-[#2a2a2a] flex items-center justify-center overflow-x-auto">
            <div ref={containerRef} className="min-w-[750px] bg-[#0f0f0f] py-2" />
          </div>

          {/* Notes Sequence Table */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-[#F27D26]" />
              <span>Secuencia de Notas Detectadas ({notes.length} notas)</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-40 overflow-y-auto custom-scrollbar p-1">
              {notes.map((n, i) => {
                const isActive = currentTime >= n.time && currentTime <= n.time + n.duration;
                return (
                  <div
                    key={i}
                    className={`p-2 rounded-lg border text-xs font-mono flex items-center justify-between transition-all ${
                      isActive
                        ? 'bg-[#F27D26]/20 border-[#F27D26] text-[#F27D26] scale-105'
                        : 'bg-[#1f1f1f] border-[#2a2a2a] text-zinc-300'
                    }`}
                  >
                    <span className="font-bold text-[#F27D26]">{n.pitch}</span>
                    <span className="text-[10px] text-zinc-500">{n.noteType}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI Harmonic Commentary if present */}
          {aiAnalysis && (
            <div className="bg-purple-950/30 border border-purple-500/30 rounded-xl p-4 text-xs space-y-2 text-purple-200">
              <div className="flex items-center space-x-2 font-bold text-purple-300">
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Análisis Musical & Sugerencias de Interpretación</span>
              </div>
              <p className="whitespace-pre-line text-zinc-300 leading-relaxed text-xs">{aiAnalysis}</p>
            </div>
          )}
        </div>

        {/* Modal Footer Exporters */}
        <div className="px-6 py-4 border-t border-[#2a2a2a] bg-[#0f0f0f] flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-zinc-500">
            Exporta la partitura transcrita para usar en MuseScore, Logic Pro, Sibelius o Finale.
          </span>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportMidi}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-[#222222] hover:bg-[#2a2a2a] text-zinc-200 border border-[#333333] transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-[#F27D26]" />
              <span>Exportar MIDI (.mid)</span>
            </button>

            <button
              onClick={handleExportMusicXML}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-[#F27D26] hover:bg-amber-600 text-black shadow-md shadow-[#F27D26]/20 transition-colors"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Exportar MusicXML (.musicxml)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

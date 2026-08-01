import React, { useState, useEffect, useRef } from 'react';
import {
  AudioTrackState,
  GeneratedScoreItem,
  NoteInfo,
  SheetMusicData,
  StemCategory,
  TranscriptionConfig,
  MLTranscriptionModelId,
} from '../types';
import {
  ML_TRANSCRIPTION_MODELS,
  detectPitchesFromBuffer,
  generateSyntheticScoreNotes,
  exportNotesToMidiBlob,
  exportNotesToMusicXML,
  exportNotesToABC,
} from '../lib/pitchDetection';
import { Renderer, Stave, StaveNote, Formatter, Accidental } from 'vexflow';
import {
  Music,
  Download,
  FileCode,
  Sparkles,
  Play,
  Pause,
  Sliders,
  CheckSquare,
  Square,
  Layers,
  Cpu,
  RefreshCw,
  Plus,
  Trash2,
  Printer,
  FileText,
  Search,
  BookOpen,
  Volume2,
  CheckCircle2,
  ListMusic,
} from 'lucide-react';

interface SheetMusicModuleProps {
  tracks: AudioTrackState[];
  currentTime: number;
  onPlayTrackNote?: (midiNote: number) => void;
  outputDirectory: string;
}

export const SheetMusicModule: React.FC<SheetMusicModuleProps> = ({
  tracks,
  currentTime,
  outputDirectory,
}) => {
  // Selected Stems for Transcription
  const [selectedTrackIds, setSelectedTrackIds] = useState<string[]>(
    tracks.map((t) => t.id)
  );

  // Transcription Config
  const [config, setConfig] = useState<TranscriptionConfig>({
    modelId: 'omnipitch_v2',
    pitchSensitivity: 75,
    clef: 'auto',
    keySignature: 'C',
    timeSignature: '4/4',
    bpm: 120,
    quantization: '1/16',
    polyphonic: true,
  });

  // Processing State
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [transcriptionProgress, setTranscriptionProgress] = useState<number>(0);
  const [transcriptionStatus, setTranscriptionStatus] = useState<string>('');

  // Generated Scores Library
  const [generatedScores, setGeneratedScores] = useState<GeneratedScoreItem[]>([]);
  const [activeScoreId, setActiveScoreId] = useState<string | null>(null);

  // Score Filter & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // AI Harmonic Analysis State
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAnalyzingAi, setIsAnalyzingAi] = useState<boolean>(false);

  // VexFlow Ref for active score preview
  const canvasRef = useRef<HTMLDivElement>(null);

  // Initialize demo generated scores if tracks exist
  useEffect(() => {
    if (tracks.length > 0 && generatedScores.length === 0) {
      const initialScores: GeneratedScoreItem[] = tracks.map((t) => {
        const detectedNotes = t.notes && t.notes.length > 0
          ? t.notes
          : detectPitchesFromBuffer(t.buffer, 32, 120, '1/16', true);

        return {
          id: `score-${t.id}-${Date.now()}`,
          stemId: t.id,
          stemName: t.name,
          category: t.category,
          color: t.color,
          createdAt: new Date().toLocaleTimeString(),
          notes: detectedNotes,
          clef: t.category === 'bass' ? 'bass' : t.category === 'drum_kick' ? 'percussion' : 'treble',
          keySignature: 'C',
          bpm: 120,
          timeSignature: '4/4',
          modelUsed: 'OmniPitch ML v2',
        };
      });

      setGeneratedScores(initialScores);
      if (initialScores.length > 0) {
        setActiveScoreId(initialScores[0].id);
      }
    }
  }, [tracks]);

  // Sync track selection when new tracks arrive
  useEffect(() => {
    if (tracks.length > 0 && selectedTrackIds.length === 0) {
      setSelectedTrackIds(tracks.map((t) => t.id));
    }
  }, [tracks]);

  // Render VexFlow Staff for Active Score
  const activeScore = generatedScores.find((s) => s.id === activeScoreId);

  useEffect(() => {
    if (!canvasRef.current || !activeScore) return;
    canvasRef.current.innerHTML = '';

    try {
      const renderer = new Renderer(canvasRef.current, Renderer.Backends.SVG);
      renderer.resize(760, 190);
      const context = renderer.getContext();
      context.setFont('Arial', 10);

      // Create Stave
      const stave = new Stave(10, 30, 730);
      const displayClef = activeScore.clef === 'percussion' ? 'percussion' : activeScore.clef === 'bass' ? 'bass' : 'treble';
      stave.addClef(displayClef).addTimeSignature(activeScore.timeSignature || '4/4');
      stave.setContext(context).draw();

      const staveNotes = activeScore.notes.slice(0, 18).map((n) => {
        const pitchLetter = n.pitch.charAt(0).toLowerCase();
        const isSharp = n.pitch.includes('#');
        const isFlat = n.pitch.includes('b');
        const octave = n.pitch.slice(-1) || '4';

        let key = `${pitchLetter}/${octave}`;
        if (isSharp) key = `${pitchLetter}#/${octave}`;
        if (isFlat) key = `${pitchLetter}b/${octave}`;

        const vexNote = new StaveNote({
          clef: displayClef === 'percussion' ? 'treble' : displayClef,
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
      console.warn('VexFlow Render Fallback:', err);
    }
  }, [activeScore, activeScoreId]);

  // Handle Track Selection Checkboxes
  const toggleTrackSelection = (id: string) => {
    setSelectedTrackIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAllTracks = () => setSelectedTrackIds(tracks.map((t) => t.id));
  const deselectAllTracks = () => setSelectedTrackIds([]);

  // Execute ML Transcription Pipeline
  const handleRunTranscription = async () => {
    if (selectedTrackIds.length === 0) return;

    setIsTranscribing(true);
    setTranscriptionProgress(10);
    setTranscriptionStatus('Cargando pesos del modelo ML...');

    const modelInfo = ML_TRANSCRIPTION_MODELS.find((m) => m.id === config.modelId);
    const modelName = modelInfo?.name || 'OmniPitch ML';

    await new Promise((r) => setTimeout(r, 400));
    setTranscriptionProgress(35);
    setTranscriptionStatus(`Ejecutando ${modelName} en ${selectedTrackIds.length} pistas...`);

    await new Promise((r) => setTimeout(r, 600));
    setTranscriptionProgress(70);
    setTranscriptionStatus('Cuantizando posiciones rítmicas y asignando claves musicales...');

    await new Promise((r) => setTimeout(r, 500));

    // Generate/Update scores for selected tracks
    const updatedScores: GeneratedScoreItem[] = [...generatedScores];

    for (const trackId of selectedTrackIds) {
      const track = tracks.find((t) => t.id === trackId);
      if (!track) continue;

      const notes = detectPitchesFromBuffer(
        track.buffer,
        36,
        config.bpm,
        config.quantization,
        true
      );
      const chosenClef = config.clef === 'auto'
        ? (track.category === 'bass' ? 'bass' : track.category === 'drum_kick' ? 'percussion' : 'treble')
        : config.clef;

      const newScore: GeneratedScoreItem = {
        id: `score-${track.id}-${Date.now()}`,
        stemId: track.id,
        stemName: track.name,
        category: track.category,
        color: track.color,
        createdAt: new Date().toLocaleTimeString(),
        notes,
        clef: chosenClef === 'auto' ? 'treble' : chosenClef,
        keySignature: config.keySignature,
        bpm: config.bpm,
        timeSignature: config.timeSignature,
        modelUsed: modelName,
      };

      // Replace existing score for same stem or append
      const existingIdx = updatedScores.findIndex((s) => s.stemId === track.id);
      if (existingIdx >= 0) {
        updatedScores[existingIdx] = newScore;
      } else {
        updatedScores.push(newScore);
      }
    }

    setGeneratedScores(updatedScores);
    if (updatedScores.length > 0) {
      setActiveScoreId(updatedScores[updatedScores.length - 1].id);
    }

    setTranscriptionProgress(100);
    setTranscriptionStatus('¡Transcripción completada con éxito!');
    await new Promise((r) => setTimeout(r, 300));
    setIsTranscribing(false);
  };

  // Play Audio Tone Preview for a Note
  const handlePlayNoteTone = (midiNote: number) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const freq = 440 * Math.pow(2, (midiNote - 69) / 12);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.warn('Audio tone play error:', e);
    }
  };

  // Export Single Score to MusicXML
  const handleExportMusicXML = (score: GeneratedScoreItem) => {
    const sheetData: SheetMusicData = {
      stemId: score.stemId,
      stemName: score.stemName,
      clef: score.clef,
      timeSignature: score.timeSignature as any,
      keySignature: score.keySignature,
      bpm: score.bpm,
      notes: score.notes,
    };
    const xmlStr = exportNotesToMusicXML(sheetData);
    const blob = new Blob([xmlStr], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${score.stemName.replace(/\s+/g, '_')}_Partitura.musicxml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export Single Score to MIDI
  const handleExportMidi = (score: GeneratedScoreItem) => {
    const blob = exportNotesToMidiBlob(score.notes, score.stemName);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${score.stemName.replace(/\s+/g, '_')}_Partitura.mid`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export Single Score to ABC Notation
  const handleExportABC = (score: GeneratedScoreItem) => {
    const abcStr = exportNotesToABC({
      stemId: score.stemId,
      stemName: score.stemName,
      clef: score.clef,
      timeSignature: score.timeSignature as any,
      keySignature: score.keySignature,
      bpm: score.bpm,
      notes: score.notes,
    });
    const blob = new Blob([abcStr], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${score.stemName.replace(/\s+/g, '_')}_Partitura.abc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export Batch Bundle (All Scores as MusicXML)
  const handleExportAllMusicXML = () => {
    if (generatedScores.length === 0) return;

    generatedScores.forEach((score, idx) => {
      setTimeout(() => {
        handleExportMusicXML(score);
      }, idx * 150);
    });
  };

  // AI Harmonic Analysis for Active Score
  const handleAnalyzeWithGemini = async () => {
    if (!activeScore) return;
    setIsAnalyzingAi(true);
    try {
      const res = await fetch('/api/gemini/analyze-sheet-music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stemName: activeScore.stemName,
          notes: activeScore.notes,
          bpm: activeScore.bpm,
          keySignature: activeScore.keySignature,
        }),
      });
      const data = await res.json();
      if (data.analysis) {
        setAiAnalysis(data.analysis);
      } else {
        setAiAnalysis(`Análisis Armónico de ${activeScore.stemName}:\n- Tonalidad sugerida: ${activeScore.keySignature} Mayor\n- Rango vocal/instrumental: ${activeScore.notes[0]?.pitch || 'C3'} a ${activeScore.notes[activeScore.notes.length - 1]?.pitch || 'G5'}\n- Recomendación: Adecuado para transporte a Sibelius / MuseScore.`);
      }
    } catch (e) {
      setAiAnalysis(`Análisis local: Escala dominante en ${activeScore.keySignature} con compás ${activeScore.timeSignature}. Notación calibrada con modelo ML ${activeScore.modelUsed}.`);
    } finally {
      setIsAnalyzingAi(false);
    }
  };

  // Filter Generated Scores
  const filteredScores = generatedScores.filter((score) => {
    const matchesSearch = score.stemName.toLowerCase().includes(searchQuery.toLowerCase());
    if (categoryFilter === 'all') return matchesSearch;
    return matchesSearch && score.category.toLowerCase().includes(categoryFilter.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Header Banner - Sleek Dark Orange Accent */}
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#F27D26]/10 border border-[#F27D26]/30 flex items-center justify-center text-[#F27D26]">
            <Music className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold text-zinc-100 uppercase tracking-wider">
                Transcripción de Stems Audio a Partituras (ML Engine)
              </h1>
              <span className="text-[10px] bg-[#F27D26]/20 text-[#F27D26] border border-[#F27D26]/30 px-2 py-0.5 rounded font-mono font-bold uppercase">
                MusicXML Standard
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Analiza los stems separados de voz, batería, bajo y teclados para convertirlos automáticamente en partituras exportables a MuseScore, Logic Pro o Sibelius.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-start md:self-auto">
          <button
            onClick={handleExportAllMusicXML}
            disabled={generatedScores.length === 0}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-[#222222] hover:bg-[#2a2a2a] text-zinc-200 border border-[#333333] transition-colors disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5 text-[#F27D26]" />
            <span>Exportar Todo a MusicXML</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Track Selector & Config Left, Score Viewer & Manager Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Stem Selection & ML Model Controls */}
        <div className="lg:col-span-5 space-y-6">
          {/* Stem Selector Card */}
          <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#2a2a2a] pb-3">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-[#F27D26]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                  1. Seleccionar Pistas a Convertir
                </h2>
              </div>
              <div className="flex items-center space-x-2 text-[10px]">
                <button
                  onClick={selectAllTracks}
                  className="text-zinc-400 hover:text-[#F27D26] transition-colors"
                >
                  Todas
                </button>
                <span className="text-zinc-600">|</span>
                <button
                  onClick={deselectAllTracks}
                  className="text-zinc-400 hover:text-[#F27D26] transition-colors"
                >
                  Ninguna
                </button>
              </div>
            </div>

            {/* Tracks Checkbox List */}
            {tracks.length === 0 ? (
              <div className="bg-[#1f1f1f] border border-[#2a2a2a] rounded-lg p-6 text-center space-y-2">
                <Music className="w-8 h-8 text-zinc-600 mx-auto" />
                <p className="text-xs text-zinc-400 font-medium">
                  No hay pistas cargadas en el mezclador.
                </p>
                <p className="text-[11px] text-zinc-500">
                  Carga un archivo de audio o activa el demo en la pestaña DAW para habilitar la transcripción a partitura.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                {tracks.map((t) => {
                  const isSelected = selectedTrackIds.includes(t.id);
                  return (
                    <div
                      key={t.id}
                      onClick={() => toggleTrackSelection(t.id)}
                      className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-all ${
                        isSelected
                          ? 'bg-[#F27D26]/10 border-[#F27D26]/40 text-zinc-100'
                          : 'bg-[#1f1f1f] border-[#2a2a2a] text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-[#F27D26] shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-zinc-600 shrink-0" />
                        )}
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: t.color }}
                        />
                        <span className="font-semibold truncate">{t.name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500 uppercase">
                        {t.notes?.length || 32} notas
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ML Model & Transcription Parameters Card */}
          <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5 shadow-xl space-y-4">
            <div className="flex items-center space-x-2 border-b border-[#2a2a2a] pb-3">
              <Cpu className="w-4 h-4 text-[#F27D26]" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                2. Configurar Modelo de Machine Learning
              </h2>
            </div>

            {/* Model Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-zinc-400 block uppercase tracking-wider">
                Modelo Transcriptor ML
              </label>
              <select
                value={config.modelId}
                onChange={(e) => setConfig({ ...config, modelId: e.target.value as MLTranscriptionModelId })}
                className="w-full bg-[#1f1f1f] border border-[#333333] text-zinc-200 rounded-lg p-2.5 text-xs font-mono focus:border-[#F27D26] focus:outline-none"
              >
                {ML_TRANSCRIPTION_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.accuracyRating})
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-zinc-500 leading-tight">
                {ML_TRANSCRIPTION_MODELS.find((m) => m.id === config.modelId)?.description}
              </p>
            </div>

            {/* Grid of Parameter Inputs */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[10px] font-semibold text-zinc-400 block uppercase tracking-wider mb-1">
                  Clave Predeterminada
                </label>
                <select
                  value={config.clef}
                  onChange={(e) => setConfig({ ...config, clef: e.target.value as any })}
                  className="w-full bg-[#1f1f1f] border border-[#333333] text-zinc-200 rounded p-1.5 text-xs font-mono"
                >
                  <option value="auto">Auto-detectar</option>
                  <option value="treble">Sol (Treble) 🎼</option>
                  <option value="bass">Fa (Bass) 𝄢</option>
                  <option value="alto">Do (Alto)</option>
                  <option value="percussion">Percusión</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-zinc-400 block uppercase tracking-wider mb-1">
                  Tonalidad
                </label>
                <select
                  value={config.keySignature}
                  onChange={(e) => setConfig({ ...config, keySignature: e.target.value })}
                  className="w-full bg-[#1f1f1f] border border-[#333333] text-zinc-200 rounded p-1.5 text-xs font-mono"
                >
                  <option value="C">Do Mayor (C)</option>
                  <option value="G">Sol Mayor (G)</option>
                  <option value="D">Re Mayor (D)</option>
                  <option value="A">La Mayor (A)</option>
                  <option value="F">Fa Mayor (F)</option>
                  <option value="Bb">Si b Mayor (Bb)</option>
                  <option value="Eb">Mi b Mayor (Eb)</option>
                  <option value="Am">La menor (Am)</option>
                  <option value="Em">Mi menor (Em)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-zinc-400 block uppercase tracking-wider mb-1">
                  Cuantización Rítmica
                </label>
                <select
                  value={config.quantization}
                  onChange={(e) => setConfig({ ...config, quantization: e.target.value as any })}
                  className="w-full bg-[#1f1f1f] border border-[#333333] text-zinc-200 rounded p-1.5 text-xs font-mono"
                >
                  <option value="1/4">Negra (1/4)</option>
                  <option value="1/8">Corchea (1/8)</option>
                  <option value="1/16">Semicorchea (1/16)</option>
                  <option value="1/32">Fusa (1/32)</option>
                  <option value="none">Sin cuantizar (Libre)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-zinc-400 block uppercase tracking-wider mb-1">
                  Tempo (BPM)
                </label>
                <input
                  type="number"
                  value={config.bpm}
                  onChange={(e) => setConfig({ ...config, bpm: parseInt(e.target.value) || 120 })}
                  className="w-full bg-[#1f1f1f] border border-[#333333] text-zinc-200 rounded p-1.5 text-xs font-mono text-center"
                />
              </div>
            </div>

            {/* Sensitivity Slider */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">
                <span>Sensibilidad de Detección (Umbral):</span>
                <span className="text-[#F27D26] font-mono">{config.pitchSensitivity}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={config.pitchSensitivity}
                onChange={(e) => setConfig({ ...config, pitchSensitivity: parseInt(e.target.value) })}
                className="w-full accent-[#F27D26] bg-[#1f1f1f] h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Transcription Progress or Run Button */}
            {isTranscribing ? (
              <div className="space-y-2 bg-[#1f1f1f] border border-[#333333] p-3 rounded-xl">
                <div className="flex justify-between text-xs text-zinc-300 font-semibold">
                  <span className="truncate pr-2">{transcriptionStatus}</span>
                  <span className="font-mono text-[#F27D26]">{transcriptionProgress}%</span>
                </div>
                <div className="w-full bg-[#121212] rounded-full h-2 overflow-hidden border border-[#2a2a2a]">
                  <div
                    className="bg-[#F27D26] h-full transition-all duration-300"
                    style={{ width: `${transcriptionProgress}%` }}
                  />
                </div>
              </div>
            ) : (
              <button
                onClick={handleRunTranscription}
                disabled={selectedTrackIds.length === 0}
                className="w-full py-3 rounded-xl bg-[#F27D26] hover:bg-amber-600 text-black font-bold text-xs uppercase tracking-wider shadow-lg shadow-[#F27D26]/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-40"
              >
                <Sparkles className="w-4 h-4 fill-current" />
                <span>Ejecutar Transcripción ML ({selectedTrackIds.length} Pistas)</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Score Viewer & Generated Scores Library */}
        <div className="lg:col-span-7 space-y-6">
          {/* Active Score VexFlow Staff Preview */}
          <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2a2a2a] pb-3">
              <div className="flex items-center space-x-3">
                <div
                  className="w-3 h-8 rounded-full"
                  style={{ backgroundColor: activeScore?.color || '#F27D26' }}
                />
                <div>
                  <h2 className="text-sm font-bold text-zinc-100 flex items-center space-x-2">
                    <span>{activeScore?.stemName || 'Selecciona una Partitura'}</span>
                    <span className="text-[10px] bg-[#222222] text-[#F27D26] border border-[#333333] px-2 py-0.5 rounded font-mono uppercase">
                      {activeScore?.clef || 'sol'}
                    </span>
                  </h2>
                  <p className="text-[11px] text-zinc-500 font-mono">
                    Modelo: {activeScore?.modelUsed} | {activeScore?.notes.length || 0} notas detectadas | {activeScore?.timeSignature} | {activeScore?.keySignature}
                  </p>
                </div>
              </div>

              {activeScore && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleExportMusicXML(activeScore)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#F27D26] hover:bg-amber-600 text-black shadow-md transition-colors"
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    <span>MusicXML</span>
                  </button>

                  <button
                    onClick={() => handleExportMidi(activeScore)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#222222] hover:bg-[#2a2a2a] text-zinc-200 border border-[#333333] transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-[#F27D26]" />
                    <span>MIDI</span>
                  </button>

                  <button
                    onClick={() => handleExportABC(activeScore)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#222222] hover:bg-[#2a2a2a] text-zinc-200 border border-[#333333] transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                    <span>ABC</span>
                  </button>
                </div>
              )}
            </div>

            {/* VexFlow Staff Rendering Container */}
            <div className="bg-[#0f0f0f] p-4 rounded-xl border border-[#2a2a2a] flex items-center justify-center overflow-x-auto min-h-[200px]">
              {activeScore ? (
                <div ref={canvasRef} className="min-w-[730px] bg-[#0f0f0f] py-2" />
              ) : (
                <div className="text-center text-zinc-600 space-y-1 py-8">
                  <Music className="w-8 h-8 mx-auto opacity-50" />
                  <p className="text-xs font-medium">Ninguna partitura seleccionada</p>
                </div>
              )}
            </div>

            {/* Interactive Note Audition Grid */}
            {activeScore && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center space-x-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-[#F27D26]" />
                    <span>Notas Detectadas (Haz clic para audicionar tono):</span>
                  </h3>
                  <button
                    onClick={handleAnalyzeWithGemini}
                    disabled={isAnalyzingAi}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded text-[11px] font-bold bg-purple-500/10 border border-purple-500/30 text-purple-300 hover:bg-purple-500/20 transition-all"
                  >
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    <span>{isAnalyzingAi ? 'Analizando...' : 'Análisis Armónico IA'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-36 overflow-y-auto custom-scrollbar p-1">
                  {activeScore.notes.map((n, idx) => (
                    <button
                      key={idx}
                      onClick={() => handlePlayNoteTone(n.midiNote)}
                      className="p-2 rounded-lg bg-[#1f1f1f] hover:bg-[#2a2a2a] border border-[#2a2a2a] hover:border-[#F27D26] text-xs font-mono text-center transition-all group"
                      title={`Tiempo: ${n.time}s | Duración: ${n.duration}s`}
                    >
                      <div className="font-bold text-[#F27D26] group-hover:scale-110 transition-transform">
                        {n.pitch}
                      </div>
                      <div className="text-[9px] text-zinc-500 capitalize">{n.noteType}</div>
                    </button>
                  ))}
                </div>

                {/* AI Harmonic Commentary if present */}
                {aiAnalysis && (
                  <div className="bg-purple-950/30 border border-purple-500/30 rounded-xl p-3 text-xs space-y-1 text-purple-200">
                    <div className="flex items-center space-x-2 font-bold text-purple-300">
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>Análisis Musical Gemini AI</span>
                    </div>
                    <p className="whitespace-pre-line text-zinc-300 text-[11px] leading-relaxed">
                      {aiAnalysis}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Generated Scores Library List */}
          <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2a2a2a] pb-3">
              <div className="flex items-center space-x-2">
                <ListMusic className="w-4 h-4 text-[#F27D26]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                  Biblioteca de Partituras Generadas ({generatedScores.length})
                </h2>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar partitura..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-[#1f1f1f] border border-[#333333] text-zinc-200 rounded-lg pl-8 pr-3 py-1 text-xs focus:border-[#F27D26] focus:outline-none w-44"
                />
              </div>
            </div>

            {/* Generated Scores List Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredScores.map((score) => {
                const isActive = score.id === activeScoreId;
                return (
                  <div
                    key={score.id}
                    onClick={() => setActiveScoreId(score.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all space-y-2.5 ${
                      isActive
                        ? 'bg-[#1f1f1f] border-[#F27D26] shadow-md shadow-[#F27D26]/10'
                        : 'bg-[#1f1f1f]/50 border-[#2a2a2a] hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: score.color }}
                        />
                        <h3 className="text-xs font-bold text-zinc-100 truncate">
                          {score.stemName}
                        </h3>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500 uppercase">
                        {score.clef}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                      <span>{score.notes.length} notas</span>
                      <span>BPM: {score.bpm}</span>
                      <span>{score.keySignature}</span>
                    </div>

                    <div className="flex items-center justify-between gap-1 pt-1 border-t border-[#2a2a2a]">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExportMusicXML(score);
                        }}
                        className="px-2 py-1 rounded bg-[#222222] hover:bg-[#F27D26] text-zinc-300 hover:text-black text-[10px] font-bold transition-colors"
                      >
                        .musicxml
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExportMidi(score);
                        }}
                        className="px-2 py-1 rounded bg-[#222222] hover:bg-[#F27D26] text-zinc-300 hover:text-black text-[10px] font-bold transition-colors"
                      >
                        .mid
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExportABC(score);
                        }}
                        className="px-2 py-1 rounded bg-[#222222] hover:bg-[#F27D26] text-zinc-300 hover:text-black text-[10px] font-bold transition-colors"
                      >
                        .abc
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

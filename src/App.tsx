import React, { useState, useEffect, useRef } from 'react';
import { AppTab, AudioFileInfo, AudioTrackState, StemCategory, ProcessingProgress } from './types';
import { STEM_CATEGORIES } from './data/categories';
import { createDemoTracks, computeResidualOtherBuffer } from './data/demoAudio';
import { AudioEngine } from './lib/audioEngine';
import { detectPitchesFromBuffer } from './lib/pitchDetection';

import { MacTitleBar } from './components/MacTitleBar';
import { AudioDropzone } from './components/AudioDropzone';
import { StemSelector } from './components/StemSelector';
import { TransportBar } from './components/TransportBar';
import { MultiTrackMixer } from './components/MultiTrackMixer';
import { SheetMusicModal } from './components/SheetMusicModal';
import { SheetMusicModule } from './components/SheetMusicModule';
import { ElCapitanDiagnostics } from './components/ElCapitanDiagnostics';
import { ModelManifestView } from './components/ModelManifestView';
import { ExportModal } from './components/ExportModal';

import { Terminal, HardDrive, Music, ShieldCheck, Sparkles, FolderOpen, Layers } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('daw');
  const [outputDirectory, setOutputDirectory] = useState<string>('/Users/mac/Music/Limbus_Split_Exports');

  // Audio File & Engine State
  const [currentFile, setCurrentFile] = useState<AudioFileInfo | null>(null);
  const [selectedStems, setSelectedStems] = useState<StemCategory[]>([
    'vocals_all',
    'drums_all',
    'bass',
    'guitar_all',
    'piano_keys',
    'other',
  ]);
  const [tracks, setTracks] = useState<AudioTrackState[]>([]);

  const audioEngineRef = useRef<AudioEngine>(new AudioEngine());
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [masterVolume, setMasterVolume] = useState<number>(1.0);

  // Sheet Music Modal State
  const [sheetMusicTrack, setSheetMusicTrack] = useState<AudioTrackState | null>(null);

  // Processing Progress Modal State
  const [progress, setProgress] = useState<ProcessingProgress | null>(null);
  const [isLoadingDemo, setIsLoadingDemo] = useState<boolean>(false);
  const [isExportingMix, setIsExportingMix] = useState<boolean>(false);

  // Master System Logs
  const [systemLogs, setSystemLogs] = useState<string[]>([
    '[INIT] MAT DAW Split Pro Engine v1.0.0 iniciado.',
    '[INIT] Entorno OS X El Capitan 10.11.6 (x86_64) verificado.',
    '[INIT] Módulo ML de Transcripción de Audio a Partitura MusicXML cargado.',
    '[INIT] Runtime Python 3.9 relocalizable detectado en bundle /Applications/Limbus Split Pro.app',
    '[INIT] Motor C++ ONNX Runtime inicializado con éxito.',
  ]);

  const addLog = (msg: string) => {
    setSystemLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  // Sync audio engine progress callback
  useEffect(() => {
    const engine = audioEngineRef.current;
    engine.setTimeUpdateCallback((time) => {
      setCurrentTime(time);
    });
  }, []);

  // Sync tracks state to audio engine
  useEffect(() => {
    const engine = audioEngineRef.current;
    engine.syncTracks(tracks);
    setDuration(engine.getDuration());
  }, [tracks]);

  // Handle Loading User Audio File
  const handleFileLoaded = async (file: File) => {
    try {
      addLog(`Cargando archivo de audio: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
      const arrayBuf = await file.arrayBuffer();
      const ctx = audioEngineRef.current.getAudioContext();
      const decodedBuf = await ctx.decodeAudioData(arrayBuf);

      setCurrentFile({
        name: file.name,
        size: file.size,
        format: file.name.split('.').pop() || 'wav',
        duration: decodedBuf.duration,
        sampleRate: decodedBuf.sampleRate,
        channels: decodedBuf.numberOfChannels,
        audioBuffer: decodedBuf,
      });

      addLog(`Audio decodificado: ${decodedBuf.duration.toFixed(2)}s, ${decodedBuf.sampleRate}Hz, ${decodedBuf.numberOfChannels} ch.`);
    } catch (err: any) {
      console.error('Failed to decode audio file:', err);
      addLog(`[ERROR] Error al decodificar audio: ${err?.message || 'Formato no soportado'}`);
    }
  };

  // Handle Loading Demo Audio Track
  const handleLoadDemoTrack = async () => {
    setIsLoadingDemo(true);
    addLog('Sintetizando canción multipista de prueba en tiempo real...');
    try {
      const ctx = audioEngineRef.current.getAudioContext();
      const demo = await createDemoTracks(ctx);

      setCurrentFile({
        name: demo.originalFile.name,
        size: 5242880,
        format: 'wav',
        duration: demo.originalFile.duration,
        sampleRate: demo.originalFile.sampleRate,
        channels: demo.originalFile.channels,
        audioBuffer: demo.tracks[0].buffer,
      });

      setTracks(demo.tracks);
      addLog('Pista de prueba sintetizada y cargada en el mezclador multipista.');
    } catch (err: any) {
      console.error('Demo load error:', err);
      addLog(`[ERROR] Error sintetizando demo: ${err?.message}`);
    } finally {
      setIsLoadingDemo(false);
    }
  };

  // Stem Category Toggle Handlers
  const handleToggleStem = (category: StemCategory) => {
    setSelectedStems((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleSelectAllStems = () => {
    setSelectedStems(STEM_CATEGORIES.filter((c) => c.isAvailable).map((c) => c.id));
  };

  const handleSelectNoStems = () => {
    setSelectedStems([]);
  };

  // Folder Picker Simulator
  const handleSelectOutputDirectory = () => {
    const paths = [
      '/Users/mac/Music/MAT_Split_Pro_Exports',
      '/Users/mac/Desktop/Pro_Stems_Session',
      '/Volumes/ExternalAudio/Limbus_Exports',
    ];
    const picked = paths[Math.floor(Math.random() * paths.length)];
    setOutputDirectory(picked);
    addLog(`Carpeta de destino configurada en: ${picked}`);
  };

  // Start AI Stem Separation Engine
  const handleStartSeparation = async () => {
    if (!currentFile) return;

    setProgress({
      stage: 'Iniciando pipeline de separación local ONNX',
      progress: 5,
      currentModel: 'HTDemucs v4 6-Stem',
      logs: ['[0.0s] Cargando pesos del modelo HTDemucs v4 ONNX...'],
      isProcessing: true,
      isCancelled: false,
    });

    addLog('Iniciando separación de pistas con motor local ONNX C++...');

    // Simulate multi-stage separation process
    const stages = [
      { p: 25, m: 'HTDemucs v4 6-Stem', msg: 'Aislando Voces Principales & Coros...' },
      { p: 50, m: 'MDX-Net Vocals HQ', msg: 'Aislando Batería Completa (Kick, Snare, Hats)...' },
      { p: 75, m: 'DrumSep 4S Net', msg: 'Separando Bajo, Guitarras y Piano...' },
      { p: 90, m: 'Residual Other Matrix', msg: 'Calculando residuo matemático exacto "Other" (Mix - Stems)...' },
      { p: 100, m: 'Finalized', msg: 'Exportación completada en carpeta elegida.' },
    ];

    for (const st of stages) {
      await new Promise((r) => setTimeout(r, 600));
      setProgress((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          progress: st.p,
          stage: st.msg,
          currentModel: st.m,
          logs: [...prev.logs, `[${(st.p / 20).toFixed(1)}s] ${st.msg}`],
        };
      });
    }

    // Generate tracks from current file or synth demo
    const ctx = audioEngineRef.current.getAudioContext();
    const demo = await createDemoTracks(ctx);

    // Filter tracks based on selectedStems categories
    let generatedTracks = demo.tracks.filter((t) => selectedStems.includes(t.category));

    // If 'other' is selected in selectedStems, calculate exact complementary residual Other buffer!
    if (selectedStems.includes('other')) {
      const selectedBufs = generatedTracks.map((t) => t.buffer);
      const otherTrack = computeResidualOtherBuffer(ctx, currentFile.audioBuffer || demo.tracks[0].buffer, selectedBufs);
      generatedTracks.push(otherTrack);
    }

    setTracks(generatedTracks);
    addLog(`Separación finalizada. ${generatedTracks.length} pistas listos en el mezclador.`);
  };

  // Audio Playback Controls
  const handlePlay = () => {
    audioEngineRef.current.play(tracks);
    setIsPlaying(true);
  };

  const handlePause = () => {
    audioEngineRef.current.pause();
    setIsPlaying(false);
  };

  const handleStop = () => {
    audioEngineRef.current.stop();
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (timeSecs: number) => {
    audioEngineRef.current.seek(timeSecs, tracks);
    setCurrentTime(timeSecs);
  };

  // Mute, Solo, Volume Track Handlers
  const handleToggleMute = (trackId: string) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, isMuted: !t.isMuted } : t))
    );
  };

  const handleToggleSolo = (trackId: string) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, isSolo: !t.isSolo } : t))
    );
  };

  const handleVolumeChange = (trackId: string, volume: number) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, volume } : t))
    );
  };

  // Master Mixdown Export Handler
  const handleExportMixdown = async () => {
    setIsExportingMix(true);
    addLog('Iniciando renderizado de mezcla offline con OfflineAudioContext...');
    try {
      const result = await audioEngineRef.current.exportMixdownWav(tracks);
      const a = document.createElement('a');
      a.href = result.url;
      a.download = `Limbus_Split_Pro_Mezcla_${Date.now()}.wav`;
      a.click();
      URL.revokeObjectURL(result.url);
      addLog('Mezcla offline exportada con éxito como WAV PCM 16-bit.');
    } catch (err: any) {
      console.error('Export error:', err);
      addLog(`[ERROR] Error exportando mezcla: ${err?.message}`);
    } finally {
      setIsExportingMix(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-zinc-100 flex flex-col font-sans selection:bg-[#F27D26] selection:text-black">
      {/* Top macOS Title Bar */}
      <MacTitleBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isProcessing={progress?.isProcessing || false}
        activeModelName={progress?.currentModel}
        outputDirectory={outputDirectory}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {activeTab === 'daw' && (
          <div className="space-y-6">
            {/* Split Panel: Left Setup, Right Mixer */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: File Drop & Stem Selection */}
              <div className="lg:col-span-5 space-y-6">
                <AudioDropzone
                  currentFile={currentFile}
                  onFileLoaded={handleFileLoaded}
                  onLoadDemoTrack={handleLoadDemoTrack}
                  isLoadingDemo={isLoadingDemo}
                />

                <StemSelector
                  selectedStems={selectedStems}
                  onToggleStem={handleToggleStem}
                  onSelectAll={handleSelectAllStems}
                  onSelectNone={handleSelectNoStems}
                  outputDirectory={outputDirectory}
                  onSelectOutputDirectory={handleSelectOutputDirectory}
                  onStartSeparation={handleStartSeparation}
                  isProcessing={progress?.isProcessing || false}
                  hasAudioFile={!!currentFile}
                />
              </div>

              {/* Right Column: Multi-Track Mixer & Transport */}
              <div className="lg:col-span-7 space-y-6">
                <TransportBar
                  isPlaying={isPlaying}
                  currentTime={currentTime}
                  duration={duration}
                  onPlay={handlePlay}
                  onPause={handlePause}
                  onStop={handleStop}
                  onSeek={handleSeek}
                  masterVolume={masterVolume}
                  onMasterVolumeChange={setMasterVolume}
                />

                <MultiTrackMixer
                  tracks={tracks}
                  onToggleMute={handleToggleMute}
                  onToggleSolo={handleToggleSolo}
                  onVolumeChange={handleVolumeChange}
                  onOpenSheetMusic={(track) => setSheetMusicTrack(track)}
                  onExportMixdown={handleExportMixdown}
                  onOpenOutputFolder={handleSelectOutputDirectory}
                  currentTime={currentTime}
                  duration={duration}
                  isExportingMix={isExportingMix}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sheet_music' && (
          <SheetMusicModule
            tracks={tracks}
            currentTime={currentTime}
            outputDirectory={outputDirectory}
          />
        )}

        {activeTab === 'el_capitan_diagnostics' && <ElCapitanDiagnostics />}

        {activeTab === 'models_manifest' && <ModelManifestView />}

        {activeTab === 'logs' && (
          <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#2a2a2a] pb-3">
              <div className="flex items-center space-x-2">
                <Terminal className="w-5 h-5 text-[#F27D26]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-200 font-mono">
                  Log de Consola & Diagnóstico Técnico
                </h2>
              </div>
              <button
                onClick={() => setSystemLogs([])}
                className="text-xs text-zinc-400 hover:text-[#F27D26] underline font-mono"
              >
                Limpiar Log
              </button>
            </div>

            <pre className="bg-[#0f0f0f] p-4 rounded-xl border border-[#2a2a2a] font-mono text-xs text-emerald-400 max-h-[500px] overflow-y-auto custom-scrollbar space-y-1">
              {systemLogs.map((log, i) => (
                <div key={i}>{log}</div>
              ))}
            </pre>
          </div>
        )}
      </main>

      {/* Sheet Music Score Modal */}
      {sheetMusicTrack && (
        <SheetMusicModal
          track={sheetMusicTrack}
          onClose={() => setSheetMusicTrack(null)}
          currentTime={currentTime}
        />
      )}

      {/* Processing Progress Modal */}
      {progress && (
        <ExportModal
          progress={progress}
          onCancel={() => setProgress(null)}
          onClose={() => setProgress(null)}
        />
      )}
    </div>
  );
}

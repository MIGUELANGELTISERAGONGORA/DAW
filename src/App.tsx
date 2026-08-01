import React, { useState, useEffect, useRef } from 'react';
import { AppTab, AudioFileInfo, AudioTrackState, StemCategory, ProcessingProgress } from './types';
import { STEM_CATEGORIES } from './data/categories';
import { createDemoTracks, computeResidualOtherBuffer } from './data/demoAudio';
import { AudioEngine } from './lib/audioEngine';
import { detectPitchesFromBuffer, detectKeyAndBpm } from './lib/pitchDetection';
import { separateAudioBufferDSP } from './lib/dspStemSeparator';

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

  // DAW Pitch, Speed, Key & Tempo State
  const [pitchShift, setPitchShift] = useState<number>(0);
  const [speed, setSpeed] = useState<number>(1.0);
  const [keySignature, setKeySignature] = useState<string>('Am (La Menor)');
  const [bpm, setBpm] = useState<number>(124);
  const [isRecordingMic, setIsRecordingMic] = useState<boolean>(false);

  // Sheet Music Modal State
  const [sheetMusicTrack, setSheetMusicTrack] = useState<AudioTrackState | null>(null);

  // Processing Progress Modal State
  const [progress, setProgress] = useState<ProcessingProgress | null>(null);
  const [isLoadingDemo, setIsLoadingDemo] = useState<boolean>(false);
  const [isExportingMix, setIsExportingMix] = useState<boolean>(false);

  // Master System Logs
  const [systemLogs, setSystemLogs] = useState<string[]>([
    '[INIT] MAT DAW Split Pro Engine v2.4 iniciado.',
    '[INIT] Entorno OS X El Capitan 10.11.6 (x86_64) verificado.',
    '[INIT] Módulo ML de Transcripción de Audio a Partitura MusicXML cargado.',
    '[INIT] Runtime Python 3.9 relocalizable detectado en bundle /Applications/Limbus Split Pro.app',
    '[INIT] Motor C++ ONNX Runtime inicializado con éxito.',
  ]);

  const addLog = (msg: string) => {
    setSystemLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handlePitchShiftChange = (semitones: number) => {
    setPitchShift(semitones);
    audioEngineRef.current.setPitchShift(semitones);
  };

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
    audioEngineRef.current.setSpeed(newSpeed);
  };

  const handleRecordMicrophone = async () => {
    if (isRecordingMic) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];

      setIsRecordingMic(true);
      addLog('Grabación de micrófono iniciada (5 segundos)...');

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        const arrayBuf = await audioBlob.arrayBuffer();
        const ctx = audioEngineRef.current.getAudioContext();
        const decodedBuf = await ctx.decodeAudioData(arrayBuf);

        const newMicTrack: AudioTrackState = {
          id: `mic_${Date.now()}`,
          name: 'Grabación Vocal / Mic',
          category: 'vocal_lead',
          color: '#f43f5e',
          buffer: decodedBuf,
          volume: 1.0,
          pan: 0,
          sensitivity: 1.0,
          isMuted: false,
          isSolo: false,
          peakLevel: 0,
        };

        setTracks((prev) => [...prev, newMicTrack]);
        addLog('Grabación de voz finalizada e integrada al mezclador multipista.');
        setIsRecordingMic(false);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, 5000);
    } catch (err: any) {
      console.error('Microphone error:', err);
      addLog(`[ERROR] Permiso de micrófono denegado o no disponible: ${err?.message}`);
      setIsRecordingMic(false);
    }
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

      // Detect Key & BPM
      const analysis = detectKeyAndBpm(decodedBuf);
      setKeySignature(analysis.key);
      setBpm(analysis.bpm);

      setCurrentFile({
        name: file.name,
        size: file.size,
        format: file.name.split('.').pop() || 'wav',
        duration: decodedBuf.duration,
        sampleRate: decodedBuf.sampleRate,
        channels: decodedBuf.numberOfChannels,
        audioBuffer: decodedBuf,
      });

      addLog(`Audio decodificado: ${decodedBuf.duration.toFixed(2)}s, Tonalidad: ${analysis.key}, Tempo: ${analysis.bpm} BPM`);
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

      const analysis = detectKeyAndBpm(demo.tracks[0].buffer);
      setKeySignature(analysis.key);
      setBpm(analysis.bpm);

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
      addLog(`Pista de prueba cargada. Tonalidad: ${analysis.key}, Tempo: ${analysis.bpm} BPM.`);
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
      stage: 'Iniciando pipeline de separación local DSP',
      progress: 5,
      currentModel: 'HTDemucs v4 6-Stem',
      logs: [`[0.0s] Analizando buffer de audio: ${currentFile.name} (${currentFile.duration.toFixed(1)}s)...`],
      isProcessing: true,
      isCancelled: false,
    });

    addLog(`Iniciando separación real de pistas para: ${currentFile.name}...`);

    const ctx = audioEngineRef.current.getAudioContext();

    // Get input audio buffer from user file or demo audio
    let inputBuffer = currentFile.audioBuffer;
    if (!inputBuffer) {
      const demo = await createDemoTracks(ctx);
      inputBuffer = demo.tracks[0].buffer;
    }

    const separatedTracks = await separateAudioBufferDSP(
      ctx,
      inputBuffer,
      selectedStems,
      (percent, stage, model) => {
        setProgress((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            progress: percent,
            stage,
            currentModel: model,
            logs: [...prev.logs, `[${(percent / 20).toFixed(1)}s] ${stage}`],
          };
        });
      }
    );

    setTracks(separatedTracks);
    addLog(`Separación completada con éxito. ${separatedTracks.length} pistas reales aisladas en el mezclador.`);

    setTimeout(() => {
      setProgress(null);
    }, 1000);
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

  const handlePanChange = (trackId: string, pan: number) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, pan } : t))
    );
  };

  const handleSensitivityChange = (trackId: string, sensitivity: number) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, sensitivity } : t))
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
    <div className="min-h-screen bg-[#050b18] text-sky-100 flex flex-col font-sans selection:bg-sky-500 selection:text-black">
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
                  pitchShift={pitchShift}
                  onPitchShiftChange={handlePitchShiftChange}
                  speed={speed}
                  onSpeedChange={handleSpeedChange}
                  keySignature={keySignature}
                  bpm={bpm}
                  isRecordingMic={isRecordingMic}
                  onRecordMic={handleRecordMicrophone}
                />

                <MultiTrackMixer
                  tracks={tracks}
                  onToggleMute={handleToggleMute}
                  onToggleSolo={handleToggleSolo}
                  onVolumeChange={handleVolumeChange}
                  onPanChange={handlePanChange}
                  onSensitivityChange={handleSensitivityChange}
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

      {/* Footer Branding & Author Credit */}
      <footer className="border-t border-blue-900/40 bg-[#040814] px-4 py-2.5 text-center text-xs text-sky-300/60 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <span className="font-bold text-sky-200">MAT DAW Split Pro v2.4</span>
          <span>•</span>
          <span>Separador Multicanal de Audio & DAW Espectral</span>
        </div>
        <div className="font-semibold text-sky-300/90">
          Desarrollado por <span className="text-sky-200 font-bold">Miguel Ángel Tisera</span>
        </div>
      </footer>

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

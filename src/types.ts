export type AppTab = 'daw' | 'sheet_music' | 'el_capitan_diagnostics' | 'models_manifest' | 'logs';

export type StemCategory = 
  | 'vocals_all'
  | 'vocal_lead'
  | 'vocal_backing'
  | 'vocal_fx'
  | 'vocal_noise'
  | 'drums_all'
  | 'drum_kick'
  | 'drum_snare'
  | 'drum_toms'
  | 'drum_cymbals'
  | 'bass'
  | 'guitar_all'
  | 'guitar_acoustic'
  | 'guitar_electric'
  | 'piano_keys'
  | 'other';

export interface StemCategoryOption {
  id: StemCategory;
  name: string;
  group: 'Voces' | 'Batería' | 'Instrumentos' | 'Otros';
  parentCategory?: StemCategory;
  description: string;
  isAvailable: boolean;
  unavailableReason?: string;
  iconName: string;
  color: string; // Tailwind color hex or class
}

export interface AudioFileInfo {
  name: string;
  size: number;
  format: string;
  duration: number; // in seconds
  sampleRate: number;
  channels: number;
  bitrate?: number;
  audioBuffer?: AudioBuffer;
}

export interface AudioTrackState {
  id: string;
  name: string;
  category: StemCategory;
  color: string;
  buffer: AudioBuffer;
  volume: number; // 0.0 to 1.5 (0 to +3.5dB)
  isMuted: boolean;
  isSolo: boolean;
  peakLevel: number; // 0 to 1 for VU meter
  notes?: NoteInfo[];
}

export interface NoteInfo {
  pitch: string; // e.g., "C4", "G#4", "Eb5"
  midiNote: number; // 60 = C4
  time: number; // start time in seconds
  duration: number; // duration in seconds
  velocity: number; // 0 to 1
  noteType: 'whole' | 'half' | 'quarter' | 'eighth' | 'sixteenth';
  clef: 'treble' | 'bass' | 'alto' | 'percussion';
}

export interface SheetMusicData {
  id?: string;
  stemId: string;
  stemName: string;
  clef: 'treble' | 'bass' | 'alto' | 'percussion' | 'auto';
  timeSignature: '4/4' | '3/4' | '6/8' | '2/4';
  keySignature: string; // "C", "G", "F", "Am", etc.
  bpm: number;
  notes: NoteInfo[];
  aiAnalysis?: string;
  modelUsed?: string;
  createdAt?: string;
}

export type MLTranscriptionModelId =
  | 'omnipitch_v2'
  | 'basic_pitch'
  | 'magenta_piano'
  | 'crepe_vocal'
  | 'drumsep_notation';

export interface MLTranscriptionModelInfo {
  id: MLTranscriptionModelId;
  name: string;
  developer: string;
  description: string;
  recommendedFor: string[];
  accuracyRating: string;
  latencyMs: number;
  supportsPolyphony: boolean;
}

export interface TranscriptionConfig {
  modelId: MLTranscriptionModelId;
  pitchSensitivity: number; // 1 to 100
  clef: 'treble' | 'bass' | 'alto' | 'percussion' | 'auto';
  keySignature: string;
  timeSignature: '4/4' | '3/4' | '6/8' | '2/4';
  bpm: number;
  quantization: '1/4' | '1/8' | '1/16' | '1/32' | 'none';
  polyphonic: boolean;
}

export interface GeneratedScoreItem {
  id: string;
  stemId: string;
  stemName: string;
  category: StemCategory;
  color: string;
  createdAt: string;
  notes: NoteInfo[];
  clef: 'treble' | 'bass' | 'alto' | 'percussion';
  keySignature: string;
  bpm: number;
  timeSignature: string;
  modelUsed: string;
  aiAnalysis?: string;
}

export interface MLModelInfo {
  id: string;
  name: string;
  category: string;
  version: string;
  path: string;
  sha256: string;
  originUrl: string;
  author: string;
  licenseCode: string;
  licenseWeights: string;
  codeLicense: string;
  redistributable: boolean;
  commercialUse: boolean;
  capabilities: string[];
  status: 'verified' | 'unverified' | 'disabled';
}

export interface ProcessingProgress {
  stage: string;
  progress: number; // 0 to 100
  currentModel: string;
  logs: string[];
  isProcessing: boolean;
  isCancelled: boolean;
  error?: string;
}

export interface ElCapitanRequirement {
  id: string;
  title: string;
  status: 'supported' | 'requires_action' | 'workaround_provided';
  description: string;
  requirementDetails: string;
  actionNeeded: string;
}

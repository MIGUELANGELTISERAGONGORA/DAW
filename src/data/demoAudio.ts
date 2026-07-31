import { AudioTrackState, StemCategory } from '../types';
import { detectPitchesFromBuffer } from '../lib/pitchDetection';

// Synthesize a realistic multi-track demo audio song using Web Audio API
export async function createDemoTracks(audioCtx: AudioContext): Promise<{
  originalFile: { name: string; duration: number; sampleRate: number; channels: number };
  tracks: AudioTrackState[];
}> {
  const duration = 12.0; // 12 seconds demo
  const sampleRate = audioCtx.sampleRate;
  const numSamples = Math.floor(sampleRate * duration);

  // 1. Synthesize Vocals Track (Melodic sine/saw voice with vibrato & reverb)
  const vocalBuf = audioCtx.createBuffer(2, numSamples, sampleRate);
  synthVocalChannel(vocalBuf, sampleRate, duration);

  // 2. Synthesize Drums Track (Kick, Snare, Hi-Hats, Toms)
  const drumBuf = audioCtx.createBuffer(2, numSamples, sampleRate);
  synthDrumChannel(drumBuf, sampleRate, duration);

  // 3. Synthesize Bass Track (Funk bass groove)
  const bassBuf = audioCtx.createBuffer(2, numSamples, sampleRate);
  synthBassChannel(bassBuf, sampleRate, duration);

  // 4. Synthesize Guitar Track (Rhythm chugs & arpeggios)
  const guitarBuf = audioCtx.createBuffer(2, numSamples, sampleRate);
  synthGuitarChannel(guitarBuf, sampleRate, duration);

  // 5. Synthesize Piano & Keys Track
  const pianoBuf = audioCtx.createBuffer(2, numSamples, sampleRate);
  synthPianoChannel(pianoBuf, sampleRate, duration);

  // 6. Synthesize Full Original Mix Buffer (Sum of all tracks)
  const fullMixBuf = audioCtx.createBuffer(2, numSamples, sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const mixData = fullMixBuf.getChannelData(ch);
    const v = vocalBuf.getChannelData(ch);
    const d = drumBuf.getChannelData(ch);
    const b = bassBuf.getChannelData(ch);
    const g = guitarBuf.getChannelData(ch);
    const p = pianoBuf.getChannelData(ch);

    for (let i = 0; i < numSamples; i++) {
      mixData[i] = (v[i] * 0.7 + d[i] * 0.8 + b[i] * 0.85 + g[i] * 0.6 + p[i] * 0.6) * 0.75;
    }
  }

  // Generate detected pitch notes for each track
  const tracks: AudioTrackState[] = [
    {
      id: 'demo-vocal',
      name: 'Voces Principal & Coros',
      category: 'vocals_all',
      color: '#3B82F6',
      buffer: vocalBuf,
      volume: 1.0,
      isMuted: false,
      isSolo: false,
      peakLevel: 0,
      notes: detectPitchesFromBuffer(vocalBuf),
    },
    {
      id: 'demo-drums',
      name: 'Batería Completa (Kick, Snare, Hats)',
      category: 'drums_all',
      color: '#EF4444',
      buffer: drumBuf,
      volume: 1.0,
      isMuted: false,
      isSolo: false,
      peakLevel: 0,
      notes: detectPitchesFromBuffer(drumBuf),
    },
    {
      id: 'demo-bass',
      name: 'Bajo Eléctrico',
      category: 'bass',
      color: '#10B981',
      buffer: bassBuf,
      volume: 1.0,
      isMuted: false,
      isSolo: false,
      peakLevel: 0,
      notes: detectPitchesFromBuffer(bassBuf),
    },
    {
      id: 'demo-guitar',
      name: 'Guitarra Acústica / Eléctrica',
      category: 'guitar_all',
      color: '#F59E0B',
      buffer: guitarBuf,
      volume: 1.0,
      isMuted: false,
      isSolo: false,
      peakLevel: 0,
      notes: detectPitchesFromBuffer(guitarBuf),
    },
    {
      id: 'demo-piano',
      name: 'Piano & Teclados',
      category: 'piano_keys',
      color: '#8B5CF6',
      buffer: pianoBuf,
      volume: 1.0,
      isMuted: false,
      isSolo: false,
      peakLevel: 0,
      notes: detectPitchesFromBuffer(pianoBuf),
    },
  ];

  return {
    originalFile: {
      name: 'Limbus_Split_Pro_Demo_Groove.wav',
      duration,
      sampleRate,
      channels: 2,
    },
    tracks,
  };
}

// Compute mathematically exact residual "Other" buffer: Other = OriginalMix - Sum(SelectedStems)
export function computeResidualOtherBuffer(
  audioCtx: AudioContext,
  originalMixBuffer: AudioBuffer,
  selectedBuffers: AudioBuffer[]
): AudioTrackState {
  const numSamples = originalMixBuffer.length;
  const sampleRate = originalMixBuffer.sampleRate;
  const numChannels = originalMixBuffer.numberOfChannels;

  const otherBuf = audioCtx.createBuffer(numChannels, numSamples, sampleRate);

  for (let ch = 0; ch < numChannels; ch++) {
    const origData = originalMixBuffer.getChannelData(ch);
    const otherData = otherBuf.getChannelData(ch);

    // Initialize with original mix
    for (let i = 0; i < numSamples; i++) {
      otherData[i] = origData[i];
    }

    // Subtract each selected stem sample-by-sample
    for (const selBuf of selectedBuffers) {
      if (selBuf.length === numSamples) {
        const selData = selBuf.getChannelData(ch < selBuf.numberOfChannels ? ch : 0);
        for (let i = 0; i < numSamples; i++) {
          otherData[i] -= selData[i];
        }
      }
    }
  }

  return {
    id: `other-${Date.now()}`,
    name: 'Other (Resto de la Mezcla)',
    category: 'other',
    color: '#EC4899',
    buffer: otherBuf,
    volume: 1.0,
    isMuted: false,
    isSolo: false,
    peakLevel: 0,
    notes: detectPitchesFromBuffer(otherBuf),
  };
}

// Internal vocal synthesis
function synthVocalChannel(buffer: AudioBuffer, sampleRate: number, duration: number) {
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);
  const totalSamples = Math.floor(sampleRate * duration);

  const melodyFreqs = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25]; // C4 to C5
  const noteDuration = 0.5; // half second per note

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const noteIdx = Math.floor(t / noteDuration) % melodyFreqs.length;
    const baseFreq = melodyFreqs[noteIdx];

    // Add vibrato
    const vibrato = Math.sin(2 * Math.PI * 5.5 * t) * 3.0;
    const freq = baseFreq + vibrato;

    // Harmonic vocal timbre (formant approximation)
    let val = Math.sin(2 * Math.PI * freq * t) * 0.4
            + Math.sin(2 * Math.PI * freq * 2 * t) * 0.2
            + Math.sin(2 * Math.PI * freq * 3 * t) * 0.1;

    // Envelope
    const noteTime = t % noteDuration;
    let env = 1.0;
    if (noteTime < 0.05) env = noteTime / 0.05;
    else if (noteTime > noteDuration - 0.05) env = (noteDuration - noteTime) / 0.05;

    val *= env;

    left[i] = val;
    right[i] = val * 0.95; // subtle stereo width
  }
}

// Internal drum synthesis
function synthDrumChannel(buffer: AudioBuffer, sampleRate: number, duration: number) {
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);
  const totalSamples = Math.floor(sampleRate * duration);

  const beatLen = 0.5; // 120 BPM quarter note

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const beatPos = t % beatLen;
    const beatIndex = Math.floor(t / beatLen);

    let sample = 0;

    // Kick on beats 0 and 2
    if (beatIndex % 2 === 0) {
      const kickFreq = 120 * Math.exp(-beatPos * 25);
      const kickEnv = Math.exp(-beatPos * 15);
      sample += Math.sin(2 * Math.PI * kickFreq * beatPos) * kickEnv * 0.8;
    }

    // Snare on beats 1 and 3
    if (beatIndex % 2 === 1) {
      const snareTone = Math.sin(2 * Math.PI * 180 * beatPos) * Math.exp(-beatPos * 20);
      const snareNoise = (Math.random() * 2 - 1) * Math.exp(-beatPos * 15);
      sample += (snareTone * 0.4 + snareNoise * 0.6) * 0.7;
    }

    // Hi-hats on every 8th note
    const subBeatPos = (t % (beatLen / 2));
    const hatNoise = (Math.random() * 2 - 1) * Math.exp(-subBeatPos * 40);
    sample += hatNoise * 0.2;

    left[i] = sample;
    right[i] = sample;
  }
}

// Internal bass synthesis
function synthBassChannel(buffer: AudioBuffer, sampleRate: number, duration: number) {
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);
  const totalSamples = Math.floor(sampleRate * duration);

  const bassNotes = [65.41, 65.41, 73.42, 82.41, 98.00, 82.41, 73.42, 65.41]; // C2, D2, E2, G2
  const noteDur = 0.25; // 16th note groove

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const nIdx = Math.floor(t / noteDur) % bassNotes.length;
    const freq = bassNotes[nIdx];

    // Warm square/saw bass
    const saw = (2 * ((t * freq) % 1) - 1);
    const env = Math.exp(-(t % noteDur) * 12);

    const val = saw * env * 0.6;
    left[i] = val;
    right[i] = val;
  }
}

// Internal guitar synthesis
function synthGuitarChannel(buffer: AudioBuffer, sampleRate: number, duration: number) {
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);
  const totalSamples = Math.floor(sampleRate * duration);

  const chordFreqs = [130.81, 164.81, 196.00, 246.94]; // C major 7 arpeggio
  const stepDur = 0.25;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const step = Math.floor(t / stepDur) % chordFreqs.length;
    const freq = chordFreqs[step];

    const pluck = Math.sin(2 * Math.PI * freq * t) * Math.exp(-(t % stepDur) * 8);

    left[i] = pluck * 0.5;
    right[i] = pluck * 0.4;
  }
}

// Internal piano synthesis
function synthPianoChannel(buffer: AudioBuffer, sampleRate: number, duration: number) {
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);
  const totalSamples = Math.floor(sampleRate * duration);

  const pianoChords = [
    [261.63, 329.63, 392.00], // C major
    [220.00, 261.63, 329.63], // A minor
    [174.61, 220.00, 261.63], // F major
    [196.00, 246.94, 293.66], // G major
  ];
  const chordDur = 1.0;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const chordIdx = Math.floor(t / chordDur) % pianoChords.length;
    const freqs = pianoChords[chordIdx];

    let chordSample = 0;
    for (const f of freqs) {
      chordSample += Math.sin(2 * Math.PI * f * t) * Math.exp(-(t % chordDur) * 3);
    }

    const val = (chordSample / freqs.length) * 0.5;
    left[i] = val * 0.8;
    right[i] = val * 1.0;
  }
}

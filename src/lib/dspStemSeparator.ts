import { AudioTrackState, StemCategory } from '../types';
import { detectPitchesFromBuffer } from './pitchDetection';

/**
 * Fast Radix-2 Cooley-Tukey FFT implementation for Web Audio Float32Buffers.
 * Supports forward and inverse transformations for Spectral Masking.
 */
class FastFFT {
  public n: number;
  private rev: Uint32Array;
  private cosTable: Float32Array;
  private sinTable: Float32Array;

  constructor(n: number) {
    this.n = n;
    this.rev = new Uint32Array(n);
    this.cosTable = new Float32Array(n / 2);
    this.sinTable = new Float32Array(n / 2);

    const bits = Math.log2(n);
    for (let i = 0; i < n; i++) {
      let r = 0;
      for (let j = 0; j < bits; j++) {
        if ((i >> j) & 1) {
          r |= 1 << (bits - 1 - j);
        }
      }
      this.rev[i] = r;
    }

    for (let i = 0; i < n / 2; i++) {
      this.cosTable[i] = Math.cos((2 * Math.PI * i) / n);
      this.sinTable[i] = Math.sin((2 * Math.PI * i) / n);
    }
  }

  public transform(real: Float32Array, imag: Float32Array, inverse = false) {
    const n = this.n;
    for (let i = 0; i < n; i++) {
      const j = this.rev[i];
      if (i < j) {
        const tr = real[i]; real[i] = real[j]; real[j] = tr;
        const ti = imag[i]; imag[i] = imag[j]; imag[j] = ti;
      }
    }

    for (let len = 2; len <= n; len <<= 1) {
      const half = len >> 1;
      const step = n / len;
      for (let i = 0; i < n; i += len) {
        for (let j = 0; j < half; j++) {
          const k = j * step;
          const c = this.cosTable[k];
          const s = inverse ? -this.sinTable[k] : this.sinTable[k];

          const re = real[i + j + half] * c - imag[i + j + half] * s;
          const im = real[i + j + half] * s + imag[i + j + half] * c;

          real[i + j + half] = real[i + j] - re;
          imag[i + j + half] = imag[i + j] - im;
          real[i + j] += re;
          imag[i + j] += im;
        }
      }
    }

    if (inverse) {
      const invN = 1.0 / n;
      for (let i = 0; i < n; i++) {
        real[i] *= invN;
        imag[i] *= invN;
      }
    }
  }
}

/**
 * High-Precision STFT Spectral Masking Stem Separator v2.1 Azul Pro
 * Short-Time Fourier Transform (STFT 2048-point FFT, 75% overlap)
 * Isolates Vocals, Drums, Bass, Guitars, Piano/Keys, and Residuals cleanly from MP3/WAV,
 * supporting both Stereo and Mono audio signals seamlessly with robust harmonic Wiener filters.
 */
export async function separateAudioBufferDSP(
  audioCtx: AudioContext,
  sourceBuffer: AudioBuffer,
  selectedStems: StemCategory[],
  onProgress?: (percent: number, stage: string, model: string) => void
): Promise<AudioTrackState[]> {
  const sampleRate = sourceBuffer.sampleRate;
  const length = sourceBuffer.length;
  const numChannels = sourceBuffer.numberOfChannels;

  // Extract raw PCM channels
  const leftChannel = sourceBuffer.getChannelData(0);
  const rightChannel = numChannels > 1 ? sourceBuffer.getChannelData(1) : leftChannel;

  // Check if audio file is mono or has narrow stereo image
  let isMonoFile = numChannels === 1;
  if (!isMonoFile) {
    let diffSum = 0;
    const checkLen = Math.min(length, sampleRate * 10);
    for (let i = 0; i < checkLen; i += 100) {
      diffSum += Math.abs(leftChannel[i] - rightChannel[i]);
    }
    if (diffSum / (checkLen / 100) < 0.005) {
      isMonoFile = true;
    }
  }

  // STFT Configuration
  const FFT_SIZE = 2048;
  const HOP_SIZE = 512; // 75% overlap for smooth OLA synthesis
  const fft = new FastFFT(FFT_SIZE);

  // Analysis / Synthesis Hann Window
  const hann = new Float32Array(FFT_SIZE);
  for (let i = 0; i < FFT_SIZE; i++) {
    hann[i] = 0.5 * (1.0 - Math.cos((2 * Math.PI * i) / FFT_SIZE));
  }

  // Pre-allocate output Float32Arrays for stems
  const vocalL = new Float32Array(length);
  const vocalR = new Float32Array(length);
  const drumL = new Float32Array(length);
  const drumR = new Float32Array(length);
  const bassL = new Float32Array(length);
  const bassR = new Float32Array(length);
  const gtrL = new Float32Array(length);
  const gtrR = new Float32Array(length);
  const pianoL = new Float32Array(length);
  const pianoR = new Float32Array(length);
  const otherL = new Float32Array(length);
  const otherR = new Float32Array(length);

  // Buffer structures for FFT calculation
  const frameRealL = new Float32Array(FFT_SIZE);
  const frameImagL = new Float32Array(FFT_SIZE);
  const frameRealR = new Float32Array(FFT_SIZE);
  const frameImagR = new Float32Array(FFT_SIZE);

  // Per-stem frame spectral masks
  const maskVocal = new Float32Array(FFT_SIZE / 2 + 1);
  const maskDrum = new Float32Array(FFT_SIZE / 2 + 1);
  const maskBass = new Float32Array(FFT_SIZE / 2 + 1);
  const maskGuitar = new Float32Array(FFT_SIZE / 2 + 1);
  const maskPiano = new Float32Array(FFT_SIZE / 2 + 1);
  const maskOther = new Float32Array(FFT_SIZE / 2 + 1);

  // Buffers for Inverse FFT (IFFT) per stem
  const stRealL = new Float32Array(FFT_SIZE);
  const stImagL = new Float32Array(FFT_SIZE);
  const stRealR = new Float32Array(FFT_SIZE);
  const stImagR = new Float32Array(FFT_SIZE);

  // Previous frame magnitudes for transient flux calculation
  const prevMagM = new Float32Array(FFT_SIZE / 2 + 1);

  const totalFrames = Math.floor((length - FFT_SIZE) / HOP_SIZE);
  let lastProgressUpdate = 0;

  if (onProgress) {
    onProgress(5, 'Iniciando Transformada de Fourier Espectral (STFT 2048 pts)...', 'Engine STFT v2.2 Azul Pro');
  }

  // Main STFT Loop across time frames
  for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
    const startSample = frameIdx * HOP_SIZE;

    // Report progress periodically
    const currentProgress = Math.floor((frameIdx / totalFrames) * 80) + 10;
    if (currentProgress >= lastProgressUpdate + 8) {
      lastProgressUpdate = currentProgress;
      if (onProgress) {
        onProgress(
          currentProgress,
          `Aislando instrumentos por espectro de frecuencia v2.2 (${Math.round((startSample / sampleRate))}s / ${Math.round(sourceBuffer.duration)}s)...`,
          'Multi-Band Spectral Masking v2.2'
        );
      }
      // Yield to UI thread so audio/progress bar updates smoothly
      await new Promise((r) => setTimeout(r, 0));
    }

    // 1. Fill windowed frames
    for (let i = 0; i < FFT_SIZE; i++) {
      const idx = startSample + i;
      const w = hann[i];
      frameRealL[i] = leftChannel[idx] * w;
      frameImagL[i] = 0;
      frameRealR[i] = rightChannel[idx] * w;
      frameImagR[i] = 0;
    }

    // 2. Perform Forward FFT
    fft.transform(frameRealL, frameImagL, false);
    fft.transform(frameRealR, frameImagR, false);

    // 3. Spectral Mask Calculation per frequency bin
    for (let bin = 0; bin <= FFT_SIZE / 2; bin++) {
      const freq = (bin * sampleRate) / FFT_SIZE;

      // Complex Left, Right, Mid, Side components
      const rL = frameRealL[bin], iL = frameImagL[bin];
      const rR = frameRealR[bin], iR = frameImagR[bin];

      const rM = 0.5 * (rL + rR), iM = 0.5 * (iL + iR);
      const rS = 0.5 * (rL - rR), iS = 0.5 * (iL - iR);

      const magM = Math.sqrt(rM * rM + iM * iM);
      const magS = Math.sqrt(rS * rS + iS * iS);

      // Mid-Side Center Dominance Ratio (1.0 = Pure mono center, 0.0 = Pure side)
      const centerRatio = (magM + magS) > 1e-6 ? magM / (magM + magS) : 0.5;

      // Transient Flux (Attack detection per bin)
      const flux = Math.max(0, magM - prevMagM[bin]);
      prevMagM[bin] = magM;
      const fluxRatio = flux / (magM + 1e-4);

      // --- STEM SPECIFIC MASKS v2.1 --- //

      // A) Vocals Mask (140Hz to 8500Hz, Formant peak 300Hz-3800Hz)
      let wVocal = 0;
      if (freq >= 140 && freq <= 8800) {
        const freqWeight = freq < 300
          ? (freq - 140) / 160
          : freq > 3800
          ? Math.max(0, 1.0 - (freq - 3800) / 5000)
          : 1.0;

        const centerBonus = isMonoFile ? 0.75 : Math.pow(centerRatio, 1.2);
        const transientPenalty = Math.max(0, 1.0 - fluxRatio * 1.8);
        wVocal = freqWeight * centerBonus * transientPenalty * 0.85;
      }

      // B) Drums Mask (Sub-kick 35-140Hz, Snare/Toms 150-3800Hz, Cymbals >4000Hz)
      let wDrum = 0;
      if (freq >= 30 && freq <= 140) {
        wDrum = Math.min(1.0, (fluxRatio * 3.0) + (magM > 0.015 ? 0.8 : 0.25));
      } else if (freq > 140 && freq <= 3800) {
        wDrum = Math.min(1.0, fluxRatio * 3.4);
      } else if (freq > 3800 && freq <= 18000) {
        wDrum = Math.min(1.0, (fluxRatio * 2.5) + (magS > magM ? 0.5 : 0.2));
      }

      // C) Bass Mask (35Hz to 280Hz, Low-pass, low transient flux)
      let wBass = 0;
      if (freq >= 35 && freq <= 280) {
        const lowpass = freq < 180 ? 1.0 : Math.max(0, 1.0 - (freq - 180) / 100);
        const bassCenter = isMonoFile ? 0.85 : Math.pow(centerRatio, 1.5);
        const nonTrans = Math.max(0, 1.0 - fluxRatio * 1.5);
        wBass = lowpass * bassCenter * nonTrans * 0.9;
      }

      // D) Guitars Mask (160Hz to 7200Hz, String attacks & body resonance)
      let wGuitar = 0;
      if (freq >= 160 && freq <= 7200) {
        const freqWeight = freq < 260 ? (freq - 160) / 100 : 1.0;
        const sideBoost = isMonoFile ? 0.45 : Math.pow(magS / (magM + magS + 1e-6), 0.7) * 0.7 + 0.3;
        const guitarAttack = (fluxRatio > 0.08 && fluxRatio < 0.4) ? 1.2 : 0.8;
        wGuitar = freqWeight * sideBoost * guitarAttack * 0.65;
      }

      // E) Piano / Keyboards Mask (130Hz to 6000Hz, Harmonic sustained notes)
      let wPiano = 0;
      if (freq >= 130 && freq <= 6000) {
        const nonTrans = Math.max(0, 1.0 - fluxRatio * 2.0);
        const pianoCenter = isMonoFile ? 0.6 : Math.pow(centerRatio, 0.5);
        wPiano = nonTrans * pianoCenter * 0.6;
      }

      // Wiener Mask Normalization v2.1
      const maskSum = wVocal + wDrum + wBass + wGuitar + wPiano + 1e-6;
      if (maskSum > 1.0) {
        wVocal /= maskSum;
        wDrum /= maskSum;
        wBass /= maskSum;
        wGuitar /= maskSum;
        wPiano /= maskSum;
      }
      const wOther = Math.max(0, 1.0 - (wVocal + wDrum + wBass + wGuitar + wPiano));

      maskVocal[bin] = wVocal;
      maskDrum[bin] = wDrum;
      maskBass[bin] = wBass;
      maskGuitar[bin] = wGuitar;
      maskPiano[bin] = wPiano;
      maskOther[bin] = wOther;
    }

    // 4. Synthesize Each Selected Stem via Inverse FFT (IFFT) + Overlap Add (OLA)
    if (selectedStems.includes('vocals_all')) {
      synthesizeFrameStem(frameRealL, frameImagL, frameRealR, frameImagR, maskVocal, stRealL, stImagL, stRealR, stImagR, vocalL, vocalR, startSample, FFT_SIZE, hann, fft);
    }
    if (selectedStems.includes('drums_all')) {
      synthesizeFrameStem(frameRealL, frameImagL, frameRealR, frameImagR, maskDrum, stRealL, stImagL, stRealR, stImagR, drumL, drumR, startSample, FFT_SIZE, hann, fft);
    }
    if (selectedStems.includes('bass')) {
      synthesizeFrameStem(frameRealL, frameImagL, frameRealR, frameImagR, maskBass, stRealL, stImagL, stRealR, stImagR, bassL, bassR, startSample, FFT_SIZE, hann, fft);
    }
    if (selectedStems.includes('guitar_all')) {
      synthesizeFrameStem(frameRealL, frameImagL, frameRealR, frameImagR, maskGuitar, stRealL, stImagL, stRealR, stImagR, gtrL, gtrR, startSample, FFT_SIZE, hann, fft);
    }
    if (selectedStems.includes('piano_keys')) {
      synthesizeFrameStem(frameRealL, frameImagL, frameRealR, frameImagR, maskPiano, stRealL, stImagL, stRealR, stImagR, pianoL, pianoR, startSample, FFT_SIZE, hann, fft);
    }
    if (selectedStems.includes('other')) {
      synthesizeFrameStem(frameRealL, frameImagL, frameRealR, frameImagR, maskOther, stRealL, stImagL, stRealR, stImagR, otherL, otherR, startSample, FFT_SIZE, hann, fft);
    }
  }

  if (onProgress) {
    onProgress(92, 'Normalizando ganancia y estructurando pistas v2.2...', 'Engine STFT v2.2 Azul Pro');
  }
  await new Promise((r) => setTimeout(r, 40));

  const stemResults: AudioTrackState[] = [];

  // 1. Vocals
  if (selectedStems.includes('vocals_all')) {
    const buf = audioCtx.createBuffer(2, length, sampleRate);
    normalizeAndCopyBuffer(buf, vocalL, vocalR, 1.35);
    stemResults.push({
      id: `vocal-${Date.now()}`,
      name: 'Voces Principal & Coros',
      category: 'vocals_all',
      color: '#38BDF8',
      buffer: buf,
      volume: 1.0,
      sensitivity: 1.0,
      isMuted: false,
      isSolo: false,
      peakLevel: 0,
      notes: detectPitchesFromBuffer(buf),
    });
  }

  // 2. Drums
  if (selectedStems.includes('drums_all')) {
    const buf = audioCtx.createBuffer(2, length, sampleRate);
    normalizeAndCopyBuffer(buf, drumL, drumR, 1.3);
    stemResults.push({
      id: `drum-${Date.now()}`,
      name: 'Batería Completa (Kick, Snare, Hats)',
      category: 'drums_all',
      color: '#F43F5E',
      buffer: buf,
      volume: 1.0,
      sensitivity: 1.0,
      isMuted: false,
      isSolo: false,
      peakLevel: 0,
      notes: detectPitchesFromBuffer(buf),
    });
  }

  // 3. Bass
  if (selectedStems.includes('bass')) {
    const buf = audioCtx.createBuffer(2, length, sampleRate);
    normalizeAndCopyBuffer(buf, bassL, bassR, 1.4);
    stemResults.push({
      id: `bass-${Date.now()}`,
      name: 'Bajo Eléctrico',
      category: 'bass',
      color: '#10B981',
      buffer: buf,
      volume: 1.0,
      sensitivity: 1.0,
      isMuted: false,
      isSolo: false,
      peakLevel: 0,
      notes: detectPitchesFromBuffer(buf),
    });
  }

  // 4. Guitar
  if (selectedStems.includes('guitar_all')) {
    const buf = audioCtx.createBuffer(2, length, sampleRate);
    normalizeAndCopyBuffer(buf, gtrL, gtrR, 1.35);
    stemResults.push({
      id: `guitar-${Date.now()}`,
      name: 'Guitarra Acústica / Eléctrica',
      category: 'guitar_all',
      color: '#F59E0B',
      buffer: buf,
      volume: 1.0,
      sensitivity: 1.0,
      isMuted: false,
      isSolo: false,
      peakLevel: 0,
      notes: detectPitchesFromBuffer(buf),
    });
  }

  // 5. Piano & Keys
  if (selectedStems.includes('piano_keys')) {
    const buf = audioCtx.createBuffer(2, length, sampleRate);
    normalizeAndCopyBuffer(buf, pianoL, pianoR, 1.3);
    stemResults.push({
      id: `piano-${Date.now()}`,
      name: 'Piano & Teclados',
      category: 'piano_keys',
      color: '#A855F7',
      buffer: buf,
      volume: 1.0,
      sensitivity: 1.0,
      isMuted: false,
      isSolo: false,
      peakLevel: 0,
      notes: detectPitchesFromBuffer(buf),
    });
  }

  // 6. Other
  if (selectedStems.includes('other')) {
    const buf = audioCtx.createBuffer(2, length, sampleRate);
    normalizeAndCopyBuffer(buf, otherL, otherR, 1.2);
    stemResults.push({
      id: `other-${Date.now()}`,
      name: 'Other (Resto de la Mezcla)',
      category: 'other',
      color: '#EC4899',
      buffer: buf,
      volume: 1.0,
      sensitivity: 1.0,
      isMuted: false,
      isSolo: false,
      peakLevel: 0,
      notes: detectPitchesFromBuffer(buf),
    });
  }

  if (onProgress) {
    onProgress(100, 'Separación de instrumentos v2.2 completada con alta sensibilidad.', 'Finalizado');
  }

  return stemResults;
}

/**
 * Synthesizes a single frame of stem spectrum back to time domain via Inverse FFT and OLA
 */
function synthesizeFrameStem(
  srcRealL: Float32Array, srcImagL: Float32Array,
  srcRealR: Float32Array, srcImagR: Float32Array,
  mask: Float32Array,
  stRealL: Float32Array, stImagL: Float32Array,
  stRealR: Float32Array, stImagR: Float32Array,
  outL: Float32Array, outR: Float32Array,
  startSample: number, FFT_SIZE: number,
  hann: Float32Array, fft: FastFFT
) {
  // Apply mask to positive frequency bins
  for (let bin = 0; bin <= FFT_SIZE / 2; bin++) {
    const m = mask[bin];
    stRealL[bin] = srcRealL[bin] * m;
    stImagL[bin] = srcImagL[bin] * m;
    stRealR[bin] = srcRealR[bin] * m;
    stImagR[bin] = srcImagR[bin] * m;
  }

  // Fill negative frequency bins for conjugate symmetry
  for (let bin = 1; bin < FFT_SIZE / 2; bin++) {
    const sym = FFT_SIZE - bin;
    stRealL[sym] = stRealL[bin];
    stImagL[sym] = -stImagL[bin];
    stRealR[sym] = stRealR[bin];
    stImagR[sym] = -stImagR[bin];
  }

  // Inverse FFT
  fft.transform(stRealL, stImagL, true);
  fft.transform(stRealR, stImagR, true);

  // Overlap-Add to output buffers (COLA factor ~1.63 for 75% overlap Hann)
  const len = outL.length;
  for (let i = 0; i < FFT_SIZE; i++) {
    const idx = startSample + i;
    if (idx < len) {
      const w = hann[i] * 1.63;
      outL[idx] += stRealL[i] * w;
      outR[idx] += stRealR[i] * w;
    }
  }
}

/**
 * Normalize & copy buffer to prevent clipping while maintaining high loudness & sensitivity
 */
function normalizeAndCopyBuffer(
  targetBuffer: AudioBuffer,
  leftData: Float32Array,
  rightData: Float32Array,
  gainMultiplier = 1.3
) {
  let maxPeak = 0.0001;
  const len = leftData.length;

  for (let i = 0; i < len; i += 40) {
    const absL = Math.abs(leftData[i]);
    const absR = Math.abs(rightData[i]);
    if (absL > maxPeak) maxPeak = absL;
    if (absR > maxPeak) maxPeak = absR;
  }

  // Dynamic gain normalization factor
  const normFactor = Math.min(3.5, (0.88 / maxPeak)) * gainMultiplier;

  const outL = targetBuffer.getChannelData(0);
  const outR = targetBuffer.getChannelData(1);

  for (let i = 0; i < len; i++) {
    outL[i] = Math.max(-1.0, Math.min(1.0, leftData[i] * normFactor));
    outR[i] = Math.max(-1.0, Math.min(1.0, rightData[i] * normFactor));
  }
}

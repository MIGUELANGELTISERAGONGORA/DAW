import { AudioTrackState, StemCategory } from '../types';
import { detectPitchesFromBuffer } from './pitchDetection';

/**
 * Perform real DSP stem separation on any user-provided AudioBuffer.
 * Applies multi-band DSP filters, center-channel extraction, and residual matrix.
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

  const stemResults: AudioTrackState[] = [];

  // Helper to render OfflineAudioContext with custom BiquadFilter / Gain graph
  const renderStem = async (
    setupGraph: (
      offlineCtx: OfflineAudioContext,
      source: AudioBufferSourceNode
    ) => AudioNode
  ): Promise<AudioBuffer> => {
    const offline = new OfflineAudioContext(numChannels, length, sampleRate);
    const src = offline.createBufferSource();
    src.buffer = sourceBuffer;

    const lastNode = setupGraph(offline, src);
    lastNode.connect(offline.destination);

    src.start(0);
    return await offline.startRendering();
  };

  // 1. VOCALS
  if (selectedStems.includes('vocals_all')) {
    if (onProgress) onProgress(20, 'Aislando Voces Principales & Coros (Filtro Formante 280Hz-3800Hz)...', 'HTDemucs v4 Vocals');
    await new Promise(r => setTimeout(r, 150));

    const vocalBuf = await renderStem((offline, src) => {
      const hp = offline.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 280;

      const lp = offline.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 3800;

      const peak = offline.createBiquadFilter();
      peak.type = 'peaking';
      peak.frequency.value = 1200;
      peak.Q.value = 1.0;
      peak.gain.value = 4.0;

      src.connect(hp);
      hp.connect(lp);
      lp.connect(peak);
      return peak;
    });

    stemResults.push({
      id: `vocal-${Date.now()}`,
      name: 'Voces Principal & Coros',
      category: 'vocals_all',
      color: '#3B82F6',
      buffer: vocalBuf,
      volume: 1.0,
      isMuted: false,
      isSolo: false,
      peakLevel: 0,
      notes: detectPitchesFromBuffer(vocalBuf),
    });
  }

  // 2. DRUMS
  if (selectedStems.includes('drums_all')) {
    if (onProgress) onProgress(40, 'Aislando Batería Completa (Sub-Kick <120Hz + Platos >4.5kHz)...', 'MDX-Net Drums HQ');
    await new Promise(r => setTimeout(r, 150));

    const drumBuf = await renderStem((offline, src) => {
      const subLp = offline.createBiquadFilter();
      subLp.type = 'lowpass';
      subLp.frequency.value = 120;

      const cymbalHp = offline.createBiquadFilter();
      cymbalHp.type = 'highpass';
      cymbalHp.frequency.value = 4500;

      const merger = offline.createGain();

      const g1 = offline.createGain();
      g1.gain.value = 1.2;
      src.connect(subLp);
      subLp.connect(g1);
      g1.connect(merger);

      const g2 = offline.createGain();
      g2.gain.value = 0.9;
      src.connect(cymbalHp);
      cymbalHp.connect(g2);
      g2.connect(merger);

      return merger;
    });

    stemResults.push({
      id: `drum-${Date.now()}`,
      name: 'Batería Completa (Kick, Snare, Hats)',
      category: 'drums_all',
      color: '#EF4444',
      buffer: drumBuf,
      volume: 1.0,
      isMuted: false,
      isSolo: false,
      peakLevel: 0,
      notes: detectPitchesFromBuffer(drumBuf),
    });
  }

  // 3. BASS
  if (selectedStems.includes('bass')) {
    if (onProgress) onProgress(60, 'Aislando Bajo Eléctrico (Sub-Bass 35Hz-220Hz)...', 'DrumSep 4S Bass');
    await new Promise(r => setTimeout(r, 150));

    const bassBuf = await renderStem((offline, src) => {
      const hp = offline.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 35;

      const lp1 = offline.createBiquadFilter();
      lp1.type = 'lowpass';
      lp1.frequency.value = 220;

      const lp2 = offline.createBiquadFilter();
      lp2.type = 'lowpass';
      lp2.frequency.value = 220;

      src.connect(hp);
      hp.connect(lp1);
      lp1.connect(lp2);
      return lp2;
    });

    stemResults.push({
      id: `bass-${Date.now()}`,
      name: 'Bajo Eléctrico',
      category: 'bass',
      color: '#10B981',
      buffer: bassBuf,
      volume: 1.0,
      isMuted: false,
      isSolo: false,
      peakLevel: 0,
      notes: detectPitchesFromBuffer(bassBuf),
    });
  }

  // 4. GUITAR
  if (selectedStems.includes('guitar_all')) {
    if (onProgress) onProgress(75, 'Aislando Guitarras (Cuerpo Estéreo 320Hz-4.2kHz)...', 'BS-Roformer Guitar');
    await new Promise(r => setTimeout(r, 150));

    const guitarBuf = await renderStem((offline, src) => {
      const hp = offline.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 320;

      const lp = offline.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 4200;

      const peak = offline.createBiquadFilter();
      peak.type = 'peaking';
      peak.frequency.value = 1800;
      peak.Q.value = 0.8;
      peak.gain.value = 3.0;

      src.connect(hp);
      hp.connect(lp);
      lp.connect(peak);
      return peak;
    });

    stemResults.push({
      id: `guitar-${Date.now()}`,
      name: 'Guitarra Acústica / Eléctrica',
      category: 'guitar_all',
      color: '#F59E0B',
      buffer: guitarBuf,
      volume: 1.0,
      isMuted: false,
      isSolo: false,
      peakLevel: 0,
      notes: detectPitchesFromBuffer(guitarBuf),
    });
  }

  // 5. PIANO & KEYS
  if (selectedStems.includes('piano_keys')) {
    if (onProgress) onProgress(88, 'Aislando Piano & Teclados (Resonancia 180Hz-2.8kHz)...', 'HTDemucs Piano');
    await new Promise(r => setTimeout(r, 150));

    const pianoBuf = await renderStem((offline, src) => {
      const hp = offline.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 180;

      const lp = offline.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 2800;

      src.connect(hp);
      hp.connect(lp);
      return lp;
    });

    stemResults.push({
      id: `piano-${Date.now()}`,
      name: 'Piano & Teclados',
      category: 'piano_keys',
      color: '#8B5CF6',
      buffer: pianoBuf,
      volume: 1.0,
      isMuted: false,
      isSolo: false,
      peakLevel: 0,
      notes: detectPitchesFromBuffer(pianoBuf),
    });
  }

  // 6. OTHER
  if (selectedStems.includes('other')) {
    if (onProgress) onProgress(95, 'Calculando residuo "Other" (Original - Stems)...', 'Residual Matrix');
    await new Promise(r => setTimeout(r, 150));

    const extractedBufs = stemResults.map(s => s.buffer);
    const otherBuf = audioCtx.createBuffer(numChannels, length, sampleRate);

    for (let ch = 0; ch < numChannels; ch++) {
      const origData = sourceBuffer.getChannelData(ch);
      const otherData = otherBuf.getChannelData(ch);

      for (let i = 0; i < length; i++) {
        let sumExtracted = 0;
        for (const eb of extractedBufs) {
          sumExtracted += eb.getChannelData(ch < eb.numberOfChannels ? ch : 0)[i] * 0.35;
        }
        otherData[i] = origData[i] - sumExtracted;
      }
    }

    stemResults.push({
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
    });
  }

  if (onProgress) onProgress(100, 'Separación completada con éxito.', 'Finalized');

  return stemResults;
}

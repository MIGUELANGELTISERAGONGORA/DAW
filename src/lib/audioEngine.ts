import { AudioTrackState } from '../types';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private trackNodes: Map<string, {
    sourceNode: AudioBufferSourceNode | null;
    gainNode: GainNode;
    analyserNode: AnalyserNode;
  }> = new Map();

  private isPlaying: boolean = false;
  private playStartTime: number = 0; // AudioContext time when play started
  private pauseOffset: number = 0;    // Offset in seconds into the song
  private duration: number = 0;

  private onTimeUpdateCallback?: (currentTime: number) => void;
  private animFrameId: number | null = null;

  constructor() {
    // AudioContext will be initialized on user gesture or play
  }

  public getAudioContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtxClass();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public setTimeUpdateCallback(cb: (currentTime: number) => void) {
    this.onTimeUpdateCallback = cb;
  }

  public setDuration(dur: number) {
    this.duration = dur;
  }

  public getDuration(): number {
    return this.duration;
  }

  public getCurrentTime(): number {
    if (!this.isPlaying || !this.ctx) {
      return this.pauseOffset;
    }
    const elapsed = this.ctx.currentTime - this.playStartTime;
    const current = this.pauseOffset + elapsed;
    if (current >= this.duration) {
      return this.duration;
    }
    return current;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  // Load or update track nodes in AudioEngine
  public syncTracks(tracks: AudioTrackState[]) {
    const ctx = this.getAudioContext();

    // Determine if any track has solo active
    const hasSolo = tracks.some(t => t.isSolo);

    // Update duration from tracks
    let maxDur = 0;
    tracks.forEach(t => {
      if (t.buffer && t.buffer.duration > maxDur) {
        maxDur = t.buffer.duration;
      }
    });
    this.duration = maxDur;

    // Synchronize nodes for each track
    for (const track of tracks) {
      let entry = this.trackNodes.get(track.id);

      if (!entry) {
        const gainNode = ctx.createGain();
        const analyserNode = ctx.createAnalyser();
        analyserNode.fftSize = 64;
        gainNode.connect(analyserNode);
        analyserNode.connect(ctx.destination);

        entry = { sourceNode: null, gainNode, analyserNode };
        this.trackNodes.set(track.id, entry);
      }

      // Calculate effective gain considering Mute & Solo logic
      let effectiveGain = track.volume;

      if (track.isMuted) {
        effectiveGain = 0;
      } else if (hasSolo && !track.isSolo) {
        effectiveGain = 0;
      }

      // Smooth gain ramp to prevent clicks
      entry.gainNode.gain.setTargetAtTime(effectiveGain, ctx.currentTime, 0.015);
    }
  }

  // Master Playback Start
  public play(tracks: AudioTrackState[], startOffset?: number) {
    const ctx = this.getAudioContext();

    if (this.isPlaying) {
      this.stopSources();
    }

    if (startOffset !== undefined) {
      this.pauseOffset = Math.max(0, Math.min(startOffset, this.duration));
    }

    if (this.pauseOffset >= this.duration) {
      this.pauseOffset = 0; // Loop or reset
    }

    this.playStartTime = ctx.currentTime;
    this.isPlaying = true;

    const hasSolo = tracks.some(t => t.isSolo);

    // Start all track source nodes simultaneously from identical sample offset
    for (const track of tracks) {
      const entry = this.trackNodes.get(track.id);
      if (!entry) continue;

      const sourceNode = ctx.createBufferSource();
      sourceNode.buffer = track.buffer;
      sourceNode.connect(entry.gainNode);

      let effectiveGain = track.volume;
      if (track.isMuted) {
        effectiveGain = 0;
      } else if (hasSolo && !track.isSolo) {
        effectiveGain = 0;
      }

      entry.gainNode.gain.setValueAtTime(effectiveGain, ctx.currentTime);

      // Start buffer source from current offset
      sourceNode.start(ctx.currentTime, this.pauseOffset);
      entry.sourceNode = sourceNode;

      // Handle track end
      sourceNode.onended = () => {
        if (this.isPlaying && this.getCurrentTime() >= this.duration - 0.1) {
          this.pause();
          this.pauseOffset = 0;
        }
      };
    }

    this.startProgressAnimation();
  }

  // Master Pause
  public pause() {
    if (!this.isPlaying) return;
    this.pauseOffset = this.getCurrentTime();
    this.isPlaying = false;
    this.stopSources();
    this.stopProgressAnimation();
  }

  // Master Stop (reset offset to 0:00)
  public stop() {
    this.pauseOffset = 0;
    this.isPlaying = false;
    this.stopSources();
    this.stopProgressAnimation();
    if (this.onTimeUpdateCallback) {
      this.onTimeUpdateCallback(0);
    }
  }

  // Smooth Seek / Scrubbing
  public seek(seekTimeSeconds: number, tracks: AudioTrackState[]) {
    const wasPlaying = this.isPlaying;
    if (wasPlaying) {
      this.stopSources();
    }
    this.pauseOffset = Math.max(0, Math.min(seekTimeSeconds, this.duration));

    if (wasPlaying) {
      this.play(tracks, this.pauseOffset);
    } else {
      if (this.onTimeUpdateCallback) {
        this.onTimeUpdateCallback(this.pauseOffset);
      }
    }
  }

  // Stop active AudioBufferSourceNodes
  private stopSources() {
    for (const [, entry] of this.trackNodes) {
      if (entry.sourceNode) {
        try {
          entry.sourceNode.stop();
          entry.sourceNode.disconnect();
        } catch (_) {}
        entry.sourceNode = null;
      }
    }
  }

  // Real-time Peak Level for VU meter
  public getTrackPeakLevel(trackId: string): number {
    const entry = this.trackNodes.get(trackId);
    if (!entry) return 0;

    const dataArray = new Uint8Array(entry.analyserNode.frequencyBinCount);
    entry.analyserNode.getByteTimeDomainData(dataArray);

    let maxVal = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const v = Math.abs(dataArray[i] - 128) / 128;
      if (v > maxVal) maxVal = v;
    }
    return maxVal;
  }

  private startProgressAnimation() {
    const loop = () => {
      if (this.isPlaying && this.onTimeUpdateCallback) {
        this.onTimeUpdateCallback(this.getCurrentTime());
        this.animFrameId = requestAnimationFrame(loop);
      }
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  private stopProgressAnimation() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  // Offline Audio Mixdown Exporter
  public async exportMixdownWav(
    tracks: AudioTrackState[],
    filename: string = 'Limbus_Split_Pro_Mixdown.wav'
  ): Promise<{ blob: Blob; url: string }> {
    if (tracks.length === 0) {
      throw new Error('No tracks available for export.');
    }

    const sampleRate = tracks[0].buffer.sampleRate;
    let maxSamples = 0;
    tracks.forEach(t => {
      if (t.buffer.length > maxSamples) maxSamples = t.buffer.length;
    });

    // Create OfflineAudioContext
    const offlineCtx = new OfflineAudioContext(2, maxSamples, sampleRate);

    const hasSolo = tracks.some(t => t.isSolo);

    for (const track of tracks) {
      let gainVal = track.volume;
      if (track.isMuted) gainVal = 0;
      else if (hasSolo && !track.isSolo) gainVal = 0;

      if (gainVal <= 0) continue; // Skip silent tracks in mix

      const src = offlineCtx.createBufferSource();
      src.buffer = track.buffer;

      const gain = offlineCtx.createGain();
      gain.gain.value = gainVal;

      src.connect(gain);
      gain.connect(offlineCtx.destination);
      src.start(0);
    }

    const renderedBuffer = await offlineCtx.startRendering();

    // Convert AudioBuffer to WAV PCM Blob
    const wavBlob = audioBufferToWavBlob(renderedBuffer);
    const url = URL.createObjectURL(wavBlob);

    return { blob: wavBlob, url };
  }
}

// Helper: Convert Web Audio AudioBuffer into high-quality 16-bit PCM WAV Blob
function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length;

  const bytesPerSample = 2; // 16-bit
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = length * blockAlign;
  const bufferSize = 44 + dataSize;

  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);

  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* RIFF chunk length */
  view.setUint32(4, 36 + dataSize, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw PCM) */
  view.setUint16(20, 1, true);
  /* channel count */
  view.setUint16(22, numChannels, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, byteRate, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, blockAlign, true);
  /* bits per sample */
  view.setUint16(34, 16, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, dataSize, true);

  // Interleave channels & write 16-bit PCM samples with clipping protection
  let offset = 44;
  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channels.push(buffer.getChannelData(c));
  }

  for (let i = 0; i < length; i++) {
    for (let c = 0; c < numChannels; c++) {
      let sample = channels[c][i];
      // Peak limiter / clipping protection
      sample = Math.max(-1, Math.min(1, sample));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// Audio generator utility that creates reliable demo audio using Web Audio API
export class AudioGenerator {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  
  constructor() {
    try {
      // Create audio context lazily to avoid autoplay policy issues
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
    } catch (error) {
      console.warn('Web Audio API not supported:', error);
    }
  }

  // Generate a simple tone sequence for demo purposes
  generateDemoAudioBlob(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.audioContext || !this.gainNode) {
        reject(new Error('Web Audio API not available'));
        return;
      }

      try {
        // Create a buffer for 3 seconds of audio at 44.1kHz
        const duration = 3;
        const sampleRate = 44100;
        const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const channelData = buffer.getChannelData(0);

        // Generate a pleasant melody sequence
        const notes = [440, 523.25, 659.25, 523.25]; // A4, C5, E5, C5
        const noteDuration = duration / notes.length;
        
        for (let i = 0; i < channelData.length; i++) {
          const time = i / sampleRate;
          const noteIndex = Math.floor(time / noteDuration);
          const frequency = notes[noteIndex] || 440;
          
          // Generate sine wave with envelope
          const amplitude = 0.1 * Math.exp(-time * 0.5); // Fade out
          channelData[i] = amplitude * Math.sin(2 * Math.PI * frequency * time);
        }

        // Convert buffer to WAV blob
        const wavBlob = this.bufferToWav(buffer);
        resolve(wavBlob);
      } catch (error) {
        reject(error);
      }
    });
  }

  // Convert AudioBuffer to WAV Blob
  private bufferToWav(buffer: AudioBuffer): Blob {
    const length = buffer.length;
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
    const view = new DataView(arrayBuffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * numberOfChannels * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * numberOfChannels * 2, true);
    
    // Convert audio data
    const channelData = buffer.getChannelData(0);
    let offset = 44;
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, sample * 0x7FFF, true);
      offset += 2;
    }
    
    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  // Create a simple data URL with a basic tone
  createSimpleToneDataUrl(): string {
    // Create a very simple WAV file with a 440Hz tone
    const sampleRate = 8000; // Lower sample rate for smaller file
    const duration = 2; // 2 seconds
    const samples = sampleRate * duration;
    const buffer = new ArrayBuffer(44 + samples * 2);
    const view = new DataView(buffer);
    
    // WAV header
    view.setUint32(0, 0x46464952, false); // 'RIFF'
    view.setUint32(4, buffer.byteLength - 8, true);
    view.setUint32(8, 0x45564157, false); // 'WAVE'
    view.setUint32(12, 0x20746d66, false); // 'fmt '
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    view.setUint32(36, 0x61746164, false); // 'data'
    view.setUint32(40, samples * 2, true);
    
    // Generate 440Hz sine wave
    for (let i = 0; i < samples; i++) {
      const time = i / sampleRate;
      const amplitude = 0.1 * Math.exp(-time * 0.5); // Fade out
      const sample = amplitude * Math.sin(2 * Math.PI * 440 * time);
      view.setInt16(44 + i * 2, sample * 32767, true);
    }
    
    // Convert to base64
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    
    return `data:audio/wav;base64,${btoa(binary)}`;
  }

  // Get multiple fallback options
  getFallbackOptions(): Promise<string[]> {
    return new Promise((resolve) => {
      const options = [];
      
      // Add simple data URL tone
      try {
        const dataUrl = this.createSimpleToneDataUrl();
        options.push(dataUrl);
      } catch (error) {
        console.warn('Failed to create data URL tone:', error);
      }

      // Add Web Audio API generated blob URL
      if (this.audioContext) {
        this.generateDemoAudioBlob()
          .then(blob => {
            const blobUrl = URL.createObjectURL(blob);
            options.push(blobUrl);
            resolve(options);
          })
          .catch(() => {
            resolve(options);
          });
      } else {
        resolve(options);
      }
    });
  }

  // Cleanup resources
  destroy() {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.gainNode = null;
  }
}

export const audioGenerator = new AudioGenerator();
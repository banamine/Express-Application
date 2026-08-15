import { useAudioStore } from '../stores/audio-store';
import { telemetry } from './telemetry';

export class AudioWatchdog {
  private videoElement: HTMLVideoElement | null = null;
  private audioContext: AudioContext | null = null;
  private stallTimer: NodeJS.Timeout | null = null;

  constructor(videoElement: HTMLVideoElement, audioContext?: AudioContext) {
    this.videoElement = videoElement;
    this.audioContext = audioContext || null;
    this.attachListeners();
    this.monitorAudioContext();
  }

  private attachListeners() {
    if (!this.videoElement) return;
    this.videoElement.addEventListener('playing', this.handlePlaying);
    this.videoElement.addEventListener('waiting', this.handleStall);
    this.videoElement.addEventListener('stalled', this.handleStall);
  }

  private monitorAudioContext() {
    if (!this.audioContext) return;
    this.audioContext.onstatechange = () => {
      const state = this.audioContext!.state;
      telemetry.log('info', 'system', `AudioContext statechange: ${state}`);
      if (state === 'running') useAudioStore.getState().setStatus('ACTIVE');
      else if (state === 'suspended') useAudioStore.getState().setStatus('SUSPENDED');
    };
  }

  private handlePlaying = () => {
    if (this.stallTimer) clearTimeout(this.stallTimer);
    useAudioStore.getState().setStatus('ACTIVE');
  };

  private handleStall = () => {
    useAudioStore.getState().setStatus('BUFFERING');
    telemetry.log('warn', 'network', 'MediaElement stalled or waiting.');

    if (this.stallTimer) clearTimeout(this.stallTimer);
    
    // 5-Second Kickstart Protocol
    this.stallTimer = setTimeout(() => this.kickstart(), 5000);
  };

  private kickstart = () => {
    if (!this.videoElement) return;
    telemetry.log('warn', 'system', 'AudioWatchdog 5s timeout reached. Kickstarting stalled video.');
    
    // Force DOM refresh and resume audio
    this.videoElement.load();
    this.videoElement.play().catch(e => console.error("Kickstart play failed:", e));
    
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(e => console.error("Kickstart audio resume failed:", e));
    }
  };

  public destroy() {
    if (this.stallTimer) clearTimeout(this.stallTimer);
    if (!this.videoElement) return;
    this.videoElement.removeEventListener('playing', this.handlePlaying);
    this.videoElement.removeEventListener('waiting', this.handleStall);
    this.videoElement.removeEventListener('stalled', this.handleStall);
  }
}

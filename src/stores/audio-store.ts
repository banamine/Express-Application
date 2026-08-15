import { create } from 'zustand';

export type AudioState = 'ACTIVE' | 'BUFFERING' | 'SUSPENDED';

interface AudioStore {
  status: AudioState;
  setStatus: (status: AudioState) => void;
  streamUrl: string | null;
  isPlaying: boolean;
  setStream: (url: string) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
}

export const useAudioStore = create<AudioStore>((set) => ({
  status: 'SUSPENDED',
  setStatus: (status) => set({ status }),
  streamUrl: null,
  isPlaying: false,
  setStream: (url) => set({ streamUrl: url, isPlaying: true, status: 'BUFFERING' }),
  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false, status: 'SUSPENDED' }),
  stop: () => set({ streamUrl: null, isPlaying: false, status: 'SUSPENDED' }),
}));

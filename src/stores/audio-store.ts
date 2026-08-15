import { create } from 'zustand';

export type AudioState = 'ACTIVE' | 'BUFFERING' | 'SUSPENDED';

interface AudioStore {
  status: AudioState;
  setStatus: (status: AudioState) => void;
}

export const useAudioStore = create<AudioStore>((set) => ({
  status: 'SUSPENDED',
  setStatus: (status) => set({ status }),
}));

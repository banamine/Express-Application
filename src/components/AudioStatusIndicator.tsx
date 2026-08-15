import React from 'react';
import { useAudioStore } from '../stores/audio-store';
import { Activity, PauseCircle, Loader } from 'lucide-react';

export function AudioStatusIndicator() {
  const status = useAudioStore((state) => state.status);

  return (
    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 shadow-sm">
      {status === 'ACTIVE' && <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />}
      {status === 'BUFFERING' && <Loader className="w-4 h-4 text-amber-500 animate-spin" />}
      {status === 'SUSPENDED' && <PauseCircle className="w-4 h-4 text-red-500" />}
      <span className="text-xs font-mono font-bold tracking-wider text-slate-300">{status}</span>
    </div>
  );
}

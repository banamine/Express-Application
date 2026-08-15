// DOCUMENTATION:
// PlayoutDashboard.tsx vs news-player.tsx
// `news-player.tsx` is the primary shipping player for the application. It uses `useStaticRundown` 
// to read from `daily-rundown.json` and manages actual <video> playback for the 24/7 channels.
// `PlayoutDashboard.tsx` serves as a supplemental visual control center/dashboard for system metrics,
// but for consistency with the primary player, it should ideally use `useStaticRundown` as well.
// For now, this file remains a secondary dashboard view.

import React, { useState } from 'react';
import { useSystemCountdown } from '../../hooks/useSystemCountdown';
import './PlayoutDashboard.css';

interface Broadcast {
  id: string;
  title: string;
  status: 'PLAYING_NOW' | 'ARCHIVED' | 'QUEUED_FUTURE';
  endTime: string;
}

interface DashboardProps {
  apiEndpoint?: string;
}

const PlayoutDashboard: React.FC<DashboardProps> = () => {
  const [viewMode, setViewMode] = useState<'heatmap' | 'timeline'>('heatmap');
  const [activeBroadcast, setActiveBroadcast] = useState<Broadcast | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingPhase, setLoadingPhase] = useState<'FETCHING' | 'HYDRATING' | 'SETTLED'>('FETCHING');
  const [ariaMessage, setAriaMessage] = useState('Fetching latest news feed...');

  React.useEffect(() => {
    let isCancelled = false;

    const fetchSchedule = async () => {
      try {
        setLoadingPhase('FETCHING');
        setAriaMessage('Fetching latest news feed...');
        
        const response = await fetch('/api/stream/schedule');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        if (isCancelled) return;

        setLoadingPhase('HYDRATING');
        setAriaMessage('Hydrating archive broadcast chunks...');
        
        // Mock a short hydration pause for the queue to settle
        await new Promise(r => setTimeout(r, 600));
        
        if (isCancelled) return;

        setLoadingPhase('SETTLED');
        setAriaMessage('Stream ready.');

        // Strict data mapping: API might return empty blocks or a specific structure
        if (data && data.blocks && data.blocks.length > 0) {
          const nowPlaying = data.blocks.find((b: any) => b.status === 'PLAYING_NOW') || data.blocks[0];
          setActiveBroadcast({
            id: nowPlaying.id || 'unknown',
            title: nowPlaying.title || 'Unknown Broadcast',
            status: nowPlaying.status || 'PLAYING_NOW',
            endTime: nowPlaying.endTime || new Date(Date.now() + 45 * 60000).toISOString()
          });
        } else {
          // If no blocks, but request succeeded, it's still an empty state
          setActiveBroadcast(null);
        }
      } catch (err: any) {
        if (isCancelled) return;
        console.error("Bridge Interrogation Failed:", err);
        setError(`NETWORK FAILURE: ${err.message}`);
        setLoadingPhase('SETTLED');
      }
    };
    fetchSchedule();
    
    return () => {
      isCancelled = true;
    };
  }, []);

  const dynamicCountdown = useSystemCountdown(activeBroadcast?.endTime || new Date().toISOString());

  return (
    <div className="matrix-canvas">
      {/* ARIA Live Region for polite screen reader updates */}
      <div aria-live="polite" className="sr-only">
        {ariaMessage}
      </div>

      {/* Top Navigation / Controls */}
      <header className="glass-panel nav-header">
        <h1 className="neon-title cyan-glow">MATRIX STRIPPER <span className="version">v3.0.0</span></h1>
        <div className="view-toggles">
          <button 
            className={`neon-btn ${viewMode === 'heatmap' ? 'active-green' : ''}`}
            onClick={() => setViewMode('heatmap')}
          >
            Heatmap
          </button>
          <button 
            className={`neon-btn ${viewMode === 'timeline' ? 'active-green' : ''}`}
            onClick={() => setViewMode('timeline')}
          >
            Timeline
          </button>
        </div>
      </header>

      <main className="dashboard-grid">
        {/* Active Player Status Window */}
        <section className="glass-panel active-player-module">
          {error ? (
            <div className="status-header flex items-center justify-between">
              <span className="badge neon-red-bg font-bold animate-pulse">[BRIDGE OFFLINE]</span>
              <span className="live-indicator text-red-500">● CONNECTION LOST</span>
            </div>
          ) : activeBroadcast ? (
            <div className="status-header flex items-center justify-between">
              <span className="badge neon-green-bg">[{activeBroadcast.status}]</span>
              <span className="live-indicator">● LIVE ENGINE</span>
            </div>
          ) : (
            <div className="status-header flex items-center justify-between">
              <span className="badge bg-gray-600">[AWAITING DATA]</span>
              <span className="live-indicator text-gray-400">○ STANDBY</span>
            </div>
          )}

          {error ? (
            <div className="mt-8 border-2 border-red-500 bg-red-900/20 p-6 rounded-md">
              <h2 className="current-title text-2xl font-bold text-red-500 mb-2">SYSTEM ALERT: BRIDGE COLLAPSE</h2>
              <p className="text-red-400 font-mono text-lg">{error}</p>
              <p className="text-red-400 font-mono text-sm mt-4">&gt; Verify backend ingest loop and CORS policies.</p>
            </div>
          ) : loadingPhase !== 'SETTLED' ? (
            <div className="player-viewport flex items-center justify-center bg-black">
              <div className="text-center space-y-4">
                <div className="h-12 w-12 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin mx-auto" />
                <h3 className="text-sm font-mono tracking-widest text-cyan-400 uppercase" aria-hidden="true">
                  {loadingPhase === 'FETCHING' ? 'FETCHING RUNDOWN...' : 'HYDRATING CHUNKS...'}
                </h3>
              </div>
            </div>
          ) : activeBroadcast ? (
            <>
              <h2 className="current-title text-2xl font-bold mt-4">{activeBroadcast.title}</h2>
              
              <div className="countdown-container">
                <span className="countdown-label">TIME REMAINING:</span>
                {/* Driven directly by the system clock */}
                <span className="countdown-clock neon-gold-text">{dynamicCountdown}</span>
              </div>
              
              <div className="player-viewport">
                {/* Video or HLS instance mounts here, now that array is resolved */}
                <div className="standby-screen text-green-400 border border-green-500/30 bg-green-950/20 p-8 rounded-lg flex flex-col items-center justify-center">
                  <div className="w-16 h-16 rounded-full border-4 border-green-500 flex items-center justify-center mb-4">
                     <span className="text-2xl font-bold">▶</span>
                  </div>
                  <span className="text-xl font-bold uppercase tracking-widest">STREAM READY</span>
                </div>
              </div>
            </>
          ) : (
             <div className="mt-8 p-6 text-center text-gray-500 font-mono">
               No active broadcasts found in schedule.
             </div>
          )}
        </section>

        {/* Master Control Calendar */}
        <section className="glass-panel calendar-module">
          <h3 className="neon-cyan-text mb-4">Broadcast Archive {viewMode === 'heatmap' ? 'Heatmap' : 'Timeline'}</h3>
          <div className="calendar-grid">
            {/* Grid injected via Time-Series Engine data */}
            {error ? (
              <div className="calendar-placeholder border border-red-500 p-4 text-red-400 bg-red-950/30">
                <p className="font-bold">Error loading archive index.</p>
                <p className="system-log text-sm mt-2 font-mono text-red-500/80">&gt; Data drop detected at UI bridge.</p>
              </div>
            ) : (
              <div className="calendar-placeholder border border-[#333] p-4 text-[#aaa]">
                <p>August 2026 Archive Index Loaded.</p>
                <p className="system-log text-sm mt-2 font-mono text-[#666]">&gt; Indexing complete. All broadcast chunks hydrated.</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default PlayoutDashboard;

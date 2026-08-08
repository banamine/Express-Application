import { useState, useEffect, useRef } from 'react';
import { Play, Pause, FastForward, Maximize, Loader2, Signal } from 'lucide-react';
import Hls from 'hls.js';

export default function Player2() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'PLAYING' | 'BREAK'>('IDLE');
  const [currentShow, setCurrentShow] = useState('Waiting for schedule...');
  const [telemetry, setTelemetry] = useState<any>({});
  const [ajPool, setAjPool] = useState<any>({});
  const [playerCount, setPlayerCount] = useState(0);
  
  const currentUrlRef = useRef<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/aj-pool/status');
        if (res.ok) {
          const data = await res.json();
          setAjPool(data);
          
          if (data.currentFile) {
            setCurrentShow(data.currentFile.filename || data.currentFile.title || 'AJ BROADCAST');
            const newUrl = data.currentFile.url || data.currentFile.videoUrl;
            if (newUrl && currentUrlRef.current !== newUrl) {
              currentUrlRef.current = newUrl;
              loadVideo(newUrl);
            }
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // refresh status periodically

    const evtSource = new EventSource('/api/watchdog/events');
    evtSource.addEventListener('STATUS', (e: any) => {
      try {
        const data = JSON.parse(e.data);
        setTelemetry(data.payload);
      } catch (err) {
        console.error('Failed to parse STATUS event:', err);
      }
    });
    evtSource.addEventListener('FORCE_INJECT', (e: any) => {
      try {
        const data = JSON.parse(e.data);
        setStatus('BREAK');
        setCurrentShow('NTD NETWORK BREAK');
        if (data.payload?.url && currentUrlRef.current !== data.payload.url) {
          currentUrlRef.current = data.payload.url;
          loadVideo(data.payload.url);
        }
      } catch (err) {
        console.error('Failed to parse FORCE_INJECT event:', err);
      }
    });
    evtSource.addEventListener('show_start', (e: any) => {
      try {
        const data = JSON.parse(e.data);
        setStatus('PLAYING');
        setCurrentShow(data.title || data.filename || 'AJ BROADCAST');
        const newUrl = data.url || data.videoUrl;
        if (newUrl && currentUrlRef.current !== newUrl) {
          currentUrlRef.current = newUrl;
          loadVideo(newUrl);
        }
      } catch (err) {
        console.error('Failed to parse show_start event:', err);
      }
    });
    evtSource.addEventListener('PLAYER_CHANGE', (e: any) => {
      try {
        const data = JSON.parse(e.data);
        setPlayerCount(data.payload?.count || 0);
      } catch (err) {
        console.error('Failed to parse PLAYER_CHANGE event:', err);
      }
    });

    return () => {
      clearInterval(interval);
      evtSource.close();
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, []);
  
  const loadVideo = (url: string) => {
    if (!videoRef.current) return;
    
    if (hlsRef.current) {
      hlsRef.current.destroy();
    }

    if (url.toLowerCase().endsWith('.m3u8') || url.toLowerCase().endsWith('.m3u')) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
        });
        hlsRef.current = hls;
        hls.loadSource(url);
        hls.attachMedia(videoRef.current);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          videoRef.current?.play().catch(console.error);
          setIsPlaying(true);
          setStatus('PLAYING');
        });
      } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        videoRef.current.src = url;
        videoRef.current.addEventListener('loadedmetadata', () => {
          videoRef.current?.play().catch(console.error);
          setIsPlaying(true);
          setStatus('PLAYING');
        });
      }
    } else {
      // Direct MP4 playback
      videoRef.current.src = url;
      videoRef.current.load();
      videoRef.current.play().catch(console.error);
      setIsPlaying(true);
      setStatus('PLAYING');
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(console.error);
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="space-y-6 h-full flex flex-col max-w-6xl mx-auto" style={{
      '--bg': '#121212',
      '--surface-1': '#1a1a1a',
      '--surface-2': '#222222',
      '--surface-3': '#2a2a2a',
      '--text-1': '#f2f2f2',
      '--text-2': '#b8b8b8',
      '--text-3': '#8a8a8a',
      '--border': 'rgba(255,255,255,0.08)',
      '--accent': '#ff6a33',
      '--live': '#33d15f',
      '--warn': '#ff4d4d',
    } as any}>
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-secondary" style={{ color: 'var(--text-1)' }}>Live Player 2</h2>
        <p className="mt-2" style={{ color: 'var(--text-2)' }}>AJ Broadcast Mode / VoD with 15-min NTD Breaks</p>
      </div>

      <div className="flex-1 min-h-[400px] rounded-xl overflow-hidden relative group" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}>
        {/* TV Player Shell */}
        <video 
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-contain bg-black"
          playsInline
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
        
        {status === 'IDLE' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
            <div className="text-center space-y-4">
              <Signal className="h-16 w-16 mx-auto animate-pulse" style={{ color: 'var(--text-3)' }} />
              <h3 className="text-xl font-bold" style={{ color: 'var(--text-2)' }}>STANDBY SIGNAL</h3>
              <p className="text-sm font-mono" style={{ color: 'var(--text-3)' }}>WAITING FOR MEDIA STREAM</p>
            </div>
          </div>
        )}

        {/* Overlay HUD */}
        <div className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-start opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
          <div>
            <div className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-full`} style={{ backgroundColor: status === 'BREAK' ? 'var(--warn)' : 'var(--live)' }} />
              <span className="font-bold text-sm tracking-widest uppercase" style={{ color: 'var(--text-1)' }}>
                {status === 'BREAK' ? 'NTD NETWORK BREAK' : 'AJ BROADCAST'}
              </span>
            </div>
            <h1 className="text-3xl font-bold mt-2" style={{ color: 'var(--text-1)' }}>{currentShow}</h1>
          </div>
          <div className="text-right">
            <div className="text-2xl font-mono" style={{ color: 'var(--text-2)' }}>
              {new Date().toLocaleTimeString('en-US', { hour12: false })}
            </div>
            <div className="text-sm" style={{ color: 'var(--text-3)' }}>LOCAL SYSTEM TIME</div>
          </div>
        </div>

        {/* Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={togglePlay}
                className="h-12 w-12 rounded-full flex items-center justify-center transition-colors"
                style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
              >
                {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-1" />}
              </button>
              <div className="font-mono text-sm" style={{ color: 'var(--text-1)' }}>
                {status === 'PLAYING' || status === 'BREAK' ? 'LIVE / BUFFERING...' : '00:00:00 / --:--:--'}
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <button className="transition-colors" style={{ color: 'var(--text-2)' }} onMouseOver={e => e.currentTarget.style.color = 'var(--text-1)'} onMouseOut={e => e.currentTarget.style.color = 'var(--text-2)'}>
                <FastForward className="h-6 w-6" />
              </button>
              <button 
                className="transition-colors" 
                style={{ color: 'var(--text-2)' }} 
                onMouseOver={e => e.currentTarget.style.color = 'var(--text-1)'} 
                onMouseOut={e => e.currentTarget.style.color = 'var(--text-2)'}
                onClick={() => {
                  if (videoRef.current) {
                    if (videoRef.current.requestFullscreen) {
                      videoRef.current.requestFullscreen();
                    }
                  }
                }}
              >
                <Maximize className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Debug / Schedule Info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl p-6 shadow-sm" style={{ backgroundColor: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: '12px' }}>
           <h3 className="font-semibold mb-3 text-lg" style={{ color: 'var(--text-1)' }}>Watchdog Telemetry</h3>
           <pre className="text-xs font-mono p-4 rounded-md overflow-auto" style={{ backgroundColor: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>
             {`STATUS: ${status}\nTARGET: player2\nMODE: AJ_BROADCAST\nACTIVE_PLAYERS: ${playerCount}`}
           </pre>
        </div>
        <div className="rounded-xl p-6 shadow-sm" style={{ backgroundColor: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: '12px' }}>
           <h3 className="font-semibold mb-3 text-lg" style={{ color: 'var(--text-1)' }}>AJ Pool Status</h3>
           <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
             <strong style={{ color: 'var(--text-1)' }}>Feed Source:</strong> rss.alexjones.media/hourly-mp4-HD.html<br/>
             <strong style={{ color: 'var(--text-1)' }}>Enabled:</strong> <span style={{ color: ajPool.enabled ? 'var(--live)' : 'var(--warn)' }}>{ajPool.enabled ? 'Yes' : 'No'}</span><br/>
             <strong style={{ color: 'var(--text-1)' }}>Loaded Files:</strong> {ajPool.files?.length || 0}<br/>
             <strong style={{ color: 'var(--text-1)' }}>Last Refreshed:</strong> {ajPool.lastRefreshedAt ? new Date(ajPool.lastRefreshedAt).toLocaleString() : 'Never'}
           </p>
        </div>
      </div>
    </div>
  );
}

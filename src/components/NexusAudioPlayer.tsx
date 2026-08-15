import React, { useRef, useEffect, useState } from 'react';
import { useAudioStore } from '../stores/audio-store';

export const NexusAudioPlayer = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamUrl = useAudioStore((state) => state.streamUrl);
  const isPlaying = useAudioStore((state) => state.isPlaying);
  const setStatus = useAudioStore((state) => state.setStatus);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Touch Gesture Initialization: On mobile browsers, ensure audio playback 
    // is initialized inside a direct user-click handler.
    const handleInit = () => {
      if (!isInitialized && audioRef.current) {
        // Unlock audio context by playing and immediately pausing a silent buffer
        audioRef.current.play().then(() => {
          if (!isPlaying) {
            audioRef.current?.pause();
          }
          setIsInitialized(true);
        }).catch(() => {
          // Ignore, will try again on next interaction
        });
      }
    };

    window.addEventListener('click', handleInit, { once: true });
    window.addEventListener('touchstart', handleInit, { once: true });

    return () => {
      window.removeEventListener('click', handleInit);
      window.removeEventListener('touchstart', handleInit);
    };
  }, [isInitialized, isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !streamUrl) return;

    // Direct DOM binding prevents React re-render interruption
    audio.src = streamUrl;
    
    if (isPlaying) {
      audio.play().catch((err) => {
        console.warn('Autoplay blocked or stream interrupted:', err);
      });
    }
  }, [streamUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.play().catch(() => {});
      setStatus('ACTIVE');
    } else {
      audio.pause();
      setStatus('SUSPENDED');
    }
  }, [isPlaying, setStatus]);

  return (
    <audio
      ref={audioRef}
      preload="auto"
      onPlaying={() => setStatus('ACTIVE')}
      onWaiting={() => setStatus('BUFFERING')}
      onStalled={(e) => {
        setStatus('BUFFERING');
        // Recovery logic on network stall
        const el = e.currentTarget;
        if (el.readyState < 3) {
          el.load();
          el.play().catch(() => {});
        }
      }}
      onError={(e) => {
        console.error('Audio stream error encounted:', e);
        setStatus('SUSPENDED');
      }}
    />
  );
};

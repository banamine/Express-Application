import React, { useState, useRef, useEffect } from 'react';
import { telemetry } from '../lib/telemetry';

export function ArchiveNativePlayer({ 
  url, 
  title, 
  startTime, 
  endTime 
}: { 
  url: string, 
  title?: string,
  startTime?: number,
  endTime?: number
}) {
  const [needsInteraction, setNeedsInteraction] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const isMutedRef = useRef(true);

  const setVideoRef = (el: HTMLVideoElement | null) => {
    if (el) {
      el.defaultMuted = isMutedRef.current;
      el.muted = isMutedRef.current;
    }
    videoRef.current = el;
  };
  
  const videoRef = useRef<HTMLVideoElement | null>(null);

  let fullUrl = url;
  if (startTime !== undefined && endTime !== undefined) {
    fullUrl = `${url}?t=${startTime}/${endTime}&ignore=x.mp4`;
  } else if (startTime !== undefined) {
    fullUrl = `${url}?t=${startTime}/&ignore=x.mp4`;
  } else if (endTime !== undefined) {
    // If only endTime is specified, assume start is 0
    fullUrl = `${url}?t=0/${endTime}&ignore=x.mp4`;
  }

  // Force a clean DOM remount when the URL changes to prevent AbortErrors
  // and clear any stale media state in the browser engine.
  const playerKey = fullUrl || "empty-player";

  useEffect(() => {
    if (fullUrl) {
      telemetry.info('playback', 'Player initialized', { url: fullUrl, title, startTime, endTime });
    }
  }, [fullUrl, title, startTime, endTime]);

  const handleInteract = () => {
    if (videoRef.current) {
      videoRef.current.muted = false;
      videoRef.current.play().catch(e => {
        if (e.name !== "AbortError") {
          console.error("Playback blocked", e.message);
          telemetry.error('playback', 'Playback blocked', { error: e.message });
        }
      });
      setNeedsInteraction(false);
      setIsPlaying(true);
      telemetry.info('playback', 'User interaction unmuted video');
    }
  };

  // Ensure all timeupdate and ended event listeners are properly cleaned up in useEffect return functions
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      // Optional: Add time tracking logic here
    };

    const handleEnded = () => {
      setIsPlaying(false);
      telemetry.info('playback', 'Playback ended naturally', { url: fullUrl });
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
    };
  }, [playerKey]);

  return (
    <div className="relative w-full max-w-[1200px] bg-black border border-cyan-500 rounded flex flex-col">
      {/* 
        Native HTML Video Element
        - controls: Enables native browser controls
        - playsInline: Prevents fullscreen takeover on iOS
        - preload="metadata": Fetches duration without downloading the whole file
      */}
      <video
        key={playerKey}
        ref={setVideoRef}
        className="w-full h-auto max-h-[85vh] object-contain"
        controls={!needsInteraction}
        playsInline
        preload="auto"
        onVolumeChange={(e) => {
          isMutedRef.current = e.currentTarget.muted;
          setIsMuted(e.currentTarget.muted);
        }}
        autoPlay // attempt muted autoplay
        onLoadStart={(e) => telemetry.info('playback', 'ArchiveNativePlayer load start', { url: e.currentTarget.currentSrc })}
        onWaiting={(e) => telemetry.warn('playback', 'ArchiveNativePlayer buffering/waiting', { url: e.currentTarget.currentSrc })}
        onPlay={() => {
          setIsPlaying(true);
          telemetry.info('playback', 'Video playing');
        }}
        onPause={() => {
          setIsPlaying(false);
          telemetry.info('playback', 'Video paused');
        }}
        onError={() => {
          console.error("[ARCHIVE ENGINE ERROR] Stream failed");
          telemetry.error('playback', 'Stream failed', { url: fullUrl });
        }}
      >
        <source src={fullUrl} type="video/mp4" />
        Your browser does not support native video playback.
      </video>

      {/* Interaction Overlay: Forces user to click/touch to enable audio and standard controls */}
      {needsInteraction && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-black/60 cursor-pointer z-50"
          onClick={handleInteract}
        >
          <div className="px-6 py-3 bg-cyan-900/80 text-cyan-100 border border-cyan-400 rounded-lg shadow-[0_0_15px_rgba(0,255,255,0.5)] font-bold tracking-wider hover:bg-cyan-800 transition-colors">
            TAP TO UNMUTE & PLAY
          </div>
        </div>
      )}
    </div>
  );
}

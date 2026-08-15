import { useState, useEffect, useRef } from 'react';

export function useWebSocket(url: string) {
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<MessageEvent | null>(null);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    let protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let host = window.location.host;
    if (url.startsWith('ws://') || url.startsWith('wss://')) {
        // use provided url
    } else {
        url = `${protocol}//${host}${url}`;
    }

    const connect = () => {
      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        setConnected(true);
      };

      ws.current.onmessage = (event) => {
        setLastMessage(event);
      };

      ws.current.onclose = () => {
        setConnected(false);
        // Reconnect after 3 seconds
        setTimeout(connect, 3000);
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket Error:', error);
      };
    };

    connect();

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [url]);

  return { connected, lastMessage };
}

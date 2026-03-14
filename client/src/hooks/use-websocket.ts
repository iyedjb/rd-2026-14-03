import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './use-auth';

interface WebSocketMessage {
  type: 'connected' | 'discount_approval_request' | 'discount_approval_decision' | 'pong';
  data?: any;
  message?: string;
}

type MessageHandler = (message: WebSocketMessage) => void;

export function useWebSocket() {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const messageHandlers = useRef<Set<MessageHandler>>(new Set());
  const reconnectTimeout = useRef<NodeJS.Timeout>();
  const shouldReconnect = useRef(true);

  useEffect(() => {
    if (!user) {
      shouldReconnect.current = false;
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (ws.current) {
        ws.current.close();
      }
      return;
    }

    shouldReconnect.current = true;

    const connect = async () => {
      if (!user || !shouldReconnect.current) return;

      try {
        const token = await (user as any).getIdToken();
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const hostname = window.location.hostname || 'localhost';
        const port = window.location.port ? `:${window.location.port}` : '';
        const wsUrl = `${protocol}//${hostname}${port}/ws?token=${token}`;

        ws.current = new WebSocket(wsUrl);

        ws.current.onopen = () => {
          console.log('WebSocket connected');
          setIsConnected(true);
        };

        ws.current.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            messageHandlers.current.forEach(handler => handler(message));
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        ws.current.onclose = () => {
          console.log('WebSocket disconnected');
          setIsConnected(false);
          
          if (shouldReconnect.current && user) {
            reconnectTimeout.current = setTimeout(() => {
              console.log('Reconnecting WebSocket...');
              connect();
            }, 5000);
          }
        };

        ws.current.onerror = (error) => {
          console.error('WebSocket error:', error);
        };
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
      }
    };

    connect();

    return () => {
      shouldReconnect.current = false;
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [user]);

  const subscribe = useCallback((handler: MessageHandler) => {
    messageHandlers.current.add(handler);
    
    return () => {
      messageHandlers.current.delete(handler);
    };
  }, []);

  const send = useCallback((message: any) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    }
  }, []);

  return {
    isConnected,
    subscribe,
    send,
  };
}

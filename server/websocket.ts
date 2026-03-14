import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import type { IncomingMessage } from 'http';
import { getAuth } from 'firebase-admin/auth';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  userEmail?: string;
  userRole?: 'admin' | 'vadmin';
  isAlive?: boolean;
}

interface WebSocketMessage {
  type: 'discount_approval_request' | 'discount_approval_decision' | 'ping' | 'pong' | 'logout_required';
  data?: any;
}

class WebSocketManager {
  private wss: WebSocketServer;
  private clients: Map<string, AuthenticatedWebSocket> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws'
    });

    this.setupWebSocketServer();
    this.startHeartbeat();
  }

  private setupWebSocketServer() {
    this.wss.on('connection', async (ws: AuthenticatedWebSocket, req: IncomingMessage) => {
      console.log('New WebSocket connection attempt');
      
      try {
        const url = new URL(req.url || '', `http://${req.headers.host}`);
        const token = url.searchParams.get('token');

        if (!token) {
          console.log('WebSocket connection rejected: missing token');
          ws.close(1008, 'Missing authentication token');
          return;
        }

        // Verify Firebase token
        let decodedToken;
        try {
          decodedToken = await getAuth().verifyIdToken(token);
        } catch (error) {
          console.log('WebSocket connection rejected: invalid token', error);
          ws.close(1008, 'Invalid authentication token');
          return;
        }

        // Get user from storage (fail closed - only pre-provisioned users allowed)
        const { storage } = await import('./storage');
        const user = await storage.getUser(decodedToken.uid);
        
        if (!user) {
          console.log('WebSocket connection rejected: user not provisioned in storage');
          ws.close(1008, 'User not authorized for WebSocket access');
          return;
        }

        // Explicitly verify role is admin or vadmin
        if (user.role !== 'admin' && user.role !== 'vadmin') {
          console.log('WebSocket connection rejected: invalid role', user.role);
          ws.close(1008, 'Insufficient permissions');
          return;
        }

        ws.userId = user.id;
        ws.userEmail = user.email;
        ws.userRole = user.role;
        ws.isAlive = true;

        this.clients.set(user.id, ws);
        console.log(`WebSocket client connected: ${user.email} (${user.role})`);

        ws.on('message', (message: string) => {
          try {
            const parsed: WebSocketMessage = JSON.parse(message.toString());
            this.handleMessage(ws, parsed);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        });

        ws.on('pong', () => {
          ws.isAlive = true;
        });

        ws.on('close', () => {
          if (ws.userId) {
            this.clients.delete(ws.userId);
            console.log(`WebSocket client disconnected: ${ws.userEmail}`);
          }
        });

        ws.on('error', (error) => {
          console.error('WebSocket error:', error);
        });

        ws.send(JSON.stringify({ type: 'connected', message: 'WebSocket connection established' }));
      } catch (error) {
        console.error('Error setting up WebSocket connection:', error);
        ws.close(1011, 'Server error');
      }
    });
  }

  private handleMessage(ws: AuthenticatedWebSocket, message: WebSocketMessage) {
    switch (message.type) {
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }));
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  private startHeartbeat() {
    // AGGRESSIVE: 15 minutes (900s) ping to reduce server wake-ups by 97%
    this.pingInterval = setInterval(() => {
      this.clients.forEach((ws, userId) => {
        if (ws.isAlive === false) {
          this.clients.delete(userId);
          return ws.terminate();
        }

        ws.isAlive = false;
        ws.ping();
      });
    }, 900000); // 15 minutes - ultra-low cost mode
  }

  public broadcastToVadmins(message: WebSocketMessage) {
    this.clients.forEach((ws) => {
      if (ws.userRole === 'vadmin' && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });
  }

  public sendToUser(userId: string, message: WebSocketMessage) {
    const ws = this.clients.get(userId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  public sendToAdmin(adminId: string, message: WebSocketMessage) {
    const ws = this.clients.get(adminId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  public logoutUser(userId: string) {
    const ws = this.clients.get(userId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ 
        type: 'logout_required',
        data: { reason: 'Clock out verification completed' }
      }));
    }
  }

  public close() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    this.wss.close();
  }
}

let wsManager: WebSocketManager | null = null;

export function initializeWebSocket(server: Server): WebSocketManager {
  if (!wsManager) {
    wsManager = new WebSocketManager(server);
    console.log('WebSocket server initialized on /ws');
  }
  return wsManager;
}

export function getWebSocketManager(): WebSocketManager | null {
  return wsManager;
}

export interface WebSocketMessage {
  type?: string;
  feeds?: Record<string, any>;
  message?: string;
}

export interface MarketData {
  ltp: number | null;
  cp: number | null;
  prevClose: number | null;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface WebSocketServiceEvents {
  onConnect: () => void;
  onDisconnect: () => void;
  onError: (error: Event) => void;
  onMessage: (data: WebSocketMessage) => void;
  onStatusChange: (status: ConnectionStatus) => void;
}

import { ltp, cp, prevClose } from '../stores/market';

export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private isManualDisconnect = false;
  private eventListeners: Partial<WebSocketServiceEvents> = {};

  constructor(private url: string = 'ws://localhost:4000/stream') {}

  public connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.isManualDisconnect = false;
    this.updateStatus('connecting');

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('✅ Connected to backend WS');
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.updateStatus('connected');
        this.eventListeners.onConnect?.();
      };

      this.ws.onclose = () => {
        console.log('⚠️ Disconnected from backend WS');
        this.updateStatus('disconnected');
        this.eventListeners.onDisconnect?.();

        if (!this.isManualDisconnect) {
          this.attemptReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        this.updateStatus('error');
        this.eventListeners.onError?.(error);
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.eventListeners.onMessage?.(message);

          // Update market store when we receive feeds data
          if (message.feeds) {
            const firstFeed = Object.values(message.feeds)[0] as any;

            if (firstFeed?.fullFeed?.indexFF?.ltpc?.ltp) {
              const newLtp = firstFeed.fullFeed.indexFF.ltpc.ltp;
              ltp.set(newLtp);
              console.log('📊 Updated LTP in store:', newLtp);
            }

            if (firstFeed?.fullFeed?.indexFF?.ltpc?.cp) {
              const newCp = firstFeed.fullFeed.indexFF.ltpc.cp;
              cp.set(newCp);
              console.log('📊 Updated CP in store:', newCp);
            }

            if (firstFeed?.fullFeed?.indexFF?.ltpc?.prevClose) {
              const newPrevClose = firstFeed.fullFeed.indexFF.ltpc.prevClose;
              prevClose.set(newPrevClose);
              console.log('📊 Updated PrevClose in store:', newPrevClose);
            }
          }
        } catch (error) {
          console.error('❌ Failed to parse WebSocket message:', error);
        }
      };
    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error);
      this.updateStatus('error');
    }
  }

  public disconnect(): void {
    this.isManualDisconnect = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  public send(data: string | ArrayBuffer | Blob | ArrayBufferView): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    } else {
      console.warn('⚠️ Cannot send message: WebSocket is not connected');
    }
  }

  public getConnectionStatus(): ConnectionStatus {
    if (!this.ws) return 'disconnected';

    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CLOSING:
      case WebSocket.CLOSED:
        return 'disconnected';
      default:
        return 'disconnected';
    }
  }

  public on<K extends keyof WebSocketServiceEvents>(
    event: K,
    listener: WebSocketServiceEvents[K]
  ): void {
    this.eventListeners[event] = listener;
  }

  public off<K extends keyof WebSocketServiceEvents>(event: K): void {
    delete this.eventListeners[event];
  }

  private updateStatus(status: ConnectionStatus): void {
    this.eventListeners.onStatusChange?.(status);
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      this.updateStatus('error');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

    console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  public connectMarketFeed(): void {
    if (this.getConnectionStatus() !== 'connected') {
      console.log('🔗 Connecting to market feed...');
      this.connect();
    } else {
      console.log('✅ Market feed already connected');
    }
  }
}

// Export a singleton instance for convenience
export const wsService = new WebSocketService();

// Export connectMarketFeed function for direct import
export function connectMarketFeed(): void {
  wsService.connectMarketFeed();
}

/**
 * Message Broker - WebSocket-based Communication Layer
 *
 * Handles parent/child process communication via WebSocket.
 * Maintains connection pools, message queuing, and event routing.
 */

import { EventEmitter } from 'events';
import * as ws from 'ws';
import { Message, MessageType } from './types';
import * as uuid from 'crypto';

export interface BrokerConfig {
  port: number;
  host: string;
  messageQueueSize: number;
  connectionTimeout: number;
}

export class MessageBroker extends EventEmitter {
  private wsServer?: ws.Server;
  private connections: Map<string, ws.WebSocket> = new Map();
  private messageQueue: Map<string, Message[]> = new Map();
  private config: BrokerConfig;

  constructor(config: BrokerConfig) {
    super();
    this.config = config;
  }

  /**
   * Start the WebSocket server
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.wsServer = new ws.Server({
          port: this.config.port,
          host: this.config.host
        });

        this.wsServer.on('connection', (socket: ws.WebSocket) => {
          this.handleConnection(socket);
        });

        this.wsServer.on('error', (error) => {
          this.emit('error', error);
          reject(error);
        });

        this.wsServer.once('listening', () => {
          console.log(`[MessageBroker] Listening on ws://${this.config.host}:${this.config.port}`);
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(socket: ws.WebSocket): void {
    const clientId = this.generateClientId();
    console.log(`[MessageBroker] Client ${clientId} connected`);

    this.connections.set(clientId, socket);

    socket.on('message', (data: string) => {
      try {
        const message: Message = JSON.parse(data);
        this.emit('message', { clientId, message });
        this.routeMessage(clientId, message);
      } catch (error) {
        console.error(`[MessageBroker] Failed to parse message: ${error}`);
        this.emit('error', { clientId, error });
      }
    });

    socket.on('close', () => {
      console.log(`[MessageBroker] Client ${clientId} disconnected`);
      this.connections.delete(clientId);
      this.emit('disconnect', clientId);
    });

    socket.on('error', (error) => {
      console.error(`[MessageBroker] Socket error for ${clientId}: ${error}`);
      this.emit('error', { clientId, error });
    });
  }

  /**
   * Route message to appropriate handler
   */
  private routeMessage(clientId: string, message: Message): void {
    const targetId = message.payload?.targetId || message.taskId;

    if (this.connections.has(targetId)) {
      // Direct delivery to target
      this.send(targetId, message).catch((error) => {
        console.error(`[MessageBroker] Failed to route message: ${error}`);
        this.queueMessage(targetId, message);
      });
    } else {
      // Queue for later delivery
      this.queueMessage(targetId, message);
    }
  }

  /**
   * Send message to specific client
   */
  async send(targetId: string, message: Message): Promise<void> {
    const socket = this.connections.get(targetId);

    if (!socket || socket.readyState !== ws.OPEN) {
      throw new Error(`[MessageBroker] Target ${targetId} not connected`);
    }

    return new Promise((resolve, reject) => {
      socket.send(JSON.stringify(message), (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Broadcast message to all connected clients
   */
  async broadcast(message: Message): Promise<void> {
    const promises = Array.from(this.connections.values()).map(
      (socket) =>
        new Promise<void>((resolve) => {
          if (socket.readyState === ws.OPEN) {
            socket.send(JSON.stringify(message), () => resolve());
          } else {
            resolve();
          }
        })
    );

    await Promise.all(promises);
  }

  /**
   * Register message handler
   */
  receive(handler: (message: Message, clientId: string) => void): void {
    this.on('message', ({ clientId, message }) => {
      handler(message, clientId);
    });
  }

  /**
   * Queue message for delivery when client connects
   */
  private queueMessage(clientId: string, message: Message): void {
    if (!this.messageQueue.has(clientId)) {
      this.messageQueue.set(clientId, []);
    }

    const queue = this.messageQueue.get(clientId)!;

    if (queue.length < this.config.messageQueueSize) {
      queue.push(message);
      console.log(`[MessageBroker] Queued message for ${clientId} (queue size: ${queue.length})`);
    } else {
      console.warn(`[MessageBroker] Queue full for ${clientId}, dropping message`);
      this.emit('queue-full', { clientId, message });
    }
  }

  /**
   * Flush queued messages when client connects
   */
  private flushQueuedMessages(clientId: string): Promise<void> {
    const queue = this.messageQueue.get(clientId) || [];

    if (queue.length === 0) {
      return Promise.resolve();
    }

    console.log(`[MessageBroker] Flushing ${queue.length} queued messages for ${clientId}`);

    const promises = queue.map((message) => this.send(clientId, message));
    this.messageQueue.delete(clientId);

    return Promise.all(promises).then(() => {});
  }

  /**
   * Get broker statistics
   */
  getStats() {
    return {
      connectedClients: this.connections.size,
      queuedMessages: Array.from(this.messageQueue.entries()).reduce(
        (sum, [_, queue]) => sum + queue.length,
        0
      ),
      totalClients: this.connections.size + Array.from(this.messageQueue.keys()).length
    };
  }

  /**
   * Close broker and all connections
   */
  async close(): Promise<void> {
    return new Promise((resolve) => {
      if (this.wsServer) {
        this.wsServer.close(() => {
          console.log('[MessageBroker] Closed');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return uuid.randomUUID();
  }
}

/**
 * Create and initialize message broker
 */
export async function createMessageBroker(config: BrokerConfig): Promise<MessageBroker> {
  const broker = new MessageBroker(config);
  await broker.connect();
  return broker;
}

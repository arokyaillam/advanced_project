import type { Elysia } from "elysia";
import type { UpstoxWebSocket } from "./wsClient";

// Store connected frontend clients with proper typing
interface WebSocketClient {
  send: (data: string) => void;
  readyState?: number;
  close?: () => void;
}

const frontendClients = new Set<WebSocketClient>();

// Statistics tracking
let totalConnections = 0;
let totalMessagesReceived = 0;
let totalMessagesSent = 0;

// Store the latest market data to send to new clients
let latestMarketData: any = null;

export function setupGateway(app: Elysia, upstoxWS: UpstoxWebSocket) {
  app.ws("/stream", {
    open(ws) {
      totalConnections++;
      console.log(`🌐 UI connected to /stream (Total connections: ${totalConnections})`);
      const client = ws as WebSocketClient;
      frontendClients.add(client);

      // Send latest market data immediately to new client
      if (latestMarketData) {
        try {
          client.send(JSON.stringify(latestMarketData));
          totalMessagesSent++;
          console.log("📤 Sent latest market data to new client");
        } catch (err) {
          console.error("⚠️ Failed to send welcome data:", err);
        }
      }
    },

    message(ws, message: unknown) {
      totalMessagesReceived++;
      try {
        const messageStr = typeof message === 'string' ? message : String(message);
        console.log("📩 Client says:", messageStr);

        // Handle client messages if needed (e.g., subscription requests)
        if (messageStr.startsWith('ping')) {
          (ws as WebSocketClient).send('pong');
          totalMessagesSent++;
        }
      } catch (err) {
        console.error("⚠️ Error handling client message:", err);
      }
    },

    close(ws) {
      console.log(`❌ UI disconnected from /stream (Active clients: ${frontendClients.size - 1})`);
      frontendClients.delete(ws as WebSocketClient);
    },
  });

  if (upstoxWS) {
    // Listen to decoded data from Upstox WS
    upstoxWS.on("decoded", (decoded: any) => {
      // Store latest market data (only if it contains feeds with LTP data)
      if (decoded.feeds) {
        latestMarketData = decoded;
      }

      if (frontendClients.size === 0) {
        console.log("📡 No clients connected, skipping broadcast");
        return;
      }

      console.log(`📡 Broadcasting to ${frontendClients.size} clients`);

      // Create array to track clients to remove
      const clientsToRemove: WebSocketClient[] = [];

      // Broadcast to all connected frontend clients
      frontendClients.forEach((client) => {
        try {
          // For Elysia WebSockets, we don't need to check readyState
          // Just try to send and handle errors
          const dataToSend = JSON.stringify(decoded);
          client.send(dataToSend);
          totalMessagesSent++;
        } catch (err) {
          console.error("⚠️ Failed to send to client:", err);
          // Mark client for removal
          clientsToRemove.push(client);
        }
      });

      // Remove dead clients
      clientsToRemove.forEach(client => {
        frontendClients.delete(client);
        console.log("🧹 Removed dead client");
      });
    });

    // Handle Upstox connection events
    upstoxWS.on("close", () => {
      console.log("⚠️ Upstox connection closed, notifying frontend clients");
      broadcastToClients({
        type: "connection_status",
        status: "disconnected",
        message: "Market data connection lost"
      });
    });

    upstoxWS.on("error", (err: Error) => {
      console.error("❌ Upstox connection error:", err);
      broadcastToClients({
        type: "connection_status",
        status: "error",
        message: `Market data error: ${err.message}`
      });
    });
  }

  // Helper function to broadcast messages to all clients
  function broadcastToClients(data: any) {
    if (frontendClients.size === 0) return;

    const clientsToRemove: WebSocketClient[] = [];
    const message = JSON.stringify(data);

    frontendClients.forEach((client) => {
      try {
        client.send(message);
      } catch (err) {
        console.error("⚠️ Failed to send status to client:", err);
        clientsToRemove.push(client);
      }
    });

    // Clean up dead clients
    clientsToRemove.forEach(client => {
      frontendClients.delete(client);
    });
  }

  // Add stats endpoint
  app.get("/ws-stats", () => ({
    activeClients: frontendClients.size,
    totalConnections,
    totalMessagesReceived,
    totalMessagesSent,
    upstoxConnected: upstoxWS ? true : false
  }));
}

// Export utility functions
export function getGatewayStats() {
  return {
    activeClients: frontendClients.size,
    totalConnections,
    totalMessagesReceived,
    totalMessagesSent
  };
}

export function getActiveClientCount(): number {
  return frontendClients.size;
}

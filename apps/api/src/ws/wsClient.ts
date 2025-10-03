import WebSocket from "ws";
import { EventEmitter } from "events";
import { decodeProtobuf } from "./decoder";

export class UpstoxWebSocket extends EventEmitter {
  private ws: WebSocket;

  constructor(ws: WebSocket) {
    super();
    this.ws = ws;
  }

  send(data: any) {
    this.ws.send(data);
  }

  close() {
    this.ws.close();
  }
}

export async function connectWebSocket(wsUrl: string, instruments: string[]) {
  return new Promise<UpstoxWebSocket>((resolve, reject) => {
    const ws = new WebSocket(wsUrl, { followRedirects: true });
    const upstoxWS = new UpstoxWebSocket(ws);

    ws.on("open", () => {
      console.log("✅ Upstox WS connected");
      resolve(upstoxWS);

      // Subscribe message
      const data = {
        guid: "guid-" + Date.now(),
        method: "sub",
        data: { mode: "full", instrumentKeys: instruments },
      };
      ws.send(Buffer.from(JSON.stringify(data)));
    });

    ws.on("message", (data: Buffer) => {
      try {
        const decoded = decodeProtobuf(data);
        console.log("📈 Live Data:", JSON.stringify(decoded, null, 2));

        // Emit decoded data to gateway
        upstoxWS.emit("decoded", decoded);
      } catch (err) {
        console.error("❌ Decode error:", err);
      }
    });

    ws.on("close", () => {
      console.log("⚠️ Upstox WS closed");
      upstoxWS.emit("close");
    });

    ws.on("error", (err: Error) => {
      console.error("❌ Upstox WS error:", err);
      upstoxWS.emit("error", err);
      reject(err);
    });
  });
}

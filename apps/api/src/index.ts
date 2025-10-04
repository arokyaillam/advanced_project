import { Elysia } from "elysia";
import { getMarketFeedUrl } from "./ws/upstoxAuth";
import { initProtobuf } from "./ws/protoLoader";
import { connectWebSocket } from "./ws/wsClient";
import { setupGateway } from "./ws/wsGateway";
import dotenv from "dotenv";
dotenv.config({ path: "../../.env" });
// Environment variables are loaded by Bun automatically

(async () => {
  await initProtobuf();

  // Check if access token is provided
  const accessToken = process.env.UPSTOX_ACCESS_TOKEN;
  if (!accessToken) {
    console.error("❌ UPSTOX_ACCESS_TOKEN environment variable is required");
    process.exit(1);
  }

 try {
   const wsUrl = await getMarketFeedUrl(accessToken);
   console.log("✅ Upstox authentication successful");
   const upstoxWS = await connectWebSocket(wsUrl, ["NSE_FO|50979"]);
   console.log("✅ Connected to Upstox live market data feed");

   const app = new Elysia()
     .get("/", () => "API Server Running");

   // Setup WebSocket gateway before starting server
   setupGateway(app, upstoxWS);

   app.listen(process.env.PORT || 4000);

   console.log(
     `🦊 API + Gateway running at http://localhost:${process.env.PORT || 4000}`,
   );
 } catch (error) {
   console.error("❌ Failed to connect to Upstox:", error);
   console.error("💡 Please check your UPSTOX_ACCESS_TOKEN in .env file");
   process.exit(1);
 }
})();

<script lang="ts">
  import { onMount } from "svelte";

  let ws: WebSocket | null = null;
  let ltp: number | null = null;
  let connectionStatus = "Connecting...";
  let lastUpdate = "";
  let messageCount = 0;
  let lastMessage: any = null;


  onMount(() => {
    ws = new WebSocket("ws://localhost:4000/stream");

    ws.onopen = () => {
      console.log("✅ Connected to backend WS");
      connectionStatus = "Connected";
    };

    ws.onclose = () => {
      console.log("⚠️ Disconnected from backend WS");
      connectionStatus = "Disconnected";
    };

    ws.onerror = (error) => {
      console.error("❌ WebSocket error:", error);
      connectionStatus = "Error";
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        messageCount++;
        lastUpdate = new Date().toLocaleTimeString();
        lastMessage = msg;

        console.log("📨 Received message:", msg);

        // Handle error messages from backend
        if (msg.type === "error") {
          console.error("Backend error:", msg.message);
          connectionStatus = `Error: ${msg.message}`;
          return;
        }

        // Handle live feed data - check for feeds object directly
        if (msg.feeds) {
          console.log("🔍 Processing feeds data:", msg.feeds);
          const feedKeys = Object.keys(msg.feeds);
          console.log("📋 Feed keys:", feedKeys);

          const firstFeed = Object.values(msg.feeds)[0] as any;
          console.log("🎯 First feed data:", firstFeed);

          const newLtp = firstFeed?.fullFeed?.indexFF?.ltpc?.ltp ?? null;
          console.log("💰 Extracted LTP:", newLtp);

          if (newLtp !== null && typeof newLtp === 'number') {
            ltp = newLtp;
            console.log("✅ Updated LTP successfully:", ltp);
          } else {
            console.warn("⚠️ LTP is null or not a number:", newLtp, typeof newLtp);
          }
        } else {
          console.log("ℹ️ No feeds object in message");
        }
      } catch (e) {
        console.error("❌ Parse error:", e, "Raw data:", event.data);
      }
    };

    return () => {
      ws?.close();
    };
  });
</script>

<div class="p-6">
  <h1 class="text-2xl font-bold mb-4">📈 Live Market Data</h1>

  <!-- Connection Status -->
  <div class="mb-4 p-3 rounded-md border" class:bg-green-50={connectionStatus === "Connected"}
       class:bg-red-50={connectionStatus.includes("Error") || connectionStatus === "Disconnected"}
       class:bg-yellow-50={connectionStatus === "Connecting..."}>
    <p class="text-sm font-medium">Status: {connectionStatus}</p>
    {#if lastUpdate}
      <p class="text-xs text-gray-600">Last update: {lastUpdate}</p>
    {/if}
    <p class="text-xs text-gray-600">Messages received: {messageCount}</p>
  </div>

  <!-- Market Data -->
  <div class="bg-white p-4 rounded-md border shadow-sm mb-4">
    {#if ltp}
      <p class="text-lg font-semibold text-green-600">Nifty Bank LTP: ₹{ltp.toLocaleString()}</p>
    {:else}
      <p class="text-gray-500">Waiting for live data...</p>
    {/if}
  </div>

  <!-- Debug Section -->
  {#if lastMessage}
    <div class="bg-gray-50 p-4 rounded-md border">
      <h3 class="text-sm font-medium mb-2">🐛 Debug - Last Message:</h3>
      <pre class="text-xs bg-white p-2 rounded border overflow-auto max-h-40">{JSON.stringify(lastMessage, null, 2)}</pre>
    </div>
  {/if}
</div>

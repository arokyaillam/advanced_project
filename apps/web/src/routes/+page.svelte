<script lang="ts">
  import { onMount } from "svelte";
  import { ltp, cp, prevClose } from "$lib/stores/market";
  import { connectMarketFeed } from "$lib/services/wsService";

  onMount(() => {
    connectMarketFeed();
  });
</script>

<div class="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
  <div class="bg-card p-4 rounded shadow">
    <h2 class="text-sm text-muted-foreground">LTP</h2>
    <p class="text-2xl font-bold text-primary">{$ltp ?? "—"}</p>
  </div>

  <div class="bg-card p-4 rounded shadow">
    <h2 class="text-sm text-muted-foreground">Close Price</h2>
    <p class="text-2xl font-bold">{$cp ?? "—"}</p>
  </div>

  <div class="bg-card p-4 rounded shadow">
    <h2 class="text-sm text-muted-foreground">Prev Close</h2>
    <p class="text-2xl font-bold">{$prevClose ?? "—"}</p>
  </div>
</div>

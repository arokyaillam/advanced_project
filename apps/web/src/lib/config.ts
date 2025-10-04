// These come from root .env (SvelteKit auto-loads VITE_ prefixed vars)
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

export const WS_BASE_URL =
  import.meta.env.VITE_WS_BASE_URL || "ws://localhost:4000/stream";

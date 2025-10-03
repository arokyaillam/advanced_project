import { writable } from "svelte/store";

// Live values
export const ltp = writable<number | null>(null);
export const cp = writable<number | null>(null);
export const prevClose = writable<number | null>(null);

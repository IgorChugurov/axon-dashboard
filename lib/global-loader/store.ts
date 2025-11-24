"use client";

type Listener = (count: number) => void;

const listeners = new Set<Listener>();
let counter = 0;

function notify() {
  for (const listener of listeners) {
    listener(counter);
  }
}

export function showGlobalLoader(): void {
  counter += 1;
  notify();
}

export function hideGlobalLoader(): void {
  counter = Math.max(0, counter - 1);
  notify();
}

export function subscribeToGlobalLoader(listener: Listener): () => void {
  listeners.add(listener);
  listener(counter);
  return () => {
    listeners.delete(listener);
  };
}


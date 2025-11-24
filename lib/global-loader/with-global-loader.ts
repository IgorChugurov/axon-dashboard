"use client";

import { showGlobalLoader, hideGlobalLoader } from "./store";

export async function withGlobalLoader<T>(promise: Promise<T>): Promise<T> {
  showGlobalLoader();
  try {
    return await promise;
  } finally {
    hideGlobalLoader();
  }
}


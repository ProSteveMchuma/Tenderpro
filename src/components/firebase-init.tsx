"use client";

import { useEffect } from "react";
import { getFirebaseBrowserApp } from "@/lib/firebase/browser";

/** Initializes the Firebase web SDK with project tenderpro-480721. */
export function FirebaseInit() {
  useEffect(() => {
    getFirebaseBrowserApp();
  }, []);
  return null;
}

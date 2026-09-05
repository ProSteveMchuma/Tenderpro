"use client";

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { firebaseWebConfig } from "@/lib/firebase/config";

export function getFirebaseBrowserApp(): FirebaseApp {
  return getApps()[0] ?? initializeApp(firebaseWebConfig);
}

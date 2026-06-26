"use client";

/**
 * lib/useProfile.ts — load / autosave / save the user's profile via /api/profile.
 *
 * The API route does the encryption server-side, so this hook only ever deals
 * in plain numbers over HTTPS. It:
 *   • loads the saved profile once on mount (if logged in),
 *   • autosaves (debounced) whenever the tracked values change,
 *   • exposes a manual save() and a status for the "Saved ✓" indicator.
 *
 * If the user isn't logged in, every call no-ops quietly (status stays "idle").
 */

import { useEffect, useRef, useState, useCallback } from "react";

export type SavedPrefs = {
  retireAge?: number;
  extra?: number;
  employerRate?: number;
  inflation?: number;
  gender?: "male" | "female" | "all";
  fundIdx?: number;
};

export type ProfilePayload = {
  balance: number;
  salary: number;
  age: number;
  prefs: SavedPrefs;
};

export type SaveStatus = "idle" | "loading" | "saving" | "saved" | "error";

export function useProfile(payload: ProfilePayload, onLoaded: (p: ProfilePayload) => void) {
  const [status, setStatus] = useState<SaveStatus>("loading");
  const loadedRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- load once on mount --------------------------------------------------
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/profile");
        if (res.status === 401) { if (active) setStatus("idle"); return; }
        if (!res.ok) { if (active) setStatus("error"); return; }
        const json = await res.json();
        if (active && json.profile) {
          onLoaded(json.profile as ProfilePayload);
        }
        if (active) { loadedRef.current = true; setStatus("idle"); }
      } catch {
        if (active) setStatus("error");
      }
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- manual save ---------------------------------------------------------
  const save = useCallback(async () => {
    setStatus("saving");
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.status === 401) { setStatus("idle"); return; }
      if (!res.ok) { setStatus("error"); return; }
      setStatus("saved");
      setTimeout(() => setStatus((s) => (s === "saved" ? "idle" : s)), 2000);
    } catch {
      setStatus("error");
    }
  }, [payload]);

  // ---- debounced autosave on change ---------------------------------------
  useEffect(() => {
    if (!loadedRef.current) return; // don't autosave the defaults before load finishes
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { save(); }, 1200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(payload)]);

  return { status, save };
}

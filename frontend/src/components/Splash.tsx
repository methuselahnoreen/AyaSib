"use client";

import { useEffect, useState } from "react";

// Shows the logo on a cream screen when the app first loads, then fades out.
const VISIBLE_MS = 1200; // how long the logo stays fully visible
const FADE_MS = 400; // length of the fade-out

export function Splash() {
  const [phase, setPhase] = useState<"visible" | "fading" | "gone">("visible");

  useEffect(() => {
    const fade = setTimeout(() => setPhase("fading"), VISIBLE_MS);
    const done = setTimeout(() => setPhase("gone"), VISIBLE_MS + FADE_MS);
    return () => {
      clearTimeout(fade);
      clearTimeout(done);
    };
  }, []);

  if (phase === "gone") return null;

  return (
    <div className={`splash ${phase === "fading" ? "splash-hide" : ""}`} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="splash-logo" src="/logo.svg" alt="" width={240} height={240} />
    </div>
  );
}

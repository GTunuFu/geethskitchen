"use client";
import { useCallback, useEffect, useRef, useState } from "react";

function ChefHat() {
  return (
    <svg className="hat" viewBox="0 0 120 96" aria-hidden>
      <g stroke="#1a1110" strokeWidth="5" fill="#fff">
        <circle cx="32" cy="46" r="24" />
        <circle cx="60" cy="32" r="30" />
        <circle cx="88" cy="46" r="24" />
      </g>
      <g fill="#fff">
        <circle cx="32" cy="46" r="21.5" />
        <circle cx="60" cy="32" r="27.5" />
        <circle cx="88" cy="46" r="21.5" />
        <rect x="24" y="44" width="72" height="20" />
      </g>
      <path d="M44 22 q6 -6 14 -4" stroke="#1a1110" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".35" />
      <rect x="22" y="58" width="76" height="30" rx="6" fill="#fff" stroke="#1a1110" strokeWidth="5" />
      <path d="M40 62 v22 M60 62 v22 M80 62 v22" stroke="#1a1110" strokeWidth="3" strokeLinecap="round" opacity=".55" />
    </svg>
  );
}

function Spring() {
  return (
    <svg className="spring" viewBox="0 0 26 22" aria-hidden>
      <path d="M13 0 L4 4 L22 8 L4 12 L22 16 L13 22" stroke="#1a1110" strokeWidth="3" fill="none" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function Body({ label, accent }: { label: string; accent: string }) {
  return (
    <svg className="body" viewBox="0 0 100 92" aria-hidden>
      {/* chef coat */}
      <path d="M22 8 Q50 -2 78 8 L90 52 L10 52 Z" fill="#fff" stroke="#1a1110" strokeWidth="4" strokeLinejoin="round" />
      <path d="M38 6 L50 22 L62 6 Z" fill={accent} stroke="#1a1110" strokeWidth="3.5" strokeLinejoin="round" />
      <g fill="#1a1110">
        <circle cx="41" cy="30" r="3" />
        <circle cx="59" cy="30" r="3" />
        <circle cx="41" cy="43" r="3" />
        <circle cx="59" cy="43" r="3" />
      </g>
      {/* pedestal */}
      <rect x="2" y="54" width="96" height="34" rx="10" fill={accent} stroke="#1a1110" strokeWidth="4" />
      <text x="50" y="77" textAnchor="middle" fontFamily="'Dela Gothic One', 'Arial Black', sans-serif" fontSize="15" fill="#fff" stroke="#1a1110" strokeWidth="3" paintOrder="stroke">
        {label}
      </text>
    </svg>
  );
}

const LINES = {
  geeth: ["Yes chef!", "Order up!", "Mise en place!", "おいしい!", "Taste this!", "Heard!"],
  her: ["I'm hungry!", "Feed me!", "いただきます!", "Yum yum!", "5 stars?", "Snack time?"],
};

function Bobble({ who, side, label, accent, hatTop, hatTilt }: { who: "geeth" | "her"; side: "left" | "right"; label: string; accent: string; hatTop: string; hatTilt: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [line, setLine] = useState<string | null>(null);
  const timer = useRef<any>(null);

  const boing = useCallback((say?: string | null) => {
    const el = ref.current;
    if (!el) return;
    el.classList.remove("boing");
    void el.offsetWidth;
    el.classList.add("boing");
    if (say !== null) {
      const pool = LINES[who];
      setLine(say || pool[Math.floor(Math.random() * pool.length)]);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setLine(null), 1800);
    }
  }, [who]);

  useEffect(() => {
    const onBoing = (e: Event) => {
      const d = (e as CustomEvent).detail || {};
      if (!d.who || d.who === who) setTimeout(() => boing(d.say?.[who]), who === "her" ? 120 : 0);
    };
    window.addEventListener("gk:boing", onBoing);
    const idle = setInterval(() => Math.random() < 0.35 && boing(null), 7000 + (who === "her" ? 1500 : 0));
    return () => {
      window.removeEventListener("gk:boing", onBoing);
      clearInterval(idle);
    };
  }, [boing, who]);

  return (
    <div className={`bobble ${side}`}>
      {line && <div className="bubble">{line}</div>}
      <div ref={ref} className="head-wrap" onClick={() => boing()} onAnimationEnd={(e) => e.currentTarget.classList.remove("boing")} style={{ ["--hat-top" as any]: hatTop, ["--hat-tilt" as any]: hatTilt }}>
        <ChefHat />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="head" src={`/heads/${who}.png`} alt={who === "geeth" ? "Chef Geeth" : "Head taster"} draggable={false} />
      </div>
      <Spring />
      <Body label={label} accent={accent} />
    </div>
  );
}

export function boingAll(say?: { geeth?: string; her?: string }) {
  window.dispatchEvent(new CustomEvent("gk:boing", { detail: { say } }));
}

export default function Bobbleheads() {
  return (
    <>
      <Bobble who="geeth" side="left" label="CHEF" accent="#ff4a1c" hatTop="-24%" hatTilt="-8deg" />
      <Bobble who="her" side="right" label="CRITIC" accent="#2b4cff" hatTop="-28%" hatTilt="7deg" />
    </>
  );
}

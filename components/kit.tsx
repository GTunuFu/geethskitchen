"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AppState, Dish } from "@/lib/data";
import { cardColor, cuisineEmoji, FLAVORS } from "@/lib/constants";

/* ---------------- data ---------------- */
export type ClientState = AppState & { role: "chef" | "her" };

export function useAppState(pollMs = 15000) {
  const [state, setState] = useState<ClientState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/state", { cache: "no-store" });
      if (r.status === 401) {
        location.href = "/";
        return;
      }
      const j = await r.json();
      if (j.error) throw new Error(j.error);
      setState(j);
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Could not load");
    }
  }, []);
  useEffect(() => {
    load();
    const t = setInterval(load, pollMs);
    const vis = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", vis);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", vis);
    };
  }, [load, pollMs]);
  return { state, error, reload: load };
}

export async function act(type: string, payload: Record<string, unknown> = {}) {
  const r = await fetch("/api/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, ...payload }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(j.error || "Something burned 🔥");
  return j;
}

/* ---------------- images ---------------- */
export async function compressImage(file: File, max = 1100, quality = 0.8): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("Couldn't read that photo"));
      i.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function PhotoPicker({ value, onChange, label = "Add a photo" }: { value: string | null; onChange: (v: string | null) => void; label?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setBusy(true);
          try {
            onChange(await compressImage(f));
          } finally {
            setBusy(false);
            e.target.value = "";
          }
        }}
      />
      {value ? (
        <div style={{ position: "relative" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" style={{ borderRadius: 16, border: "3px solid var(--ink)", maxHeight: 220, width: "100%", objectFit: "cover" }} />
          <button type="button" className="btn small white" style={{ position: "absolute", top: 8, right: 8 }} onClick={() => onChange(null)}>
            ✕ Remove
          </button>
        </div>
      ) : (
        <button type="button" className="btn white block" onClick={() => ref.current?.click()} disabled={busy}>
          📸 {busy ? "Squishing photo…" : label}
        </button>
      )}
    </div>
  );
}

/* ---------------- chrome ---------------- */
export function Marquee({ items }: { items: string[] }) {
  const line = items.join("  ★  ") + "  ★  ";
  return (
    <div className="marquee" aria-hidden>
      <span>
        {line}
        {line}
        {line}
        {line}
      </span>
    </div>
  );
}

export function Masthead({ sub, left, right }: { sub: string; left: string; right: string }) {
  return (
    <header className="masthead">
      <span className="sticker s1">{left}</span>
      <span className="sticker s2">{right}</span>
      <h1 className="display">
        Geeth&apos;s
        <br />
        Kitchen
      </h1>
      <div className="sub jp">{sub}</div>
    </header>
  );
}

export function TabBar<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string; icon: string; dot?: number }[]; value: T; onChange: (t: T) => void }) {
  return (
    <nav className="tabbar">
      <div className="inner">
        {tabs.map((t) => (
          <button key={t.id} className={value === t.id ? "on" : ""} onClick={() => onChange(t.id)}>
            <span className="i">{t.icon}</span>
            {t.label}
            {!!t.dot && <span className="dot">{t.dot}</span>}
          </button>
        ))}
      </div>
    </nav>
  );
}

export function SectionTitle({ children, tag }: { children: React.ReactNode; tag?: string }) {
  return (
    <div className="section-title">
      <h2 className="display">{children}</h2>
      {tag && <span className="tag display">{tag}</span>}
    </div>
  );
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);
  if (!open) return null;
  return (
    <div className="sheet-bg" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="grab" />
        <div className="row" style={{ alignItems: "flex-start" }}>
          <h2 className="grow">{title}</h2>
          <button className="btn small white" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------------- feedback ---------------- */
export function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  const t = useRef<any>(null);
  const show = useCallback((m: string) => {
    setMsg(m);
    clearTimeout(t.current);
    t.current = setTimeout(() => setMsg(null), 2600);
  }, []);
  const node = msg ? <div className="toast">{msg}</div> : null;
  return { show, node };
}

export function confetti(emojis = ["🍝", "🌮", "🍜", "⭐", "💖", "🍣", "🥟", "✨"]) {
  const root = document.createElement("div");
  root.className = "confetti";
  for (let i = 0; i < 34; i++) {
    const s = document.createElement("span");
    s.textContent = emojis[i % emojis.length];
    s.style.left = Math.random() * 100 + "vw";
    s.style.animationDuration = 1.6 + Math.random() * 1.6 + "s";
    s.style.animationDelay = Math.random() * 0.5 + "s";
    s.style.fontSize = 20 + Math.random() * 22 + "px";
    root.appendChild(s);
  }
  document.body.appendChild(root);
  setTimeout(() => root.remove(), 4000);
}

export function Splash({ title, sub, onDone }: { title: string; sub?: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1900);
    return () => clearTimeout(t);
  }, [onDone]);
  const pts: string[] = [];
  for (let i = 0; i < 32; i++) {
    const r = i % 2 ? 36 : 50;
    const a = (i / 32) * Math.PI * 2;
    pts.push(`${50 + r * Math.cos(a)},${50 + r * Math.sin(a)}`);
  }
  return (
    <div className="splash">
      <div className="burst-shape">
        <svg viewBox="0 0 100 100">
          <polygon points={pts.join(" ")} fill="#ff4a1c" stroke="#1a1110" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
        <div className="txt">
          {title}
          {sub && <small>{sub}</small>}
        </div>
      </div>
    </div>
  );
}

/* ---------------- dishes ---------------- */
export function Stars({ value, onChange, small }: { value: number; onChange: (n: number) => void; small?: boolean }) {
  return (
    <div className={`stars ${small ? "sm" : ""}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" className={n <= value ? "on" : ""} onClick={() => onChange(n)} aria-label={`${n} stars`}>
          ⭐
        </button>
      ))}
    </div>
  );
}

export function starText(n: number | null | undefined) {
  if (!n) return "";
  return "★".repeat(Math.round(n)) + "☆".repeat(5 - Math.round(n));
}

export function DishArt({ dish, className = "ph" }: { dish: Pick<Dish, "id" | "imageId" | "cuisine">; className?: string }) {
  return (
    <div className={`${className} ${dish.imageId ? "has-img" : ""}`} style={{ background: cardColor(dish.id) }}>
      {dish.imageId ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/api/img/${dish.imageId}`} alt="" loading="lazy" />
      ) : (
        <span>{cuisineEmoji(dish.cuisine)}</span>
      )}
    </div>
  );
}

export function DishCard({ dish, onClick, selected, showStats = true }: { dish: Dish; onClick?: () => void; selected?: boolean; showStats?: boolean }) {
  return (
    <button type="button" className={`dish ${selected ? "selected" : ""}`} onClick={onClick}>
      {selected && <span className="check">✓</span>}
      {showStats && dish.timesCooked >= 2 && <span className="badge">REGULAR ×{dish.timesCooked}</span>}
      {showStats && dish.avgStars != null && <span className="stars-badge">★ {dish.avgStars.toFixed(1)}</span>}
      <DishArt dish={dish} />
      <div className="meta">
        <div className="name">{dish.name}</div>
        <div className="sub">
          {[dish.cuisine, dish.meal === "both" ? "lunch / dinner" : dish.meal].filter(Boolean).join(" · ")}
        </div>
      </div>
    </button>
  );
}

export function FlavorChips({ value, onChange, options = FLAVORS, variant = "" }: { value: string[]; onChange: (v: string[]) => void; options?: string[]; variant?: string }) {
  return (
    <div className="row wrap" style={{ gap: 7 }}>
      {options.map((f) => {
        const on = value.includes(f);
        return (
          <span key={f} className={`chip ${variant} ${on ? "on" : ""}`} onClick={() => onChange(on ? value.filter((x) => x !== f) : [...value, f])}>
            {f}
          </span>
        );
      })}
    </div>
  );
}

export function timeAgo(iso: string | null) {
  if (!iso) return "";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  const d = Math.floor(s / 86400);
  return d === 1 ? "yesterday" : `${d}d ago`;
}

/* ---------------- push ---------------- */
function urlB64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function usePush() {
  const [status, setStatus] = useState<"unsupported" | "needs-install" | "default" | "granted" | "denied" | "loading">("loading");
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return setStatus("unsupported");
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (!("PushManager" in window) || !("Notification" in window)) return setStatus(isIOS && !standalone ? "needs-install" : "unsupported");
    if (Notification.permission === "granted") {
      setStatus("granted");
      // keep the subscription fresh on the server
      subscribe().catch(() => {});
    } else setStatus(Notification.permission === "denied" ? "denied" : "default");
  }, []);

  const subscribe = useCallback(async () => {
    const reg = await navigator.serviceWorker.ready;
    const { publicKey } = await (await fetch("/api/push")).json();
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(publicKey) });
    await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription: sub }) });
  }, []);

  const enable = useCallback(async () => {
    const p = await Notification.requestPermission();
    if (p === "granted") {
      await subscribe();
      setStatus("granted");
      return true;
    }
    setStatus(p === "denied" ? "denied" : "default");
    return false;
  }, [subscribe]);

  const test = useCallback(async () => {
    await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ test: true }) });
  }, []);

  return { status, enable, test };
}

export function PushCard({ who }: { who: "chef" | "her" }) {
  const { status, enable, test } = usePush();
  const [sent, setSent] = useState(false);
  if (status === "loading" || status === "unsupported") return null;
  if (status === "granted")
    return (
      <div className="row" style={{ justifyContent: "center" }}>
        <button
          className="btn small white"
          onClick={async () => {
            await test();
            setSent(true);
          }}
        >
          🔔 {sent ? "Sent! Check your lock screen" : "Send me a test ping"}
        </button>
      </div>
    );
  return (
    <div className="banner yellow">
      <h3>🔔 Turn on pings</h3>
      {status === "needs-install" ? (
        <p>
          Tap <b>Share</b> → <b>Add to Home Screen</b>, open {who === "chef" ? "GK Chef" : "Geeth's Kitchen"} from your home screen, then come back here to switch on notifications.
        </p>
      ) : status === "denied" ? (
        <p>Notifications are blocked. Turn them on in Settings → Notifications for this app.</p>
      ) : (
        <>
          <p style={{ marginBottom: 12 }}>{who === "her" ? "So you know the second a menu drops." : "So you know the second she picks."}</p>
          <button className="btn ink" onClick={enable}>
            Allow notifications
          </button>
        </>
      )}
    </div>
  );
}

export async function logout() {
  await fetch("/api/logout", { method: "POST" });
  location.href = "/";
}

/* ---------------- eat-out counter ---------------- */
export function EatOutCounter({ total, month }: { total: number; month: number }) {
  return (
    <div className="eatout-counter">
      <div className="eo-label display">Eat-out<br />counter</div>
      <div className="eo-num display">{total}</div>
      <div className="eo-sub">{month} this month</div>
    </div>
  );
}

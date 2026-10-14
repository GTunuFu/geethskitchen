"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

type Msg = { id: number; sender: "chef" | "her"; body: string; createdAt: string; pending?: boolean };

const QUICK = ["❤️", "On my way!", "Dinner's ready 🍽️", "5 more min 🙏", "😋", "Love you"];

function dayLabel(d: Date) {
  const t = new Date();
  const y = new Date(t);
  y.setDate(t.getDate() - 1);
  if (d.toDateString() === t.toDateString()) return "Today";
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export default function Chat({ me, herName, onSeen }: { me: "chef" | "her"; herName: string; onSeen?: () => void }) {
  const [msgs, setMsgs] = useState<Msg[] | null>(null);
  const [lastReadMine, setLastReadMine] = useState(0);
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [kb, setKb] = useState(0);
  const lastId = useRef(0);
  const firstLoad = useRef(true);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/messages", { cache: "no-store" });
      if (!r.ok) return;
      const j = await r.json();
      setLastReadMine(j.lastReadMine);
      setMsgs((prev) => {
        const pending = (prev || []).filter((m) => m.pending);
        return [...j.messages, ...pending];
      });
      const newest = j.messages.length ? j.messages[j.messages.length - 1].id : 0;
      if (newest !== lastId.current) {
        lastId.current = newest;
        onSeen?.();
      }
    } catch {}
  }, [onSeen]);

  useEffect(() => {
    load();
    const t = setInterval(load, 3000);
    const vis = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", vis);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", vis);
    };
  }, [load]);

  // keep the composer above the iPhone keyboard
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const on = () => setKb(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
    vv.addEventListener("resize", on);
    vv.addEventListener("scroll", on);
    return () => {
      vv.removeEventListener("resize", on);
      vv.removeEventListener("scroll", on);
    };
  }, []);

  // scroll to newest
  const count = msgs?.length || 0;
  useLayoutEffect(() => {
    if (!count) return;
    window.scrollTo({ top: document.body.scrollHeight, behavior: firstLoad.current ? "auto" : "smooth" });
    firstLoad.current = false;
  }, [count, kb]);

  const send = async (body: string) => {
    const t = body.trim();
    if (!t) return;
    setErr(null);
    const temp: Msg = { id: -Date.now(), sender: me, body: t, createdAt: new Date().toISOString(), pending: true };
    setMsgs((m) => [...(m || []), temp]);
    setText("");
    try {
      const r = await fetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: t }) });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Didn't send");
      setMsgs((m) => (m || []).filter((x) => x.id !== temp.id));
      await load();
    } catch (e: any) {
      setMsgs((m) => (m || []).filter((x) => x.id !== temp.id));
      setText(t);
      setErr(e.message || "Didn't send. Try again?");
    }
  };

  const other = me === "chef" ? "her" : "chef";
  const otherName = me === "chef" ? herName : "Chef";
  let lastDay = "";
  const lastMine = [...(msgs || [])].reverse().find((m) => m.sender === me && !m.pending);

  return (
    <div className="section chat">
      <div className="chat-head">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/heads/${other === "chef" ? "geeth" : "her"}.png`} alt="" />
        <div>
          <div className="display" style={{ fontSize: 22 }}>{otherName}</div>
          <div className="muted" style={{ fontWeight: 800 }}>{me === "chef" ? "Table for two 💬" : "Your personal chef 💬"}</div>
        </div>
      </div>

      {msgs === null ? (
        <p className="center muted">Loading…</p>
      ) : msgs.length === 0 ? (
        <div className="empty">
          <div className="big">💬</div>
          <p><b>No messages yet.</b><br />Say hi to {otherName}!</p>
        </div>
      ) : (
        <div className="chat-list">
          {msgs.map((m, i) => {
            const d = new Date(m.createdAt);
            const day = dayLabel(d);
            const showDay = day !== lastDay;
            lastDay = day;
            const mine = m.sender === me;
            const next = msgs[i + 1];
            const tail = !next || next.sender !== m.sender || dayLabel(new Date(next.createdAt)) !== day;
            return (
              <div key={m.id}>
                {showDay && <div className="chat-day">{day}</div>}
                <div className={`bubble-row ${mine ? "mine" : "theirs"}`}>
                  <div className={`chat-bubble ${mine ? "mine" : "theirs"} ${tail ? "tail" : ""} ${m.pending ? "pending" : ""}`}>
                    {m.body}
                    <span className="chat-time">{d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</span>
                  </div>
                </div>
                {lastMine && m.id === lastMine.id && (
                  <div className="chat-receipt">{lastReadMine >= m.id ? "Seen 👀" : "Delivered"}</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="composer" style={kb ? { bottom: kb } : undefined}>
        <div className="composer-inner">
          {!text && (
            <div className="quick">
              {QUICK.map((q) => (
                <button key={q} className="chip" onClick={() => send(q)}>{q}</button>
              ))}
            </div>
          )}
          {err && <div style={{ color: "var(--tomato)", fontWeight: 900, fontSize: 13, padding: "0 4px 6px" }}>{err}</div>}
          <form
            className="row"
            onSubmit={(e) => {
              e.preventDefault();
              send(text);
            }}
          >
            <input className="input grow" placeholder={`Message ${otherName}…`} value={text} onChange={(e) => setText(e.target.value)} enterKeyHint="send" />
            <button className="btn tomato" type="submit" disabled={!text.trim()} aria-label="Send">➤</button>
          </form>
        </div>
      </div>
    </div>
  );
}

"use client";
import { useState } from "react";
import Bobbleheads from "@/components/Bobbleheads";
import { Marquee, Masthead } from "@/components/kit";

export default function Login({ herName, initial }: { herName: string; initial: "chef" | "her" | null }) {
  const [role, setRole] = useState<"chef" | "her" | null>(initial);
  const [pin, setPin] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  const submit = async (p: string) => {
    const r = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role, pin: p }) });
    const j = await r.json().catch(() => ({}));
    if (r.ok) {
      location.href = `/${role}`;
    } else {
      setErr(j.error || "Nope!");
      setShake(true);
      setTimeout(() => {
        setShake(false);
        setPin("");
      }, 450);
    }
  };

  const press = (k: string) => {
    setErr(null);
    if (k === "⌫") return setPin(pin.slice(0, -1));
    const next = (pin + k).slice(0, 4);
    setPin(next);
    if (next.length === 4) submit(next);
  };

  return (
    <div className="login">
      <Marquee items={["WELCOME", "いらっしゃいませ", "TABLE FOR TWO", "NONSTOP DELICIOUSNESS", "おいしい", "RESERVATIONS ONLY"]} />
      <div className="shell" style={{ paddingBottom: 200 }}>
        <Masthead sub="ギースのキッチン · RESERVATIONS ONLY" left="OPEN!" right="2 SEATS" />
        <div className="section stack">
          {!role ? (
            <>
              <h2 className="display center" style={{ fontSize: 26, margin: "8px 0" }}>Who&apos;s there?</h2>
              <button className="btn huge tomato block" onClick={() => setRole("chef")}>🧑‍🍳 I&apos;m the chef</button>
              <button className="btn huge pink block" onClick={() => setRole("her")}>💖 I&apos;m {herName}</button>
            </>
          ) : (
            <>
              <h2 className="display center" style={{ fontSize: 24, margin: "8px 0 0" }}>{role === "chef" ? "Chef's PIN" : `Hi ${herName}! Your PIN`}</h2>
              <div className={`pin-dots ${shake ? "shake" : ""}`}>
                {[0, 1, 2, 3].map((i) => <span key={i} className={i < pin.length ? "on" : ""} />)}
              </div>
              {err && <p className="center" style={{ color: "var(--tomato)", fontWeight: 900, margin: 0 }}>{err}</p>}
              <div className="pinpad">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((k, i) =>
                  k ? <button key={i} onClick={() => press(k)}>{k}</button> : <span key={i} />
                )}
              </div>
              <button className="btn small white" style={{ alignSelf: "center" }} onClick={() => { setRole(null); setPin(""); }}>← back</button>
            </>
          )}
        </div>
      </div>
      <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, height: 0, ["--bobble-lift" as any]: "14px" }}>
        <Bobbleheads />
      </div>
    </div>
  );
}

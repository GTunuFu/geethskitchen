"use client";
import { useEffect, useMemo, useState } from "react";
import Bobbleheads, { boingAll } from "@/components/Bobbleheads";
import {
  act,
  confetti,
  DishArt,
  DishCard,
  FlavorChips,
  logout,
  Marquee,
  Masthead,
  PhotoPicker,
  PushCard,
  EatOutCounter,
  SectionTitle,
  Sheet,
  Splash,
  Stars,
  starText,
  TabBar,
  timeAgo,
  useAppState,
  useToast,
  type ClientState,
} from "@/components/kit";
import { CUISINES, cuisineEmoji, FLAVORS } from "@/lib/constants";
import type { Ask, Dish } from "@/lib/data";

type Tab = "today" | "menu" | "crave" | "diary";

function seenAsks(): number[] {
  try {
    return JSON.parse(localStorage.getItem("gk_seen_asks") || "[]");
  } catch {
    return [];
  }
}
function markSeen(ids: number[]) {
  try {
    localStorage.setItem("gk_seen_asks", JSON.stringify([...new Set([...seenAsks(), ...ids])].slice(-100)));
  } catch {}
}

export default function HerApp({ herName }: { herName: string }) {
  const { state, reload, error } = useAppState(10000);
  const [tab, setTab] = useState<Tab>("today");
  const [splash, setSplash] = useState<{ title: string; sub?: string } | null>(null);
  const [requestFor, setRequestFor] = useState<{ askId?: number; meal?: string; text?: string } | null>(null);
  const toast = useToast();

  // Big "NEW MENU!!" moment when a fresh menu arrives
  useEffect(() => {
    if (!state) return;
    const open = state.asks.filter((a) => a.status === "open");
    const seen = seenAsks();
    const fresh = open.filter((a) => !seen.includes(a.id));
    if (fresh.length) {
      setTab("today");
      setSplash({ title: "NEW MENU!!", sub: fresh[0].meal === "lunch" ? "ランチ · LUNCH" : "ディナー · DINNER" });
      setTimeout(() => boingAll({ geeth: "Order up!", her: "Ooooh!" }), 400);
      markSeen(fresh.map((a) => a.id));
    }
    const rate = state.asks.filter((a) => a.status === "cooked" && !seen.includes(-a.id));
    if (rate.length && !fresh.length) {
      setTab("today");
      setSplash({ title: "RATE IT!", sub: "評価 · HOW WAS IT?" });
      markSeen(rate.map((a) => -a.id));
    }
  }, [state]);

  const run = async (fn: () => Promise<unknown>, msg?: string, celebrate = false) => {
    try {
      await fn();
      if (msg) toast.show(msg);
      if (celebrate) {
        boingAll();
        confetti();
      }
      await reload();
    } catch (e: any) {
      toast.show(e.message);
    }
  };

  const pending = state ? state.asks.filter((a) => a.status === "open" || a.status === "cooked").length : 0;

  return (
    <>
      <Marquee items={[`HI ${herName.toUpperCase()}`, "いただきます", "WHAT ARE YOU CRAVING?", "NONSTOP DELICIOUSNESS", "おいしい", "TABLE FOR TWO", "GIMME DAT DINNER"]} />
      <div className="shell">
        <Masthead sub="ギースのキッチン · TABLE FOR TWO" left="YUM!" right="♡ 4 U" />
        {error && !state && <div className="section"><div className="empty">😵 {error}</div></div>}
        {!state ? (
          <div className="section center muted">Preheating…</div>
        ) : (
          <>
            {tab === "today" && <Today state={state} herName={herName} run={run} onRequest={setRequestFor} />}
            {tab === "menu" && <Browse state={state} onRequest={(d) => setRequestFor({ text: d.name })} />}
            {tab === "crave" && (
              <div className="section">
                <SectionTitle tag="食べたい">Crave</SectionTitle>
                <RequestForm onDone={(msg) => { toast.show(msg); boingAll({ geeth: "Heard!", her: "Pleeease" }); reload(); }} />
              </div>
            )}
            {tab === "diary" && <Diary state={state} />}
          </>
        )}
        <div className="section center">
          <button className="btn small white" onClick={logout}>Log out</button>
        </div>
      </div>

      <TabBar<Tab>
        value={tab}
        onChange={(t) => {
          setTab(t);
          window.scrollTo({ top: 0 });
        }}
        tabs={[
          { id: "today", label: "Today", icon: "🍽️", dot: pending },
          { id: "menu", label: "Menu", icon: "📖" },
          { id: "crave", label: "Crave", icon: "🤤" },
          { id: "diary", label: "Diary", icon: "⭐" },
        ]}
      />
      <Bobbleheads />

      {requestFor && (
        <Sheet open onClose={() => setRequestFor(null)} title={requestFor.askId ? "Not feelin' it?" : "Request it"}>
          <RequestForm
            askId={requestFor.askId}
            meal={requestFor.meal}
            initialText={requestFor.text}
            initialMode={requestFor.text ? "specific" : "cuisine"}
            onDone={(msg) => {
              setRequestFor(null);
              toast.show(msg);
              boingAll({ geeth: "Heard!", her: "Pleeease" });
              reload();
            }}
          />
        </Sheet>
      )}
      {splash && <Splash title={splash.title} sub={splash.sub} onDone={() => setSplash(null)} />}
      {toast.node}
    </>
  );
}

/* ============ TODAY ============ */
function Today({ state, herName, run, onRequest }: { state: ClientState; herName: string; run: any; onRequest: (r: { askId?: number; meal?: string }) => void }) {
  const toRate = state.asks.filter((a) => a.status === "cooked");
  const open = state.asks.filter((a) => a.status === "open");
  const picked = state.asks.filter((a) => a.status === "picked");
  const requested = state.asks.filter((a) => a.status === "requested");
  const dish = (id: number | null) => state.dishes.find((d) => d.id === id);
  const nothing = !toRate.length && !open.length && !picked.length && !requested.length;
  const hour = new Date().getHours();
  const greet = hour < 11 ? "Good morning" : hour < 17 ? "Hey hungry" : "Good evening";
  const [eatSheet, setEatSheet] = useState<"lunch" | "dinner" | null>(null);
  const defaultMeal = hour < 15 ? "lunch" : "dinner";
  const notHungry = () => run(() => act("notHungry"), "Got it. Chef stands down 😴");

  return (
    <div className="section stack">
      <div className="banner burst">
        <h3 style={{ fontSize: 28 }}>{greet},<br />{herName}! 💖</h3>
        <p>Your personal chef is standing by.</p>
      </div>

      {state.hunger ? (
        <div className="banner" style={{ background: "var(--tomato)", color: "#fff" }}>
          <span className="pill" style={{ background: "#fff", color: "var(--ink)" }}>sent {timeAgo(state.hunger.createdAt)}</span>
          <h3 style={{ marginTop: 10 }}>🚨 Hangry alert sent!</h3>
          <p>The chef has been warned. A menu is on its way.</p>
          <button className="btn small white" style={{ marginTop: 12 }} onClick={notHungry}>😴 Not hungry anymore</button>
        </div>
      ) : (
        !open.length && (
          <button
            className="btn tomato huge block hungry-btn"
            onClick={() => run(() => act("hungry"), "Chef has been alerted 🚨", true)}
          >
            🥟 I&apos;m hungry!!
          </button>
        )
      )}

      <EatOutCard state={state} run={run} onOpen={() => setEatSheet(defaultMeal)} />

      <PushCard who="her" />

      {toRate.map((a) => (
        <RateCard key={a.id} ask={a} dish={dish(a.pickedDishId)} run={run} />
      ))}

      {open.map((a) => (
        <MenuDrop key={a.id} ask={a} dishes={a.options.map(dish).filter(Boolean) as Dish[]} run={run} onRequest={() => onRequest({ askId: a.id, meal: a.meal })} onEatOut={() => setEatSheet(a.meal)} onNotHungry={notHungry} />
      ))}

      {picked.map((a) => (
        <div key={a.id} className="banner mint">
          <span className="pill" style={{ background: "#fff", color: "var(--ink)" }}>{a.meal}</span>
          <div className="row" style={{ marginTop: 10 }}>
            {dish(a.pickedDishId) && <DishArt dish={dish(a.pickedDishId)!} className="mini-ph" />}
            <div>
              <h3>Chef&apos;s on it! 🔥</h3>
              <p>{dish(a.pickedDishId)?.name} coming right up.</p>
            </div>
          </div>
        </div>
      ))}

      {requested.map((a) => (
        <div key={a.id} className="banner blue">
          <h3>Request sent 📨</h3>
          <p>The chef is reconsidering his {a.meal} life choices.</p>
        </div>
      ))}

      {nothing && (
        <div className="empty">
          <div className="big">🧑‍🍳💭</div>
          <p><b>No menu yet.</b><br />The chef is plotting. Got a craving?</p>
          <button className="btn tomato" style={{ marginTop: 8 }} onClick={() => onRequest({})}>Tell him what you want</button>
        </div>
      )}
      {eatSheet && <EatOutSheet meal={eatSheet} run={run} onClose={() => setEatSheet(null)} />}
    </div>
  );
}

function MenuDrop({ ask, dishes, run, onRequest, onEatOut, onNotHungry }: { ask: Ask; dishes: Dish[]; run: any; onRequest: () => void; onEatOut: () => void; onNotHungry: () => void }) {
  const [peek, setPeek] = useState<Dish | null>(null);
  return (
    <div className="stack">
      <div className="center" style={{ marginTop: 6 }}>
        <span className="pill" style={{ background: "var(--ink)", color: "var(--butter)", fontSize: 12, padding: "5px 12px" }}>
          {ask.meal === "lunch" ? "🍱 TODAY'S LUNCH" : "🍝 TONIGHT'S DINNER"} · {timeAgo(ask.createdAt)}
        </span>
        <h2 className="display" style={{ fontSize: 34, margin: "12px 0 0", color: "var(--tomato)", WebkitTextStroke: "2px var(--ink)", paintOrder: "stroke fill", textShadow: "3px 3px 0 var(--ink)" }}>
          What are you craving?
        </h2>
        {ask.note && <p style={{ fontWeight: 800, margin: "8px 0 0" }}>Chef says: &ldquo;{ask.note}&rdquo;</p>}
      </div>
      <div className="dish-grid">
        {dishes.map((d) => (
          <DishCard key={d.id} dish={d} onClick={() => setPeek(d)} />
        ))}
      </div>
      <button className="btn white block" onClick={onRequest}>🙅‍♀️ None of these. I want something else</button>
      <div className="row">
        <button className="btn grow" style={{ background: "var(--grape)", color: "#fff" }} onClick={onEatOut}>🍽️ Let&apos;s eat out?</button>
        <button className="btn white grow" onClick={onNotHungry}>😴 Not hungry</button>
      </div>
      {peek && (
        <Sheet open onClose={() => setPeek(null)} title={peek.name}>
          <div className="stack">
            <div style={{ borderRadius: 20, overflow: "hidden", border: "3px solid var(--ink)" }}>
              <DishArt dish={peek} className="ph detail-ph" />
            </div>
            <div className="row wrap">
              {peek.cuisine && <span className="pill" style={{ background: "var(--butter)" }}>{cuisineEmoji(peek.cuisine)} {peek.cuisine}</span>}
              {peek.flavors.map((f) => <span key={f} className="pill" style={{ background: "var(--pink)" }}>{f}</span>)}
            </div>
            {peek.description && <p style={{ margin: 0 }}>{peek.description}</p>}
            {peek.avgStars != null && (
              <p style={{ margin: 0, fontWeight: 800 }}>
                You gave it <span className="stars-static">{starText(peek.avgStars)}</span> on average · cooked {peek.timesCooked}×
              </p>
            )}
            <button
              className="btn tomato huge block"
              onClick={() =>
                run(async () => {
                  await act("pick", { askId: ask.id, dishId: peek.id });
                  setPeek(null);
                }, "Order placed! 🎉", true)
              }
            >
              This one! 🙋‍♀️
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

function RateCard({ ask, dish, run }: { ask: Ask; dish?: Dish; run: any }) {
  const [stars, setStars] = useState(0);
  const [chefStars, setChefStars] = useState(0);
  const [loved, setLoved] = useState<string[]>([]);
  const [nope, setNope] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const options = useMemo(() => {
    const own = dish?.flavors || [];
    return more ? [...own, ...FLAVORS.filter((f) => !own.includes(f))] : own.length ? own : FLAVORS.slice(0, 8);
  }, [dish, more]);
  const msg = ["", "Oof. Noted. 😬", "Room to grow 🌱", "Solid! 👍", "So good!! 😋", "PERFECTION 🤌"][stars];

  return (
    <div className="card pad stack" style={{ background: "var(--paper)" }}>
      {ask.photoId && (
        <div style={{ position: "relative" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/img/${ask.photoId}`} alt="Tonight's plate" style={{ borderRadius: 18, border: "3px solid var(--ink)", width: "100%", maxHeight: 300, objectFit: "cover" }} />
          <span className="pill" style={{ position: "absolute", top: 10, left: 10, background: "var(--tomato)", color: "#fff", transform: "rotate(-5deg)" }}>📸 fresh off the stove</span>
        </div>
      )}
      <div className="row">
        {dish && !ask.photoId && <DishArt dish={dish} className="mini-ph" />}
        <div className="grow">
          <span className="pill" style={{ background: "var(--butter)" }}>rate your {ask.meal}</span>
          <div className="display" style={{ fontSize: 22, marginTop: 6 }}>{dish?.name || "Your meal"}</div>
        </div>
      </div>
      <div className="center">
        <Stars value={stars} onChange={setStars} />
        <div style={{ fontWeight: 900, minHeight: 22, marginTop: 4 }}>{msg}</div>
      </div>
      <div className="field">
        <label>💚 Loved the…</label>
        <FlavorChips value={loved} onChange={(v) => { setLoved(v); setNope(nope.filter((x) => !v.includes(x))); }} options={options} variant="love" />
      </div>
      <div className="field">
        <label>🙅 Not into the…</label>
        <FlavorChips value={nope} onChange={(v) => { setNope(v); setLoved(loved.filter((x) => !v.includes(x))); }} options={options} variant="nope" />
      </div>
      {!more && <button className="btn small white" style={{ alignSelf: "flex-start" }} onClick={() => setMore(true)}>More flavors…</button>}
      <div className="field">
        <label>Rate the chef 👨‍🍳</label>
        <Stars value={chefStars} onChange={setChefStars} small />
      </div>
      <div className="field">
        <label>Note for the chef 💌</label>
        <textarea className="input" placeholder="Needed more garlic. Also you're cute." value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <button
        className="btn tomato block"
        disabled={!stars || busy}
        onClick={async () => {
          setBusy(true);
          await run(() => act("rate", { askId: ask.id, stars, chefStars: chefStars || null, loved, nope, note }), "Review sent! The chef thanks you 🙇", true);
          setBusy(false);
        }}
      >
        {busy ? "Sending…" : "Send review ⭐"}
      </button>
    </div>
  );
}

/* ============ REQUEST FORM ============ */
function RequestForm({ askId, meal: initialMeal, initialText, initialMode = "cuisine", onDone }: { askId?: number; meal?: string; initialText?: string; initialMode?: "cuisine" | "specific" | "recipe"; onDone: (msg: string) => void }) {
  const [mode, setMode] = useState<"cuisine" | "specific" | "recipe">(initialMode);
  const [meal, setMeal] = useState(initialMeal || (new Date().getHours() < 14 ? "lunch" : "dinner"));
  const [cuisine, setCuisine] = useState("");
  const [text, setText] = useState(initialText || "");
  const [recipeUrl, setRecipeUrl] = useState("");
  const [recipeText, setRecipeText] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const ok = mode === "cuisine" ? !!cuisine : mode === "specific" ? !!text.trim() : !!(recipeUrl.trim() || recipeText.trim() || image);

  return (
    <div className="stack">
      <div className="seg">
        <button className={mode === "cuisine" ? "on" : ""} onClick={() => setMode("cuisine")}>A vibe</button>
        <button className={mode === "specific" ? "on" : ""} onClick={() => setMode("specific")}>Specific</button>
        <button className={mode === "recipe" ? "on" : ""} onClick={() => setMode("recipe")}>Recipe</button>
      </div>
      {!askId && (
        <div className="seg">
          {["lunch", "dinner", "whenever"].map((m) => (
            <button key={m} className={meal === m ? "on" : ""} onClick={() => setMeal(m)}>{m}</button>
          ))}
        </div>
      )}

      {mode === "cuisine" && (
        <>
          <div className="row wrap" style={{ gap: 7 }}>
            {CUISINES.map((c) => (
              <span key={c.name} className={`chip ${cuisine === c.name ? "on" : ""}`} onClick={() => setCuisine(cuisine === c.name ? "" : c.name)}>
                {c.emoji} {c.name}
              </span>
            ))}
          </div>
          <input className="input" placeholder="Anything else? (optional)" value={text} onChange={(e) => setText(e.target.value)} />
        </>
      )}
      {mode === "specific" && (
        <div className="field">
          <label>I&apos;m craving…</label>
          <input className="input" placeholder="Your spicy vodka pasta. Extra parm." value={text} onChange={(e) => setText(e.target.value)} />
        </div>
      )}
      {mode === "recipe" && (
        <>
          <div className="field">
            <label>What is it?</label>
            <input className="input" placeholder="Molly's bean & cheese burritos" value={text} onChange={(e) => setText(e.target.value)} />
          </div>
          <div className="field">
            <label>Link</label>
            <input className="input" type="url" inputMode="url" placeholder="https://…" value={recipeUrl} onChange={(e) => setRecipeUrl(e.target.value)} />
          </div>
          <div className="field">
            <label>…or paste it</label>
            <textarea className="input" placeholder="Ingredients, steps, whatever you've got" value={recipeText} onChange={(e) => setRecipeText(e.target.value)} />
          </div>
          <PhotoPicker value={image} onChange={setImage} label="Snap a cookbook page" />
        </>
      )}
      {err && <p style={{ color: "var(--tomato)", fontWeight: 800, margin: 0 }}>{err}</p>}
      <button
        className="btn tomato block huge"
        disabled={!ok || busy}
        onClick={async () => {
          setBusy(true);
          setErr(null);
          try {
            await act("request", { askId, meal: meal === "whenever" ? null : meal, kind: mode, cuisine, text, recipeUrl, recipeText, image });
            onDone(mode === "recipe" ? "Recipe sent to the chef 📖" : "Request sent! 📣");
            setCuisine("");
            setText("");
            setRecipeUrl("");
            setRecipeText("");
            setImage(null);
          } catch (e: any) {
            setErr(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Sending…" : mode === "recipe" ? "Send recipe 📖" : "Send to chef 📣"}
      </button>
    </div>
  );
}

/* ============ BROWSE ============ */
function Browse({ state, onRequest }: { state: ClientState; onRequest: (d: Dish) => void }) {
  const [peek, setPeek] = useState<Dish | null>(null);
  const list = state.dishes.filter((d) => !d.archived);
  return (
    <div className="section stack">
      <SectionTitle tag="メニュー">The menu</SectionTitle>
      <p className="muted" style={{ margin: 0 }}>Everything the chef can make. Tap one to request it.</p>
      {list.length === 0 ? (
        <div className="empty"><div className="big">📖</div><p>The chef hasn&apos;t written the menu yet. Nudge him.</p></div>
      ) : (
        <div className="dish-grid">
          {list.map((d) => <DishCard key={d.id} dish={d} onClick={() => setPeek(d)} />)}
        </div>
      )}
      {peek && (
        <Sheet open onClose={() => setPeek(null)} title={peek.name}>
          <div className="stack">
            <div style={{ borderRadius: 20, overflow: "hidden", border: "3px solid var(--ink)" }}>
              <DishArt dish={peek} className="ph detail-ph" />
            </div>
            {peek.description && <p style={{ margin: 0 }}>{peek.description}</p>}
            <p style={{ margin: 0, fontWeight: 800 }}>
              Cooked {peek.timesCooked}× {peek.avgStars != null && <>· <span className="stars-static">{starText(peek.avgStars)}</span> ({peek.avgStars.toFixed(1)})</>}
            </p>
            <button className="btn tomato block" onClick={() => { onRequest(peek); setPeek(null); }}>Request this 🙏</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

/* ============ DIARY ============ */
function Diary({ state }: { state: ClientState }) {
  return (
    <div className="section stack">
      <SectionTitle tag="日記">Food diary</SectionTitle>
      {state.ratings.length === 0 ? (
        <div className="empty"><div className="big">⭐</div><p>Your reviews will live here.</p></div>
      ) : (
        state.ratings.map((r) => (
          <div key={r.id} className="card pad">
            <div className="row">
              <b className="grow display" style={{ fontSize: 16 }}>{r.dishName}</b>
              <span className="muted">{timeAgo(r.createdAt)}</span>
            </div>
            <div className="stars-static" style={{ fontSize: 18, marginTop: 4 }}>{starText(r.stars)}</div>
            {r.note && <p style={{ margin: "6px 0 0" }}>&ldquo;{r.note}&rdquo;</p>}
          </div>
        ))
      )}
    </div>
  );
}

/* ============ EAT OUT ============ */
function EatOutCard({ state, run, onOpen }: { state: ClientState; run: any; onOpen: () => void }) {
  const pending = state.eatOuts.find((e) => e.status === "pending");
  const recent = state.eatOuts.find((e) => (e.status === "accepted" || e.status === "declined") && e.decidedAt && Date.now() - new Date(e.decidedAt).getTime() < 12 * 3600 * 1000);
  return (
    <div className="stack" style={{ gap: 10 }}>
      <EatOutCounter total={state.eatOutTotal} month={state.eatOutMonth} />
      {pending ? (
        <div className="banner" style={{ background: "var(--grape)" }}>
          <h3>Eat-out request sent 🍽️</h3>
          <p>{pending.place ? `${pending.place}? ` : ""}Waiting on the chef&apos;s verdict…</p>
          <button className="btn small white" style={{ marginTop: 10 }} onClick={() => run(() => act("cancelEatOut", { id: pending.id }), "Request cancelled")}>Never mind</button>
        </div>
      ) : recent ? (
        <div className={`banner ${recent.status === "accepted" ? "mint" : "yellow"}`}>
          <h3>{recent.status === "accepted" ? "We're eating out! 🎉" : "Chef says he's cooking 👨‍🍳"}</h3>
          <p>{recent.status === "accepted" ? (recent.place ? `${recent.place} it is.` : "Pick somewhere good.") : "Keep an eye out for a menu."}</p>
        </div>
      ) : (
        <button className="btn block" style={{ background: "var(--grape)", color: "#fff" }} onClick={onOpen}>
          🍽️ Let&apos;s eat out?
        </button>
      )}
    </div>
  );
}

function EatOutSheet({ meal: initialMeal, run, onClose }: { meal: "lunch" | "dinner"; run: any; onClose: () => void }) {
  const [meal, setMeal] = useState<"lunch" | "dinner">(initialMeal);
  const [place, setPlace] = useState("");
  const [note, setNote] = useState("");
  return (
    <Sheet open onClose={onClose} title="Let's eat out?">
      <div className="stack">
        <div className="seg">
          <button className={meal === "lunch" ? "on" : ""} onClick={() => setMeal("lunch")}>🍱 Lunch</button>
          <button className={meal === "dinner" ? "on" : ""} onClick={() => setMeal("dinner")}>🍝 Dinner</button>
        </div>
        <div className="field">
          <label>Where? (optional)</label>
          <input className="input" placeholder="That ramen place on 2nd Ave" value={place} onChange={(e) => setPlace(e.target.value)} />
        </div>
        <div className="field">
          <label>Your case (optional)</label>
          <input className="input" placeholder="You deserve a night off 💋" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <button
          className="btn tomato block huge"
          onClick={() =>
            run(async () => {
              await act("eatOut", { meal, place, note });
              onClose();
            }, "Asked the chef 🙏", true)
          }
        >
          Ask the chef 🙏
        </button>
      </div>
    </Sheet>
  );
}

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
  starText,
  TabBar,
  timeAgo,
  useAppState,
  useToast,
  type ClientState,
} from "@/components/kit";
import { CUISINES, cuisineEmoji } from "@/lib/constants";
import type { Ask, Dish, Req } from "@/lib/data";

type Tab = "home" | "menu" | "inbox" | "stats";
type Meal = "lunch" | "dinner";

export default function ChefApp({ herName }: { herName: string }) {
  const { state, reload, error } = useAppState(12000);
  const [tab, setTab] = useState<Tab>("home");
  const [askMeal, setAskMeal] = useState<Meal | null>(null);
  const [editing, setEditing] = useState<Dish | "new" | null>(null);
  const [viewing, setViewing] = useState<Dish | null>(null);
  const [serving, setServing] = useState<{ askId?: number; dish?: Dish } | null>(null);
  const toast = useToast();

  useEffect(() => {
    const t = new URLSearchParams(location.search).get("tab") as Tab | null;
    if (t) setTab(t);
  }, []);

  const hungerId = state?.hunger?.id;
  useEffect(() => {
    if (hungerId) setTimeout(() => boingAll({ geeth: "Yes chef!!", her: "STRANGRY!!" }), 500);
  }, [hungerId]);

  const newReqs = state?.requests.filter((r) => r.status === "new").length || 0;

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

  return (
    <>
      <Marquee items={["CHEF MODE", "いらっしゃいませ", "YES CHEF", "ORDER UP", "MISE EN PLACE", `FEEDING ${herName.toUpperCase()}`, "おいしい"]} />
      <div className="shell">
        <Masthead sub="シェフ・モード · CHEF MODE" left="HOT!" right="NEW!" />
        {error && !state && <div className="section"><div className="empty">😵 {error}</div></div>}
        {!state ? (
          <div className="section center muted">Preheating…</div>
        ) : (
          <>
            {tab === "home" && <Home state={state} herName={herName} onAsk={setAskMeal} run={run} goInbox={() => setTab("inbox")} onServe={setServing} />}
            {tab === "menu" && <MenuTab state={state} onAdd={() => setEditing("new")} onView={setViewing} />}
            {tab === "inbox" && <Inbox state={state} herName={herName} run={run} onAsk={setAskMeal} />}
            {tab === "stats" && <Stats state={state} herName={herName} />}
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
          { id: "home", label: "Kitchen", icon: "🔥" },
          { id: "menu", label: "Menu", icon: "📖" },
          { id: "inbox", label: "Inbox", icon: "💌", dot: newReqs },
          { id: "stats", label: "Ratings", icon: "⭐" },
        ]}
      />
      <Bobbleheads />

      {state && askMeal && (
        <AskSheet
          meal={askMeal}
          setMeal={setAskMeal}
          dishes={state.dishes}
          herName={herName}
          onClose={() => setAskMeal(null)}
          onNewDish={() => setEditing("new")}
          onSend={(ids, note) =>
            run(async () => {
              await act("ask", { meal: askMeal, dishIds: ids, note });
              setAskMeal(null);
            }, `Menu sent to ${herName}! 📣`, true)
          }
        />
      )}
      {editing && (
        <DishForm
          dish={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSave={(payload) =>
            run(async () => {
              if (editing === "new") await act("addDish", payload);
              else await act("updateDish", { ...payload, id: editing.id });
              setEditing(null);
              setViewing(null);
            }, editing === "new" ? "Added to the menu! 🍽️" : "Saved ✓")
          }
        />
      )}
      {viewing && state && (
        <DishDetail
          dish={state.dishes.find((d) => d.id === viewing.id) || viewing}
          state={state}
          onClose={() => setViewing(null)}
          onEdit={() => setEditing(viewing)}
          onCooked={() => {
            setServing({ dish: state.dishes.find((d) => d.id === viewing.id) || viewing });
            setViewing(null);
          }}
          onArchive={() =>
            run(async () => {
              await act("archiveDish", { id: viewing.id, archived: !viewing.archived });
              setViewing(null);
            }, viewing.archived ? "Back on the menu!" : "Retired to the archive 🪦")
          }
        />
      )}
      {serving && (
        <ServeSheet
          dish={serving.dish}
          herName={herName}
          onClose={() => setServing(null)}
          onSend={(image, setDishPhoto) =>
            run(async () => {
              if (serving.askId) await act("cooked", { askId: serving.askId, image, setDishPhoto });
              else await act("cookDirect", { dishId: serving.dish?.id, image, setDishPhoto });
              setServing(null);
            }, `Served! Asked ${herName} to rate it ⭐`, true)
          }
        />
      )}
      {toast.node}
    </>
  );
}

/* ============ SERVE (snap the plate) ============ */
function ServeSheet({ dish, herName, onClose, onSend }: { dish?: Dish; herName: string; onClose: () => void; onSend: (image: string | null, setDishPhoto: boolean) => Promise<void> }) {
  const [image, setImage] = useState<string | null>(null);
  const hasPhoto = !!dish?.imageId;
  const [setDishPhoto, setSetDishPhoto] = useState(!hasPhoto);
  const [busy, setBusy] = useState(false);
  const send = async (img: string | null) => {
    setBusy(true);
    await onSend(img, img ? setDishPhoto : false);
    setBusy(false);
  };
  return (
    <Sheet open onClose={onClose} title="Order up! 🛎️">
      <div className="stack">
        <p style={{ margin: 0, fontWeight: 700 }}>
          Snap the plate before {herName} digs in. It goes on her rating card{hasPhoto ? "" : ` and becomes the photo for ${dish?.name || "this dish"}`}.
        </p>
        <PhotoPicker value={image} onChange={setImage} label="📸 Snap the plate" />
        {image && hasPhoto && (
          <label className="row" style={{ fontWeight: 800, cursor: "pointer" }}>
            <input type="checkbox" checked={setDishPhoto} onChange={(e) => setSetDishPhoto(e.target.checked)} style={{ width: 22, height: 22, accentColor: "var(--tomato)" }} />
            Use this as the new photo for {dish?.name}
          </label>
        )}
        <button className="btn tomato block huge" disabled={busy} onClick={() => send(image)}>
          {busy ? "Plating…" : image ? "Serve it ⭐" : "Serve without a photo"}
        </button>
      </div>
    </Sheet>
  );
}

/* ============ HOME ============ */
function Home({ state, herName, onAsk, run, goInbox, onServe }: { state: ClientState; herName: string; onAsk: (m: Meal) => void; run: any; goInbox: () => void; onServe: (s: { askId: number; dish?: Dish }) => void }) {
  const live = state.asks.filter((a) => ["open", "picked", "requested", "cooked"].includes(a.status));
  const dish = (id: number | null) => state.dishes.find((d) => d.id === id);
  const lastRating = state.ratings[0];
  const pendingEat = state.eatOuts.find((e) => e.status === "pending");
  const hour = new Date().getHours();

  return (
    <>
      <div className="section stack">
        <div className="row" style={{ gap: 12 }}>
          <button className={`btn huge grow ${hour < 15 ? "tomato" : "pink"}`} onClick={() => onAsk("lunch")}>
            <span>🍱<br />Ask about<br />lunch</span>
          </button>
          <button className={`btn huge grow ${hour >= 15 ? "tomato" : "pink"}`} onClick={() => onAsk("dinner")}>
            <span>🍝<br />Ask about<br />dinner</span>
          </button>
        </div>
        <EatOutCounter total={state.eatOutTotal} month={state.eatOutMonth} />
        <PushCard who="chef" />
      </div>

      <div className="section">
        <SectionTitle tag="LIVE">On the pass</SectionTitle>
        {state.hunger && (
          <div className="banner" style={{ background: "var(--tomato)", color: "#fff", marginBottom: 14 }}>
            <span className="pill" style={{ background: "#fff", color: "var(--ink)" }}>🚨 hangry alert · {timeAgo(state.hunger.createdAt)}</span>
            <h3 style={{ marginTop: 10 }}>{herName} is HUNGRY!!</h3>
            <p>The Dumpling Lollipop is getting Hangry…. or even…. Strangry!!!</p>
            <div className="row wrap" style={{ marginTop: 12 }}>
              <button className="btn" onClick={() => onAsk("lunch")}>🍱 Send lunch menu</button>
              <button className="btn white" onClick={() => onAsk("dinner")}>🍝 Send dinner menu</button>
            </div>
          </div>
        )}
        {pendingEat && (
          <div className="banner" style={{ background: "var(--grape)", marginBottom: 14 }}>
            <span className="pill" style={{ background: "#fff" }}>{pendingEat.meal || "eat out"} · {timeAgo(pendingEat.createdAt)}</span>
            <h3 style={{ marginTop: 10 }}>{herName} wants to eat out! 🍽️</h3>
            {pendingEat.place && <p>Thinking: <b>{pendingEat.place}</b></p>}
            {pendingEat.note && <p>&ldquo;{pendingEat.note}&rdquo;</p>}
            <div className="row wrap" style={{ marginTop: 12 }}>
              <button className="btn mint" onClick={() => run(() => act("decideEatOut", { id: pendingEat.id, accept: true }), `Eat-out counter: ${state.eatOutTotal + 1} 🍽️`, true)}>✓ Let&apos;s go (+1)</button>
              <button className="btn white" onClick={() => run(() => act("decideEatOut", { id: pendingEat.id, accept: false }), "Apron on. Send her a menu!")}>I&apos;m cooking 👨‍🍳</button>
            </div>
          </div>
        )}
        {live.length === 0 ? (
          <div className="empty">
            <div className="big">🧑‍🍳</div>
            <p><b>Nothing cooking yet.</b><br />Send {herName} a menu and watch the magic.</p>
          </div>
        ) : (
          <div className="stack">
            {live.map((a) => (
              <LiveAsk key={a.id} ask={a} herName={herName} dish={dish} run={run} req={state.requests.find((r) => r.askId === a.id)} goInbox={goInbox} onAsk={onAsk} onServe={onServe} />
            ))}
          </div>
        )}
      </div>

      {lastRating && (
        <div className="section">
          <SectionTitle>Latest review</SectionTitle>
          <div className="banner peach">
            <h3>{lastRating.dishName || "Dinner"}</h3>
            <div className="stars-static" style={{ fontSize: 22 }}>{starText(lastRating.stars)}</div>
            {lastRating.note && <p style={{ marginTop: 8 }}>&ldquo;{lastRating.note}&rdquo;</p>}
            <p className="muted" style={{ marginTop: 6 }}>{timeAgo(lastRating.createdAt)}</p>
          </div>
        </div>
      )}
    </>
  );
}

function LiveAsk({ ask, herName, dish, run, req, goInbox, onAsk, onServe }: { ask: Ask; herName: string; dish: (id: number | null) => Dish | undefined; run: any; req?: Req; goInbox: () => void; onAsk: (m: Meal) => void; onServe: (s: { askId: number; dish?: Dish }) => void }) {
  const picked = dish(ask.pickedDishId);
  const meal = ask.meal.toUpperCase();
  if (ask.status === "open")
    return (
      <div className="banner yellow">
        <span className="pill" style={{ background: "#fff" }}>{meal} · sent {timeAgo(ask.createdAt)}</span>
        <h3 style={{ marginTop: 10 }}>Waiting on {herName}… 👀</h3>
        <p>{ask.options.map((id) => dish(id)?.name).filter(Boolean).join(" · ")}</p>
        {ask.note && <p className="muted">&ldquo;{ask.note}&rdquo;</p>}
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn small white" onClick={() => run(() => act("cancelAsk", { id: ask.id }), "Menu pulled")}>Cancel</button>
        </div>
      </div>
    );
  if (ask.status === "picked")
    return (
      <div className="banner burst">
        <span className="pill" style={{ background: "#fff" }}>{meal} · picked {timeAgo(ask.pickedAt)}</span>
        <div className="row" style={{ marginTop: 10, alignItems: "center" }}>
          {picked && <DishArt dish={picked} className="mini-ph" />}
          <div>
            <h3>She wants<br />{picked?.name}! 🎉</h3>
          </div>
        </div>
        <button className="btn tomato block" style={{ marginTop: 14 }} onClick={() => onServe({ askId: ask.id, dish: picked })}>
          Served! Ask for a rating ⭐
        </button>
      </div>
    );
  if (ask.status === "requested")
    return (
      <div className="banner blue">
        <span className="pill" style={{ background: "#fff", color: "var(--ink)" }}>{meal}</span>
        <h3 style={{ marginTop: 10 }}>Plot twist! 🌀</h3>
        <p>
          {herName} wants something else
          {req ? `: ${req.text || req.cuisine || "see inbox"}` : ""}.
        </p>
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn small white" onClick={goInbox}>See request</button>
          <button className="btn small" onClick={() => onAsk(ask.meal)}>Send new menu</button>
        </div>
      </div>
    );
  return (
    <div className="banner mint">
      <span className="pill" style={{ background: "#fff", color: "var(--ink)" }}>{meal} · served {timeAgo(ask.cookedAt)}</span>
      {ask.photoId && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/api/img/${ask.photoId}`} alt="" style={{ marginTop: 10, borderRadius: 16, border: "3px solid var(--ink)", maxHeight: 200, width: "100%", objectFit: "cover" }} />
      )}
      <h3 style={{ marginTop: 10 }}>Awaiting the verdict… 🥁</h3>
      <p>{picked?.name}: rating requested</p>
    </div>
  );
}

/* ============ ASK SHEET ============ */
function AskSheet({ meal, setMeal, dishes, herName, onClose, onSend, onNewDish }: { meal: Meal; setMeal: (m: Meal) => void; dishes: Dish[]; herName: string; onClose: () => void; onSend: (ids: number[], note: string) => void; onNewDish: () => void }) {
  const [sel, setSel] = useState<number[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const list = dishes.filter((d) => !d.archived && (d.meal === meal || d.meal === "both"));
  return (
    <Sheet open onClose={onClose} title={`Ask about ${meal}`}>
      <div className="stack">
        <div className="seg">
          <button className={meal === "lunch" ? "on" : ""} onClick={() => setMeal("lunch")}>🍱 Lunch</button>
          <button className={meal === "dinner" ? "on" : ""} onClick={() => setMeal("dinner")}>🍝 Dinner</button>
        </div>
        <p className="muted" style={{ margin: 0 }}>Pick the options {herName} gets to choose from. 2–4 is the sweet spot.</p>
        {list.length === 0 && (
          <div className="empty">
            <p><b>No {meal} dishes yet.</b></p>
          </div>
        )}
        <div className="dish-grid">
          {list.map((d) => (
            <DishCard key={d.id} dish={d} selected={sel.includes(d.id)} onClick={() => setSel(sel.includes(d.id) ? sel.filter((x) => x !== d.id) : [...sel, d.id])} />
          ))}
        </div>
        <button className="btn white block" onClick={onNewDish}>＋ New dish</button>
        <div className="field">
          <label>Note (optional)</label>
          <input className="input" placeholder="Ready by 7! 💋" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <button
          className="btn tomato block huge"
          disabled={!sel.length || busy}
          onClick={async () => {
            setBusy(true);
            await onSend(sel, note);
            setBusy(false);
          }}
        >
          {busy ? "Sending…" : `Send ${sel.length || ""} to ${herName} 📣`}
        </button>
      </div>
    </Sheet>
  );
}

/* ============ DISH FORM ============ */
function DishForm({ dish, onClose, onSave }: { dish: Dish | null; onClose: () => void; onSave: (p: any) => Promise<void> }) {
  const [name, setName] = useState(dish?.name || "");
  const [meal, setMeal] = useState<Dish["meal"]>(dish?.meal || "dinner");
  const [cuisine, setCuisine] = useState(dish?.cuisine || "");
  const [flavors, setFlavors] = useState<string[]>(dish?.flavors || []);
  const [description, setDescription] = useState(dish?.description || "");
  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Sheet open onClose={onClose} title={dish ? "Edit dish" : "New dish"}>
      <div className="stack">
        <div className="field">
          <label>Dish name</label>
          <input className="input" placeholder="Spicy vodka rigatoni" value={name} onChange={(e) => setName(e.target.value)} autoFocus={!dish} />
        </div>
        <div className="field">
          <label>For</label>
          <div className="seg">
            {(["lunch", "dinner", "both"] as const).map((m) => (
              <button key={m} className={meal === m ? "on" : ""} onClick={() => setMeal(m)}>{m}</button>
            ))}
          </div>
        </div>
        <div className="field">
          <label>Cuisine</label>
          <div className="row wrap" style={{ gap: 7 }}>
            {CUISINES.map((c) => (
              <span key={c.name} className={`chip ${cuisine === c.name ? "on" : ""}`} onClick={() => setCuisine(cuisine === c.name ? "" : c.name)}>
                {c.emoji} {c.name}
              </span>
            ))}
          </div>
        </div>
        <div className="field">
          <label>Flavors</label>
          <FlavorChips value={flavors} onChange={setFlavors} />
        </div>
        <div className="field">
          <label>Description (optional)</label>
          <textarea className="input" placeholder="Creamy, peppery, a little dangerous." value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <PhotoPicker value={image} onChange={setImage} label={dish?.imageId ? "Replace photo" : "Add a photo"} />
        <button
          className="btn tomato block"
          disabled={!name.trim() || busy}
          onClick={async () => {
            setBusy(true);
            await onSave({ name, meal, cuisine, flavors, description, image });
            setBusy(false);
          }}
        >
          {busy ? "Saving…" : "Save dish"}
        </button>
      </div>
    </Sheet>
  );
}

/* ============ MENU TAB ============ */
function MenuTab({ state, onAdd, onView }: { state: ClientState; onAdd: () => void; onView: (d: Dish) => void }) {
  const [filter, setFilter] = useState<"all" | "lunch" | "dinner" | "archived">("all");
  const list = state.dishes.filter((d) => (filter === "archived" ? d.archived : !d.archived && (filter === "all" || d.meal === filter || d.meal === "both")));
  return (
    <div className="section stack">
      <SectionTitle tag={`${state.dishes.filter((d) => !d.archived).length} DISHES`}>The menu</SectionTitle>
      <button className="btn tomato block" onClick={onAdd}>＋ Add a dish</button>
      <div className="seg">
        {(["all", "lunch", "dinner", "archived"] as const).map((f) => (
          <button key={f} className={filter === f ? "on" : ""} onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>
      {list.length === 0 ? (
        <div className="empty">
          <div className="big">📖</div>
          <p><b>Empty menu!</b><br />Add your greatest hits.</p>
        </div>
      ) : (
        <div className="dish-grid">
          {list.map((d) => (
            <DishCard key={d.id} dish={d} onClick={() => onView(d)} />
          ))}
        </div>
      )}
    </div>
  );
}

function DishDetail({ dish, state, onClose, onEdit, onCooked, onArchive }: { dish: Dish; state: ClientState; onClose: () => void; onEdit: () => void; onCooked: () => void; onArchive: () => void }) {
  const ratings = state.ratings.filter((r) => r.dishId === dish.id);
  return (
    <Sheet open onClose={onClose} title={dish.name}>
      <div className="stack">
        <div style={{ borderRadius: 20, overflow: "hidden", border: "3px solid var(--ink)" }}>
          <DishArt dish={dish} className="ph detail-ph" />
        </div>
        <div className="row wrap">
          <span className="pill" style={{ background: "var(--butter)" }}>{cuisineEmoji(dish.cuisine)} {dish.cuisine || "No cuisine"}</span>
          <span className="pill" style={{ background: "#fff" }}>{dish.meal}</span>
          {dish.flavors.map((f) => (
            <span key={f} className="pill" style={{ background: "var(--pink)" }}>{f}</span>
          ))}
        </div>
        {dish.description && <p style={{ margin: 0 }}>{dish.description}</p>}
        <div className="row" style={{ gap: 10 }}>
          <Stat n={dish.timesCooked} label="times cooked" bg="var(--butter)" />
          <Stat n={dish.avgStars != null ? dish.avgStars.toFixed(1) : "–"} label={`avg of ${dish.ratingCount}`} bg="var(--pink)" />
        </div>
        {ratings.length > 0 && (
          <div className="stack" style={{ gap: 8 }}>
            {ratings.map((r) => (
              <div key={r.id} className="card pad">
                <div className="row">
                  <span className="stars-static grow">{starText(r.stars)}</span>
                  <span className="muted">{timeAgo(r.createdAt)}</span>
                </div>
                {r.note && <p style={{ margin: "6px 0 0" }}>&ldquo;{r.note}&rdquo;</p>}
                {(r.loved.length > 0 || r.nope.length > 0) && (
                  <p className="muted" style={{ margin: "6px 0 0" }}>
                    {r.loved.length > 0 && <>💚 {r.loved.join(", ")} </>}
                    {r.nope.length > 0 && <>🙅 {r.nope.join(", ")}</>}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
        <button className="btn mint block" onClick={onCooked}>📸 Just cooked this → ask for rating</button>
        <div className="row">
          <button className="btn white grow" onClick={onEdit}>✏️ Edit</button>
          <button className="btn white grow" onClick={onArchive}>{dish.archived ? "↩︎ Restore" : "🪦 Archive"}</button>
        </div>
      </div>
    </Sheet>
  );
}

function Stat({ n, label, bg }: { n: React.ReactNode; label: string; bg: string }) {
  return (
    <div className="card grow center" style={{ background: bg, padding: "12px 8px", boxShadow: "4px 4px 0 var(--ink)" }}>
      <div className="display" style={{ fontSize: 30 }}>{n}</div>
      <div style={{ fontWeight: 800, fontSize: 12 }}>{label}</div>
    </div>
  );
}

/* ============ INBOX ============ */
function Inbox({ state, herName, run, onAsk }: { state: ClientState; herName: string; run: any; onAsk: (m: Meal) => void }) {
  const [showDone, setShowDone] = useState(false);
  const reqs = state.requests.filter((r) => (showDone ? true : r.status !== "done"));
  return (
    <div className="section stack">
      <SectionTitle tag="FROM HER">Inbox</SectionTitle>
      {reqs.length === 0 ? (
        <div className="empty">
          <div className="big">💌</div>
          <p><b>All caught up.</b><br />Requests and recipes from {herName} land here.</p>
        </div>
      ) : (
        reqs.map((r) => <RequestCard key={r.id} r={r} herName={herName} run={run} onAsk={onAsk} />)
      )}
      <button className="btn small white" style={{ alignSelf: "center" }} onClick={() => setShowDone(!showDone)}>
        {showDone ? "Hide done" : "Show done"}
      </button>
    </div>
  );
}

function RequestCard({ r, herName, run, onAsk }: { r: Req; herName: string; run: any; onAsk: (m: Meal) => void }) {
  const [open, setOpen] = useState(false);
  const icon = r.kind === "recipe" ? "📖" : r.kind === "cuisine" ? cuisineEmoji(r.cuisine) : "🤤";
  const bg = r.kind === "recipe" ? "var(--mint)" : r.kind === "cuisine" ? "var(--butter)" : "var(--pink)";
  return (
    <div className="card" style={{ opacity: r.status === "done" ? 0.55 : 1 }}>
      <div className="feed-item">
        <div className="ico" style={{ background: bg }}>{icon}</div>
        <div className="grow">
          <div className="row wrap" style={{ gap: 6 }}>
            <span className="pill" style={{ background: bg }}>{r.kind === "recipe" ? "recipe" : r.kind === "cuisine" ? "craving a cuisine" : "specific request"}</span>
            {r.meal && <span className="pill" style={{ background: "#fff" }}>{r.meal}</span>}
            {r.status === "new" && <span className="pill" style={{ background: "var(--tomato)", color: "#fff" }}>new</span>}
          </div>
          <div className="display" style={{ fontSize: 18, marginTop: 8 }}>
            {r.kind === "cuisine" ? r.cuisine || "Something different" : r.text || (r.kind === "recipe" ? "A recipe for you" : "Something else")}
          </div>
          {r.kind === "cuisine" && r.text && <p style={{ margin: "4px 0 0" }}>{r.text}</p>}
          <p className="muted" style={{ margin: "4px 0 0" }}>{herName} · {timeAgo(r.createdAt)}</p>
          {r.recipeUrl && (
            <a className="btn small white" style={{ marginTop: 10 }} href={r.recipeUrl} target="_blank" rel="noreferrer">
              🔗 Open recipe link
            </a>
          )}
          {r.imageId && (
            // eslint-disable-next-line @next/next/no-img-element
            <a href={`/api/img/${r.imageId}`} target="_blank" rel="noreferrer"><img src={`/api/img/${r.imageId}`} alt="recipe" style={{ marginTop: 10, borderRadius: 14, border: "3px solid var(--ink)", maxHeight: 260, objectFit: "cover", width: "100%" }} /></a>
          )}
          {r.recipeText && (
            <div style={{ marginTop: 10 }}>
              <button className="btn small white" onClick={() => setOpen(!open)}>{open ? "Hide recipe" : "📜 Read recipe"}</button>
              {open && <pre style={{ whiteSpace: "pre-wrap", fontFamily: "var(--body)", background: "var(--cream)", padding: 12, borderRadius: 12, border: "2.5px solid var(--ink)", marginTop: 8 }}>{r.recipeText}</pre>}
            </div>
          )}
          {r.status !== "done" && (
            <div className="row wrap" style={{ marginTop: 12 }}>
              {r.status === "new" && <button className="btn small" onClick={() => run(() => act("requestStatus", { id: r.id, status: "seen" }), "Heard, chef 👍")}>👍 On it</button>}
              {r.kind !== "recipe" && <button className="btn small pink" onClick={() => onAsk((r.meal as Meal) === "lunch" ? "lunch" : "dinner")}>Send a menu</button>}
              <button className="btn small white" onClick={() => run(() => act("requestStatus", { id: r.id, status: "done" }), "Done ✓")}>✓ Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============ STATS ============ */
function Stats({ state, herName }: { state: ClientState; herName: string }) {
  const [view, setView] = useState<"scores" | "history">("scores");
  return (
    <>
      <div className="section" style={{ paddingBottom: 0 }}>
        <div className="seg">
          <button className={view === "scores" ? "on" : ""} onClick={() => setView("scores")}>⭐ Scores</button>
          <button className={view === "history" ? "on" : ""} onClick={() => setView("history")}>📜 History</button>
        </div>
      </div>
      {view === "scores" ? <Scores state={state} herName={herName} /> : <History state={state} />}
    </>
  );
}

function History({ state }: { state: ClientState }) {
  const items = state.history;
  let lastMonth = "";
  return (
    <div className="section stack">
      <SectionTitle tag={`${items.length} MEALS`}>Food history</SectionTitle>
      {items.length === 0 ? (
        <div className="empty"><div className="big">📜</div><p>Every meal you serve (and every night out) shows up here.</p></div>
      ) : (
        items.map((m) => {
          const d = new Date(m.at);
          const month = d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
          const header = month !== lastMonth ? (lastMonth = month) : null;
          return (
            <div key={`${m.kind}-${m.id}`} className="stack" style={{ gap: 10 }}>
              {header && <div className="pill" style={{ background: "var(--ink)", color: "var(--butter)", alignSelf: "flex-start", fontSize: 12, padding: "5px 12px" }}>{header}</div>}
              <div className="card list-dish" style={m.kind === "out" ? { background: "#efe6ff" } : undefined}>
                {m.kind === "out" ? (
                  <div className="thumb" style={{ background: "var(--grape)" }}>🍽️</div>
                ) : m.photoId ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <div className="thumb"><img src={`/api/img/${m.photoId}`} alt="" loading="lazy" /></div>
                ) : (
                  <div className="thumb" style={{ background: "var(--butter)" }}>{cuisineEmoji(m.cuisine)}</div>
                )}
                <div className="grow">
                  <div className="muted" style={{ fontWeight: 800 }}>
                    {d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} · {m.kind === "out" ? `ate out${m.meal ? ` · ${m.meal}` : ""}` : m.meal}
                  </div>
                  <div className="display" style={{ fontSize: 16, marginTop: 2 }}>{m.name}</div>
                  {m.stars ? <div className="stars-static">{starText(m.stars)}</div> : m.kind === "meal" ? <div className="muted">not rated yet</div> : null}
                  {m.note && <div style={{ fontSize: 13, marginTop: 2 }}>&ldquo;{m.note}&rdquo;</div>}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function Scores({ state, herName }: { state: ClientState; herName: string }) {
  const rated = state.ratings;
  const avg = rated.length ? rated.reduce((t, r) => t + r.stars, 0) / rated.length : null;
  const cooked = state.asks.filter((a) => a.status === "cooked" || a.status === "rated").length;
  const top = useMemo(() => state.dishes.filter((d) => d.avgStars != null).sort((a, b) => (b.avgStars! - a.avgStars!) || b.timesCooked - a.timesCooked).slice(0, 5), [state.dishes]);
  const loves = state.flavors.filter((f) => f.score >= 3.5).slice(0, 6);
  const nopes = [...state.flavors].reverse().filter((f) => f.score < 3.5).slice(0, 6);
  const reviews = rated.filter((r) => r.note || r.chefStars);

  return (
    <div className="section stack">
      <SectionTitle tag="THE VERDICT">Ratings</SectionTitle>
      <div className="row" style={{ gap: 10 }}>
        <Stat n={state.chefAvg ? state.chefAvg.toFixed(1) : "–"} label="chef score" bg="var(--butter)" />
        <Stat n={avg ? avg.toFixed(1) : "–"} label="avg dish" bg="var(--pink)" />
        <Stat n={cooked} label="meals served" bg="var(--mint)" />
      </div>
      <EatOutCounter total={state.eatOutTotal} month={state.eatOutMonth} />

      <div className="card pad stack" style={{ gap: 10 }}>
        <div className="display" style={{ fontSize: 20 }}>Flavor report 🧪</div>
        {state.flavors.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>Tag your dishes with flavors. Once {herName} starts rating, you&apos;ll see what she loves and what to skip.</p>
        ) : (
          <>
            {loves.length > 0 && <div className="pill" style={{ background: "var(--mint)", color: "#fff", alignSelf: "flex-start" }}>💚 she loves</div>}
            {loves.map((f) => <FlavorBar key={f.flavor} f={f} color="var(--mint)" />)}
            {nopes.length > 0 && <div className="pill" style={{ background: "var(--tomato)", color: "#fff", alignSelf: "flex-start", marginTop: 6 }}>🙅 not so much</div>}
            {nopes.map((f) => <FlavorBar key={f.flavor} f={f} color="var(--tomato)" />)}
          </>
        )}
      </div>

      {top.length > 0 && (
        <div className="card pad stack" style={{ gap: 6 }}>
          <div className="display" style={{ fontSize: 20 }}>Hall of fame 🏆</div>
          {top.map((d, i) => (
            <div key={d.id} className="row">
              <span className="display" style={{ width: 26 }}>{i + 1}</span>
              <span className="grow" style={{ fontWeight: 800 }}>{d.name}</span>
              <span className="stars-static">{starText(d.avgStars)}</span>
              <span className="muted">×{d.timesCooked}</span>
            </div>
          ))}
        </div>
      )}

      <SectionTitle tag="FOR THE CHEF">Reviews</SectionTitle>
      {reviews.length === 0 ? (
        <div className="empty"><div className="big">📝</div><p>No reviews yet. Cook something unforgettable.</p></div>
      ) : (
        reviews.map((r, i) => (
          <div key={r.id} className="card pad" style={{ background: i % 3 === 0 ? "#fff" : i % 3 === 1 ? "var(--cream)" : "#ffe9f3", transform: `rotate(${i % 2 ? 0.8 : -0.8}deg)` }}>
            <div className="row">
              <b className="grow">{r.dishName}</b>
              <span className="muted">{timeAgo(r.createdAt)}</span>
            </div>
            <div className="row" style={{ marginTop: 4 }}>
              <span className="stars-static">dish {starText(r.stars)}</span>
              {r.chefStars && <span className="stars-static" style={{ color: "var(--cobalt)" }}>chef {starText(r.chefStars)}</span>}
            </div>
            {r.note && <p style={{ margin: "8px 0 0", fontSize: 17 }}>&ldquo;{r.note}&rdquo;</p>}
          </div>
        ))
      )}
    </div>
  );
}

function FlavorBar({ f, color }: { f: { flavor: string; score: number; loves: number; nopes: number }; color: string }) {
  return (
    <div className="bar-row">
      <span>{f.flavor}</span>
      <div className="bar"><div style={{ width: `${(f.score / 5) * 100}%`, background: color }} /></div>
      <span>{f.score.toFixed(1)}</span>
    </div>
  );
}

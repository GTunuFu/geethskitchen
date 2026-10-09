import { NextResponse } from "next/server";
import { getRole, HER_NAME } from "@/lib/auth";
import { db, ready } from "@/lib/db";
import { notify } from "@/lib/push";

const MAX_IMG = 1_800_000;

async function saveImage(data?: string | null) {
  if (!data) return null;
  if (!/^data:image\/[a-z+]+;base64,/.test(data) || data.length > MAX_IMG) throw new Error("Image too big or not an image");
  const [row] = await db()`insert into images (data) values (${data}) returning id`;
  return row.id as number;
}

// A plate photo becomes the dish's picture if the dish has none yet (or if the chef asks for it).
async function useAsDishPhoto(dishId: number | null | undefined, photoId: number | null, force?: boolean) {
  if (!dishId || !photoId) return;
  if (force) await db()`update dishes set image_id = ${photoId} where id = ${dishId}`;
  else await db()`update dishes set image_id = ${photoId} where id = ${dishId} and image_id is null`;
}

const clean = (v: unknown, max = 2000) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const mealWord = (m: string) => (m === "lunch" ? "lunch" : "dinner");

export async function POST(req: Request) {
  const role = await getRole();
  if (!role) return NextResponse.json({ error: "login" }, { status: 401 });
  await ready();
  const s = db();
  const body = await req.json();
  const t = body.type as string;
  const chefOnly = ["addDish", "updateDish", "archiveDish", "ask", "cancelAsk", "cooked", "cookDirect", "requestStatus", "decideEatOut", "proposeEatOut"];
  const herOnly = ["pick", "request", "rate", "eatOut", "hungry", "notHungry", "answerEatOut"];
  if (chefOnly.includes(t) && role !== "chef") return NextResponse.json({ error: "chef only" }, { status: 403 });
  if (herOnly.includes(t) && role !== "her") return NextResponse.json({ error: "not for the chef" }, { status: 403 });

  try {
    switch (t) {
      case "addDish": {
        const imageId = await saveImage(body.image);
        const [d] = await s`insert into dishes (name, meal, cuisine, flavors, description, image_id)
          values (${clean(body.name, 120) || "Mystery dish"}, ${body.meal || "both"}, ${clean(body.cuisine, 60)},
                  ${body.flavors || []}, ${clean(body.description)}, ${imageId}) returning id`;
        return NextResponse.json({ ok: true, id: d.id });
      }
      case "updateDish": {
        const imageId = body.image ? await saveImage(body.image) : undefined;
        await s`update dishes set name = ${clean(body.name, 120) || "Mystery dish"}, meal = ${body.meal || "both"},
          cuisine = ${clean(body.cuisine, 60)}, flavors = ${body.flavors || []}, description = ${clean(body.description)}
          ${imageId ? s`, image_id = ${imageId}` : s``} where id = ${body.id}`;
        return NextResponse.json({ ok: true });
      }
      case "archiveDish": {
        await s`update dishes set archived = ${body.archived ?? true} where id = ${body.id}`;
        return NextResponse.json({ ok: true });
      }
      case "ask": {
        const meal = body.meal === "lunch" ? "lunch" : "dinner";
        const ids: number[] = (body.dishIds || []).map(Number).filter(Boolean);
        if (!ids.length) return NextResponse.json({ error: "Pick at least one dish" }, { status: 400 });
        await s`update asks set status = 'closed' where meal = ${meal} and status = 'open'`;
        await s`update hunger_pings set status = 'served', resolved_at = now() where status = 'active'`;
        const [a] = await s`insert into asks (meal, note) values (${meal}, ${clean(body.note, 300)}) returning id`;
        for (const id of ids) await s`insert into ask_options (ask_id, dish_id) values (${a.id}, ${id}) on conflict do nothing`;
        const names = await s`select name from dishes where id in ${s(ids)}`;
        await notify("her", {
          title: meal === "lunch" ? "🍱 LUNCH MENU JUST DROPPED" : "🍝 DINNER MENU JUST DROPPED",
          body: `${names.map((n: any) => n.name).join(" · ")} — what are you craving? (Or… eat out? 👀)`,
          url: "/her",
          tag: `ask-${a.id}`,
        });
        return NextResponse.json({ ok: true, id: a.id });
      }
      case "cancelAsk": {
        await s`update asks set status = 'closed' where id = ${body.id}`;
        return NextResponse.json({ ok: true });
      }
      case "pick": {
        const [a] = await s`select * from asks where id = ${body.askId}`;
        if (!a || !["open", "requested"].includes(a.status)) return NextResponse.json({ error: "That menu is closed!" }, { status: 400 });
        await s`update asks set status = 'picked', picked_dish_id = ${body.dishId}, picked_at = now() where id = ${body.askId}`;
        const [d] = await s`select name from dishes where id = ${body.dishId}`;
        await notify("chef", { title: `${HER_NAME} picked ${mealWord(a.meal)}! 🎉`, body: `${d?.name} it is. Apron on, chef.`, url: "/chef", tag: `pick-${a.id}` });
        return NextResponse.json({ ok: true });
      }
      case "request": {
        const kind = ["cuisine", "specific", "recipe"].includes(body.kind) ? body.kind : "specific";
        const imageId = await saveImage(body.image);
        const askId = body.askId ? Number(body.askId) : null;
        await s`insert into requests (ask_id, meal, kind, cuisine, text, recipe_url, recipe_text, image_id)
          values (${askId}, ${clean(body.meal, 20)}, ${kind}, ${clean(body.cuisine, 60)}, ${clean(body.text, 500)},
                  ${clean(body.recipeUrl, 500)}, ${clean(body.recipeText, 8000)}, ${imageId})`;
        if (askId) await s`update asks set status = 'requested' where id = ${askId} and status = 'open'`;
        const what = kind === "recipe" ? "sent you a recipe 📖" : `wants ${clean(body.text, 80) || clean(body.cuisine, 60) || "something else"}`;
        await notify("chef", { title: `${HER_NAME} ${what}`, body: kind === "recipe" ? clean(body.text, 80) || "Check your inbox, chef." : `For ${body.meal || "the next meal"}. Back to the kitchen!`, url: "/chef?tab=inbox" });
        return NextResponse.json({ ok: true });
      }
      case "hungry": {
        await s`update hunger_pings set status = 'cancelled', resolved_at = now() where status = 'active'`;
        await s`insert into hunger_pings default values`;
        await notify("chef", {
          title: "🥟 I'M HUNGRY!!",
          body: "The Dumpling Lollipop is getting Hangry…. or even…. Strangry!!!",
          url: "/chef",
          tag: "hungry",
        });
        return NextResponse.json({ ok: true });
      }
      case "notHungry": {
        const asks = await s`update asks set status = 'closed' where status in ('open', 'requested') returning id`;
        const pings = await s`update hunger_pings set status = 'cancelled', resolved_at = now() where status = 'active' returning id`;
        const outs = await s`update eat_outs set status = 'cancelled' where status = 'pending' returning id`;
        if (asks.length + pings.length + outs.length > 0) {
          await notify("chef", { title: `😴 ${HER_NAME} isn't hungry`, body: "Menu and requests cancelled. Stand down, chef.", url: "/chef", tag: "hungry" });
        }
        return NextResponse.json({ ok: true });
      }
      case "eatOut": {
        const meal = body.meal === "lunch" ? "lunch" : body.meal === "dinner" ? "dinner" : null;
        await s`update eat_outs set status = 'cancelled' where status = 'pending'`;
        await s`insert into eat_outs (meal, place, note) values (${meal}, ${clean(body.place, 120)}, ${clean(body.note, 300)})`;
        const where = clean(body.place, 80);
        await notify("chef", {
          title: `🍽️ ${HER_NAME} wants to eat out${meal ? ` for ${meal}` : ""}!`,
          body: where ? `She's thinking ${where}. Accept or put your apron on?` : "Accept or put your apron on?",
          url: "/chef",
          tag: "eatout",
        });
        return NextResponse.json({ ok: true });
      }
      case "cancelEatOut": {
        await s`update eat_outs set status = 'cancelled' where id = ${body.id} and status = 'pending'`;
        return NextResponse.json({ ok: true });
      }
      case "proposeEatOut": {
        const meal = body.meal === "lunch" ? "lunch" : body.meal === "dinner" ? "dinner" : null;
        await s`update eat_outs set status = 'cancelled' where status = 'pending'`;
        await s`insert into eat_outs (meal, place, note, proposed_by) values (${meal}, ${clean(body.place, 120)}, ${clean(body.note, 300)}, 'chef')`;
        const where = clean(body.place, 80);
        await notify("her", {
          title: `🍽️ Chef asks: wanna eat out${meal ? ` for ${meal}` : ""}?`,
          body: where ? `He's thinking ${where}. Yes or cook for you?` : "The chef wants a night off. Yes or cook for you?",
          url: "/her",
          tag: "eatout",
        });
        return NextResponse.json({ ok: true });
      }
      case "answerEatOut": {
        const accept = !!body.accept;
        const [e] = await s`update eat_outs set status = ${accept ? "accepted" : "declined"}, decided_at = now()
          where id = ${body.id} and status = 'pending' and proposed_by = 'chef' returning *`;
        if (!e) return NextResponse.json({ error: "That invite is already handled" }, { status: 400 });
        if (accept && e.meal) await s`update asks set status = 'closed' where meal = ${e.meal} and status in ('open', 'requested')`;
        if (accept) await s`update hunger_pings set status = 'served', resolved_at = now() where status = 'active'`;
        const [c] = await s`select count(*)::int as n from eat_outs where status = 'accepted'`;
        await notify("chef", accept
          ? { title: `🎉 ${HER_NAME} said yes to eating out!`, body: `${e.place ? `${e.place} it is. ` : ""}Eat-out counter: ${c.n}`, url: "/chef", tag: "eatout" }
          : { title: `🏠 ${HER_NAME} wants you to cook`, body: "Apron on, chef. Send her a menu!", url: "/chef", tag: "eatout" });
        return NextResponse.json({ ok: true, count: c.n });
      }
      case "decideEatOut": {
        const accept = !!body.accept;
        const [e] = await s`update eat_outs set status = ${accept ? "accepted" : "declined"}, decided_at = now()
          where id = ${body.id} and status = 'pending' and proposed_by = 'her' returning *`;
        if (!e) return NextResponse.json({ error: "That request is already handled" }, { status: 400 });
        if (accept && e.meal) await s`update asks set status = 'closed' where meal = ${e.meal} and status in ('open', 'requested')`;
        if (accept) await s`update hunger_pings set status = 'served', resolved_at = now() where status = 'active'`;
        const [c] = await s`select count(*)::int as n from eat_outs where status = 'accepted'`;
        await notify("her", accept
          ? { title: "🎉 We're eating out!", body: `${e.place ? `${e.place} it is. ` : ""}Eat-out counter: ${c.n}`, url: "/her", tag: "eatout" }
          : { title: "👨‍🍳 Chef says: I'm cooking!", body: "Request denied. A menu is coming your way.", url: "/her", tag: "eatout" });
        return NextResponse.json({ ok: true, count: c.n });
      }
      case "requestStatus": {
        await s`update requests set status = ${body.status} where id = ${body.id}`;
        return NextResponse.json({ ok: true });
      }
      case "cooked": {
        const photoId = await saveImage(body.image);
        await s`update asks set status = 'cooked', cooked_at = now(), photo_id = ${photoId} where id = ${body.askId}`;
        const [a] = await s`select a.meal, a.picked_dish_id, d.name from asks a left join dishes d on d.id = a.picked_dish_id where a.id = ${body.askId}`;
        await useAsDishPhoto(a?.picked_dish_id, photoId, body.setDishPhoto);
        await notify("her", { title: photoId ? "📸 Dinner is served! How was it?" : "⭐ How was it?", body: `Rate tonight's ${a?.name || mealWord(a?.meal)} — the chef is nervously waiting.`, url: "/her", tag: `rate-${body.askId}` });
        return NextResponse.json({ ok: true });
      }
      case "cookDirect": {
        const [d] = await s`select name, meal from dishes where id = ${body.dishId}`;
        const meal = body.meal || (d?.meal === "lunch" ? "lunch" : "dinner");
        const photoId = await saveImage(body.image);
        const [a] = await s`insert into asks (meal, status, picked_dish_id, picked_at, cooked_at, photo_id) values (${meal}, 'cooked', ${body.dishId}, now(), now(), ${photoId}) returning id`;
        await useAsDishPhoto(body.dishId, photoId, body.setDishPhoto);
        await s`insert into ask_options (ask_id, dish_id) values (${a.id}, ${body.dishId})`;
        await notify("her", { title: "⭐ How was it?", body: `Rate the ${d?.name} — the chef is nervously waiting.`, url: "/her", tag: `rate-${a.id}` });
        return NextResponse.json({ ok: true });
      }
      case "rate": {
        const [a] = await s`select * from asks where id = ${body.askId}`;
        if (!a) return NextResponse.json({ error: "no such meal" }, { status: 400 });
        const stars = Math.max(1, Math.min(5, Number(body.stars) || 0));
        const chefStars = body.chefStars ? Math.max(1, Math.min(5, Number(body.chefStars))) : null;
        await s`insert into ratings (ask_id, dish_id, stars, loved, nope, chef_stars, note)
          values (${a.id}, ${a.picked_dish_id}, ${stars}, ${body.loved || []}, ${body.nope || []}, ${chefStars}, ${clean(body.note, 1000)})`;
        await s`update asks set status = 'rated' where id = ${a.id}`;
        const [d] = await s`select name from dishes where id = ${a.picked_dish_id}`;
        await notify("chef", {
          title: `${"⭐".repeat(stars)} for ${d?.name || "dinner"}`,
          body: clean(body.note, 120) || (stars >= 4 ? "She loved it. Take a bow." : "Notes have been filed. Back to the lab."),
          url: "/chef?tab=stats",
        });
        return NextResponse.json({ ok: true });
      }
      default:
        return NextResponse.json({ error: "unknown action" }, { status: 400 });
    }
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message || "Something burned 🔥" }, { status: 500 });
  }
}

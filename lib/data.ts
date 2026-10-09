import { db, ready } from "./db";
import { FLAVORS } from "./constants";

export type Dish = {
  id: number;
  name: string;
  meal: "lunch" | "dinner" | "both";
  cuisine: string | null;
  flavors: string[];
  description: string | null;
  imageId: number | null;
  archived: boolean;
  timesCooked: number;
  avgStars: number | null;
  ratingCount: number;
  lastCooked: string | null;
};

export type Ask = {
  id: number;
  meal: "lunch" | "dinner";
  note: string | null;
  status: "open" | "picked" | "requested" | "cooked" | "rated" | "closed";
  pickedDishId: number | null;
  pickedAt: string | null;
  cookedAt: string | null;
  createdAt: string;
  options: number[];
  photoId: number | null;
};

export type Req = {
  id: number;
  askId: number | null;
  meal: string | null;
  kind: "cuisine" | "specific" | "recipe";
  cuisine: string | null;
  text: string | null;
  recipeUrl: string | null;
  recipeText: string | null;
  imageId: number | null;
  status: "new" | "seen" | "done";
  createdAt: string;
};

export type Rating = {
  id: number;
  askId: number | null;
  dishId: number | null;
  dishName: string | null;
  stars: number;
  loved: string[];
  nope: string[];
  chefStars: number | null;
  note: string | null;
  createdAt: string;
};

export type FlavorScore = { flavor: string; score: number; loves: number; nopes: number; n: number };

export type EatOut = {
  id: number;
  meal: string | null;
  place: string | null;
  note: string | null;
  status: "pending" | "accepted" | "declined" | "cancelled";
  createdAt: string;
  decidedAt: string | null;
};

export type HistoryItem = {
  kind: "meal" | "out";
  id: number;
  at: string;
  meal: string | null;
  name: string;
  cuisine: string | null;
  dishId: number | null;
  photoId: number | null;
  stars: number | null;
  note: string | null;
};

export type AppState = {
  dishes: Dish[];
  asks: Ask[];
  requests: Req[];
  ratings: Rating[];
  flavors: FlavorScore[];
  chefAvg: number | null;
  eatOuts: EatOut[];
  eatOutTotal: number;
  eatOutMonth: number;
  hunger: { id: number; createdAt: string } | null;
  history: HistoryItem[];
};

export async function getState(): Promise<AppState> {
  await ready();
  const s = db();
  const [dishRows, askRows, optRows, reqRows, ratingRows, eatRows, eatCounts, hungerRows, mealRows, outRows] = await Promise.all([
    s`
      select d.*,
        (select count(*) from asks a where a.picked_dish_id = d.id and a.status in ('cooked','rated'))::int as times_cooked,
        (select max(a.cooked_at) from asks a where a.picked_dish_id = d.id) as last_cooked,
        (select avg(r.stars)::float from ratings r where r.dish_id = d.id) as avg_stars,
        (select count(*) from ratings r where r.dish_id = d.id)::int as rating_count
      from dishes d order by d.created_at desc`,
    s`select * from asks order by created_at desc limit 40`,
    s`select ao.* from ask_options ao join (select id from asks order by created_at desc limit 40) a on a.id = ao.ask_id`,
    s`select * from requests order by created_at desc limit 40`,
    s`select r.*, d.name as dish_name from ratings r left join dishes d on d.id = r.dish_id order by r.created_at desc limit 200`,
    s`select * from eat_outs order by created_at desc limit 30`,
    s`select count(*)::int as total,
        count(*) filter (where decided_at >= date_trunc('month', now() at time zone 'America/New_York') at time zone 'America/New_York')::int as month
      from eat_outs where status = 'accepted'`,
    s`select id, created_at from hunger_pings where status = 'active' order by created_at desc limit 1`,
    s`select a.id, a.meal, coalesce(a.cooked_at, a.picked_at) as at, a.photo_id, d.id as dish_id, d.name, d.cuisine, d.image_id,
        r.stars, r.note
      from asks a join dishes d on d.id = a.picked_dish_id
      left join lateral (select stars, note from ratings where ask_id = a.id order by created_at desc limit 1) r on true
      where a.status in ('cooked', 'rated') order by at desc limit 500`,
    s`select id, meal, place, decided_at from eat_outs where status = 'accepted' order by decided_at desc limit 200`,
  ]);
  const eatOuts: EatOut[] = eatRows.map((e: any) => ({
    id: e.id, meal: e.meal, place: e.place, note: e.note, status: e.status, createdAt: e.created_at, decidedAt: e.decided_at,
  }));

  const dishes: Dish[] = dishRows.map((d: any) => ({
    id: d.id,
    name: d.name,
    meal: d.meal,
    cuisine: d.cuisine,
    flavors: d.flavors || [],
    description: d.description,
    imageId: d.image_id,
    archived: d.archived,
    timesCooked: d.times_cooked,
    avgStars: d.avg_stars,
    ratingCount: d.rating_count,
    lastCooked: d.last_cooked,
  }));

  const asks: Ask[] = askRows.map((a: any) => ({
    id: a.id,
    meal: a.meal,
    note: a.note,
    status: a.status,
    pickedDishId: a.picked_dish_id,
    pickedAt: a.picked_at,
    cookedAt: a.cooked_at,
    createdAt: a.created_at,
    options: optRows.filter((o: any) => o.ask_id === a.id).map((o: any) => o.dish_id),
    photoId: a.photo_id,
  }));

  const requests: Req[] = reqRows.map((r: any) => ({
    id: r.id,
    askId: r.ask_id,
    meal: r.meal,
    kind: r.kind,
    cuisine: r.cuisine,
    text: r.text,
    recipeUrl: r.recipe_url,
    recipeText: r.recipe_text,
    imageId: r.image_id,
    status: r.status,
    createdAt: r.created_at,
  }));

  const ratings: Rating[] = ratingRows.map((r: any) => ({
    id: r.id,
    askId: r.ask_id,
    dishId: r.dish_id,
    dishName: r.dish_name,
    stars: r.stars,
    loved: r.loved || [],
    nope: r.nope || [],
    chefStars: r.chef_stars,
    note: r.note,
    createdAt: r.created_at,
  }));

  // Flavor report: average stars of dishes carrying the flavor,
  // plus explicit "loved it" (counts as a 5) and "not for me" (counts as a 1).
  const dishById = new Map(dishes.map((d) => [d.id, d]));
  const acc = new Map<string, { sum: number; n: number; loves: number; nopes: number }>();
  const bump = (f: string) => {
    if (!acc.has(f)) acc.set(f, { sum: 0, n: 0, loves: 0, nopes: 0 });
    return acc.get(f)!;
  };
  for (const r of ratings) {
    const d = r.dishId ? dishById.get(r.dishId) : undefined;
    for (const f of d?.flavors || []) {
      const a = bump(f);
      a.sum += r.stars;
      a.n += 1;
    }
    for (const f of r.loved) bump(f).loves += 1;
    for (const f of r.nope) bump(f).nopes += 1;
  }
  const flavors: FlavorScore[] = [...acc.entries()]
    .map(([flavor, a]) => {
      const total = a.n + a.loves + a.nopes;
      const score = total ? (a.sum + a.loves * 5 + a.nopes * 1) / total : 0;
      return { flavor, score: Math.round(score * 10) / 10, loves: a.loves, nopes: a.nopes, n: a.n };
    })
    .filter((f) => FLAVORS.includes(f.flavor) || f.n + f.loves + f.nopes > 0)
    .sort((a, b) => b.score - a.score);

  const chefRatings = ratings.filter((r) => r.chefStars);
  const chefAvg = chefRatings.length ? chefRatings.reduce((t, r) => t + (r.chefStars || 0), 0) / chefRatings.length : null;

  const history: HistoryItem[] = [
    ...mealRows.map((m: any) => ({
      kind: "meal" as const, id: m.id, at: m.at, meal: m.meal, name: m.name, cuisine: m.cuisine, dishId: m.dish_id,
      photoId: m.photo_id || m.image_id || null, stars: m.stars ?? null, note: m.note ?? null,
    })),
    ...outRows.map((o: any) => ({
      kind: "out" as const, id: o.id, at: o.decided_at, meal: o.meal, name: o.place || "Ate out", cuisine: null, dishId: null,
      photoId: null, stars: null, note: null,
    })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const hunger = hungerRows[0] ? { id: hungerRows[0].id, createdAt: hungerRows[0].created_at } : null;

  return { dishes, asks, requests, ratings, flavors, chefAvg, eatOuts, eatOutTotal: eatCounts[0].total, eatOutMonth: eatCounts[0].month, hunger, history };
}

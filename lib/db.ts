import postgres from "postgres";

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;

declare global {
  // eslint-disable-next-line no-var
  var __sql: ReturnType<typeof postgres> | undefined;
  // eslint-disable-next-line no-var
  var __schemaReady: Promise<void> | undefined;
}

function client() {
  if (!url) throw new Error("DATABASE_URL is not set. Connect a Postgres database in Vercel (Storage → Neon).");
  if (!global.__sql) {
    const local = /localhost|127\.0\.0\.1/.test(url);
    global.__sql = postgres(url, { ssl: local ? false : "require", max: 3, idle_timeout: 20, prepare: false });
  }
  return global.__sql;
}

export function db() {
  return client();
}

const SCHEMA = `
create table if not exists settings (key text primary key, value text not null);
create table if not exists images (id serial primary key, data text not null, created_at timestamptz default now());
create table if not exists dishes (
  id serial primary key,
  name text not null,
  meal text not null default 'both',
  cuisine text,
  flavors text[] not null default '{}',
  description text,
  image_id int references images(id),
  archived boolean not null default false,
  created_at timestamptz default now()
);
create table if not exists asks (
  id serial primary key,
  meal text not null,
  note text,
  status text not null default 'open',
  picked_dish_id int references dishes(id),
  picked_at timestamptz,
  cooked_at timestamptz,
  created_at timestamptz default now()
);
create table if not exists ask_options (ask_id int references asks(id) on delete cascade, dish_id int references dishes(id), primary key (ask_id, dish_id));
create table if not exists requests (
  id serial primary key,
  ask_id int references asks(id),
  meal text,
  kind text not null,
  cuisine text,
  text text,
  recipe_url text,
  recipe_text text,
  image_id int references images(id),
  status text not null default 'new',
  created_at timestamptz default now()
);
create table if not exists ratings (
  id serial primary key,
  ask_id int references asks(id),
  dish_id int references dishes(id),
  stars int not null,
  loved text[] not null default '{}',
  nope text[] not null default '{}',
  chef_stars int,
  note text,
  created_at timestamptz default now()
);
create table if not exists push_subs (
  endpoint text primary key,
  role text not null,
  sub jsonb not null,
  created_at timestamptz default now()
);
`;

export async function ready() {
  if (!global.__schemaReady) {
    global.__schemaReady = (async () => {
      await client().unsafe(SCHEMA);
    })().catch((e) => {
      global.__schemaReady = undefined;
      throw e;
    });
  }
  return global.__schemaReady;
}

export async function getSetting(key: string, make: () => string): Promise<string> {
  await ready();
  const s = client();
  const rows = await s`select value from settings where key = ${key}`;
  if (rows.length) return rows[0].value;
  const value = make();
  await s`insert into settings (key, value) values (${key}, ${value}) on conflict (key) do nothing`;
  const again = await s`select value from settings where key = ${key}`;
  return again[0].value;
}

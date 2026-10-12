-- Quiltopia: the shared world, for Supabase.
-- Run this whole file in your project's SQL editor, then run supabase/seed.sql (made by
-- tools/seed-sql.html). Every rule the game shows on screen is checked again here, so a modified
-- client can't cheat. Safe to run again after changes, and it upgrades a world made with the
-- first version of this file.

-- =========================================================================
-- Tables
-- =========================================================================

-- One row of rule numbers. supabase/seed.sql fills it from js/rules.js and js/config.js; `rules`
-- carries the rest of js/rules.js and js/stitchlings.js (XP, goals, the shop, Stitchlings) as JSON.
create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  period_minutes int not null default 60,
  commons_requires_signin boolean not null default false,
  picks_per_period int not null default 3,
  surprises_per_period int not null default 2,
  bag_cap int not null default 15,
  help_bonus int not null default 3,
  wonder_per_period int not null default 3,
  block_size int not null default 64,
  plot_size int not null default 8,
  plot_stride int not null default 10,
  plot_offset int not null default 2,
  plots_per_side int not null default 6,
  surprise_pool text[] not null default array['lantern', 'lantern', 'lantern', 'house', 'garden', 'tree', 'water', 'path', 'park', 'market'],
  rules jsonb not null default '{}'::jsonb
);
alter table public.settings add column if not exists rules jsonb not null default '{}'::jsonb;

create table if not exists public.blocks (
  id smallint primary key,
  gx smallint not null,
  gy smallint not null,
  kind text not null check (kind in ('neighborhood', 'commons')),
  name text not null,
  unique (gx, gy)
);

-- Blocks still to come, landscape and all. The quilt grows into them, in order, as players arrive.
create table if not exists public.block_plans (
  id smallint primary key,
  gx smallint not null,
  gy smallint not null,
  kind text not null check (kind in ('neighborhood', 'commons')),
  name text not null,
  landscape jsonb not null  -- [[x, y, kind], ...] in world squares
);

-- One string per row; each letter is a slot kind (see slotKinds in settings.rules), '.' frames it.
create table if not exists public.blueprints (
  id text primary key,
  name text not null,
  size text not null,
  rows text[] not null,
  sprite text  -- the Stitchling every builder gets when it's finished
);
alter table public.blueprints add column if not exists sprite text;

create table if not exists public.wonders (
  id int primary key,
  blueprint text not null references public.blueprints,
  x int not null,
  y int not null,
  slots int not null,
  filled int not null default 0,
  completed_at timestamptz,
  block_id smallint,
  lot smallint,
  status text not null default 'open',
  founders uuid[] not null default '{}',
  founded_by uuid,
  founded_at timestamptz,
  opened_at timestamptz
);
alter table public.wonders add column if not exists block_id smallint;
alter table public.wonders add column if not exists lot smallint;
alter table public.wonders add column if not exists status text not null default 'open';
alter table public.wonders add column if not exists founders uuid[] not null default '{}';
alter table public.wonders add column if not exists founded_by uuid;
alter table public.wonders add column if not exists founded_at timestamptz;
alter table public.wonders add column if not exists opened_at timestamptz;
alter table public.wonders drop constraint if exists wonders_status_check;
alter table public.wonders add constraint wonders_status_check check (status in ('founding', 'open'));
-- Wonders founded by players are numbered from here.
create sequence if not exists public.wonder_ids start 100;

create table if not exists public.nations (
  code text primary key,
  name text not null
);

create table if not exists public.name_words (
  kind text not null check (kind in ('adjective', 'noun')),
  word text not null,
  primary key (kind, word)
);

create table if not exists public.players (
  id uuid primary key references auth.users on delete cascade,
  name text not null,
  nation text references public.nations,
  home_block smallint references public.blocks,
  home_plot smallint,
  picks int not null default 0,
  items jsonb not null default '{}'::jsonb,       -- surprise patches: { kind: count }
  keep jsonb not null default '{}'::jsonb,        -- landmarks and decorations: { kind: count }
  last_period bigint not null default 0,
  help_period bigint not null default -1,
  helps int not null default 0,
  banned boolean not null default false,
  xp int not null default 0,
  buttons int not null default 0,
  calendar_day int not null default 0,            -- the next calendar slot to pay out (0 to 6)
  calendar_last int not null default -1,          -- the day it last paid out
  goals_day int not null default -1,
  goals_done text[] not null default '{}',
  goals_bonus boolean not null default false,
  stitchbook jsonb not null default '{}'::jsonb,  -- { species: when first met, in ms }
  friends uuid[] not null default '{}',
  visited smallint[] not null default '{}',
  style text not null default 'patchwork',
  styles text[] not null default array['patchwork'],
  outfit text,
  outfits text[] not null default '{}',
  invited_by uuid,
  invite_rewarded boolean not null default false,
  kit_done boolean not null default false,
  gift_day int not null default -1,
  wishes jsonb not null default '{}'::jsonb,      -- { "x,y" of a home: wishes already granted there }
  wish_day int not null default -1,
  wish_count int not null default 0,              -- wishes granted on wish_day
  fabric text,                                    -- the home's quilt fabric (null: picked from the id)
  fabrics text[] not null default '{}',           -- fabrics bought in the Button Shop or given by the Club
  club_until timestamptz,                         -- a Quiltopia Club member until then (public: it's a badge)
  created_at timestamptz not null default now(),
  unique (home_block, home_plot)
);
alter table public.players add column if not exists keep jsonb not null default '{}'::jsonb;
alter table public.players add column if not exists xp int not null default 0;
alter table public.players add column if not exists buttons int not null default 0;
alter table public.players add column if not exists calendar_day int not null default 0;
alter table public.players add column if not exists calendar_last int not null default -1;
alter table public.players add column if not exists goals_day int not null default -1;
alter table public.players add column if not exists goals_done text[] not null default '{}';
alter table public.players add column if not exists goals_bonus boolean not null default false;
alter table public.players add column if not exists stitchbook jsonb not null default '{}'::jsonb;
alter table public.players add column if not exists friends uuid[] not null default '{}';
alter table public.players add column if not exists visited smallint[] not null default '{}';
alter table public.players add column if not exists style text not null default 'patchwork';
alter table public.players add column if not exists styles text[] not null default array['patchwork'];
alter table public.players add column if not exists outfit text;
alter table public.players add column if not exists outfits text[] not null default '{}';
alter table public.players add column if not exists invited_by uuid;
alter table public.players add column if not exists invite_rewarded boolean not null default false;
alter table public.players add column if not exists kit_done boolean not null default false;
alter table public.players add column if not exists gift_day int not null default -1;
alter table public.players add column if not exists wishes jsonb not null default '{}'::jsonb;
alter table public.players add column if not exists wish_day int not null default -1;
alter table public.players add column if not exists wish_count int not null default 0;
alter table public.players add column if not exists fabric text;
alter table public.players add column if not exists fabrics text[] not null default '{}';
alter table public.players add column if not exists club_until timestamptz;

-- Which Stripe subscription is whose (written by supabase/functions/club-webhook; never read by the game).
create table if not exists public.club_subscriptions (
  subscription text primary key,
  player uuid not null references public.players on delete cascade,
  at timestamptz not null default now()
);

create table if not exists public.patches (
  id bigint generated always as identity primary key,
  x int not null,
  y int not null,
  kind text not null,
  owner uuid references public.players on delete cascade,  -- null: part of the season's landscape
  wonder_id int references public.wonders,
  beside boolean not null default false,  -- placed right next to someone else's patch
  gift_from text,                          -- a friend's id, or 'kit' for the welcome kit
  placed_at timestamptz not null default now(),
  unique (x, y)
);
alter table public.patches add column if not exists beside boolean not null default false;
alter table public.patches add column if not exists gift_from text;
alter table public.patches drop constraint if exists patches_kind_check;
alter table public.patches add constraint patches_kind_check check (kind in (
  'house', 'garden', 'tree', 'water', 'path', 'park', 'market', 'lantern', 'windmill', 'lighthouse', 'cherry',
  'bench', 'fountain', 'flowerpot', 'birdhouse', 'scarecrow', 'bunting'));
create index if not exists patches_owner_wonder on public.patches (owner, wonder_id, placed_at);
create index if not exists patches_placed_at on public.patches (placed_at);
create index if not exists patches_wonder on public.patches (wonder_id) where wonder_id is not null;

create table if not exists public.waterings (
  garden_id bigint not null references public.patches on delete cascade,
  helper uuid not null references public.players on delete cascade,
  period bigint not null,
  at timestamptz not null default now(),
  primary key (garden_id, helper, period)
);
create index if not exists waterings_helper_at on public.waterings (helper, at);

-- One sticker per target per day from each player. target: 'home:<player id>' or 'wonder:<id>'.
create table if not exists public.stickers (
  id bigint generated always as identity primary key,
  from_player uuid not null references public.players on delete cascade,
  target text not null,
  kind text not null,
  day int not null,
  at timestamptz not null default now(),
  unique (from_player, target, day)
);
create index if not exists stickers_at on public.stickers (at);

-- Patches waiting in someone's bag: from a friend, or the welcome kit. Used ones keep used_at.
create table if not exists public.gifts (
  id bigint generated always as identity primary key,
  to_player uuid not null references public.players on delete cascade,
  from_player uuid references public.players on delete set null,
  kit boolean not null default false,
  kind text not null,
  at timestamptz not null default now(),
  used_at timestamptz
);
create index if not exists gifts_waiting on public.gifts (to_player) where used_at is null;
create index if not exists gifts_from_at on public.gifts (from_player, at);

-- Who met which Stitchling, and who explored which Block (for the daily goals).
create table if not exists public.meets (
  player uuid not null references public.players on delete cascade,
  species text not null,
  at timestamptz not null default now()
);
create index if not exists meets_player_at on public.meets (player, at);
create table if not exists public.visits (
  player uuid not null references public.players on delete cascade,
  block_id smallint not null,
  at timestamptz not null default now()
);
create index if not exists visits_player_at on public.visits (player, at);

create table if not exists public.reports (
  id bigint generated always as identity primary key,
  patch_id bigint references public.patches on delete set null,
  x int not null,
  y int not null,
  kind text not null,
  owner uuid,
  reporter uuid not null references public.players on delete cascade,
  reason text not null check (reason in ('symbol', 'other')),
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

-- Prototype analytics: app opens, invites sent and accepted, Wonder progress. See README for queries.
create table if not exists public.events (
  id bigint generated always as identity primary key,
  player uuid,
  name text not null,
  props jsonb not null default '{}'::jsonb,
  at timestamptz not null default now()
);
create index if not exists events_name_at on public.events (name, at);

-- Moderators. Add yourself after joining once (see README).
create table if not exists public.admins (
  id uuid primary key references auth.users on delete cascade
);

-- =========================================================================
-- Helpers
-- =========================================================================

create or replace function public.err(msg text) returns jsonb
language sql immutable as $$
  select jsonb_build_object('ok', false, 'error', msg)
$$;

create or replace function public.rules() returns jsonb
language sql stable set search_path = public as $$
  select rules from settings
$$;

-- Milliseconds since 1970, the way the game counts time.
create or replace function public.ms(t timestamptz) returns bigint
language sql immutable as $$
  select (extract(epoch from t) * 1000)::bigint
$$;

create or replace function public.current_period() returns bigint
language sql stable set search_path = public as $$
  select floor(extract(epoch from now()) / (period_minutes * 60))::bigint from settings
$$;

create or replace function public.period_of(t timestamptz) returns bigint
language sql stable set search_path = public as $$
  select floor(extract(epoch from t) / (period_minutes * 60))::bigint from settings
$$;

-- Days since 1970 in UTC, like dayOf in js/rules.js.
create or replace function public.today() returns int
language sql stable as $$
  select floor(extract(epoch from now()) / 86400)::int
$$;

-- How the error messages talk about one allowance period.
create or replace function public.period_word() returns text
language sql stable set search_path = public as $$
  select case when period_minutes >= 1440 then 'today' when period_minutes = 60 then 'this hour' else 'this round' end from settings
$$;

create or replace function public.patch_name(p_kind text) returns text
language sql stable set search_path = public as $$
  select coalesce(rules() -> 'names' ->> p_kind, initcap(p_kind))
$$;

create or replace function public.bag_total(p public.players) returns int
language sql immutable as $$
  select p.picks + coalesce((select sum(value::int) from jsonb_each_text(p.items)), 0)::int
$$;

-- jsonb counts: { kind: n } with n changed by d (a count that reaches 0 is removed).
create or replace function public.bump(counts jsonb, k text, d int) returns jsonb
language sql immutable as $$
  select case when coalesce((counts ->> k)::int, 0) + d > 0
    then jsonb_set(counts, array[k], to_jsonb(coalesce((counts ->> k)::int, 0) + d))
    else counts - k end
$$;

-- Home plot index from coordinates inside a Block, or null on a lane.
create or replace function public.plot_index(lx int, ly int) returns int
language plpgsql stable set search_path = public as $$
declare
  s settings;
  ox int;
  oy int;
begin
  select * into s from settings;
  ox := lx - s.plot_offset;
  oy := ly - s.plot_offset;
  if ox < 0 or oy < 0 then return null; end if;
  if ox / s.plot_stride >= s.plots_per_side or oy / s.plot_stride >= s.plots_per_side then return null; end if;
  if ox % s.plot_stride >= s.plot_size or oy % s.plot_stride >= s.plot_size then return null; end if;
  return (oy / s.plot_stride) * s.plots_per_side + ox / s.plot_stride;
end $$;

create or replace function public.valid_name(p_name text) returns boolean
language sql stable set search_path = public as $$
  select coalesce(array_length(regexp_split_to_array(p_name, ' '), 1) = 2, false)
    and exists (select 1 from name_words where kind = 'adjective' and word = split_part(p_name, ' ', 1))
    and exists (select 1 from name_words where kind = 'noun' and word = split_part(p_name, ' ', 2))
$$;

-- Builder level from XP: level L starts at 50 x L x (L - 1).
create or replace function public.level_of(p_xp int) returns int
language plpgsql immutable as $$
declare
  l int := 1;
begin
  while p_xp >= 50 * (l + 1) * l loop
    l := l + 1;
  end loop;
  return l;
end $$;

-- Adds XP, paying 20 x level Buttons for every level gained and unlocking roof styles.
create or replace function public.grant_xp(p_player uuid, p_amount int) returns void
language plpgsql security definer set search_path = public as $$
declare
  me players;
  lv_before int;
  lv_after int;
  unlocked text;
begin
  select * into me from players where id = p_player for update;
  if not found or p_amount <= 0 then return; end if;
  lv_before := level_of(me.xp);
  me.xp := me.xp + p_amount;
  lv_after := level_of(me.xp);
  for l in lv_before + 1 .. lv_after loop
    me.buttons := me.buttons + 20 * l;
    unlocked := rules() -> 'unlocks' ->> l::text;
    if unlocked is not null and not unlocked = any(me.styles) then
      me.styles := me.styles || unlocked;
    end if;
  end loop;
  update players set xp = me.xp, buttons = me.buttons, styles = me.styles where id = p_player;
end $$;

-- Everything the game knows about you, in the game's own shape. Only you see this.
create or replace function public.me_json(p_player uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', p.id, 'name', p.name, 'nation', p.nation, 'homeBlock', p.home_block, 'homePlot', p.home_plot,
    'createdAt', ms(p.created_at), 'picks', p.picks, 'items', p.items, 'keep', p.keep,
    'gifts', coalesce((
      select jsonb_agg(jsonb_build_object('id', g.id, 'kind', g.kind, 'from', case when g.kit then 'kit' else g.from_player::text end) order by g.id)
      from gifts g where g.to_player = p.id and g.used_at is null), '[]'::jsonb),
    'lastPeriod', p.last_period, 'helpPeriod', p.help_period, 'helps', p.helps, 'banned', p.banned,
    'xp', p.xp, 'buttons', p.buttons,
    'calendar', jsonb_build_object('day', p.calendar_day, 'last', p.calendar_last),
    'goals', jsonb_build_object('day', p.goals_day, 'done', to_jsonb(p.goals_done), 'bonus', p.goals_bonus),
    'stitchbook', p.stitchbook, 'friends', to_jsonb(p.friends), 'visited', to_jsonb(p.visited),
    'style', p.style, 'styles', to_jsonb(p.styles), 'outfit', p.outfit, 'outfits', to_jsonb(p.outfits),
    'invitedBy', p.invited_by, 'inviteRewarded', p.invite_rewarded, 'kitDone', p.kit_done, 'giftDay', p.gift_day,
    'wishes', p.wishes, 'wishDay', p.wish_day, 'wishCount', p.wish_count, 'fabric', p.fabric, 'fabrics', to_jsonb(p.fabrics),
    'clubUntil', ms(p.club_until))
  from players p where p.id = p_player
$$;

-- The reply to an action: ok, your latest state, any extras, and the new level if you went up.
create or replace function public.ok_me(p_player uuid, p_level_before int, p_extra jsonb) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  me jsonb := me_json(p_player);
  lv int := level_of((me ->> 'xp')::int);
begin
  return jsonb_build_object('ok', true, 'me', me) || coalesce(p_extra, '{}'::jsonb)
    || case when p_level_before is not null and lv > p_level_before then jsonb_build_object('levelUp', lv) else '{}'::jsonb end;
end $$;

create or replace function public.patch_json(p public.patches) returns jsonb
language sql stable set search_path = public as $$
  select jsonb_build_object('id', p.id, 'x', p.x, 'y', p.y, 'kind', p.kind, 'owner', p.owner, 'wonder', p.wonder_id,
    'at', ms(p.placed_at), 'gift', p.gift_from, 'beside', p.beside)
$$;

create or replace function public.wonder_json(w public.wonders) returns jsonb
language sql stable set search_path = public as $$
  select jsonb_build_object('id', w.id, 'blueprint', w.blueprint, 'x', w.x, 'y', w.y, 'slots', w.slots, 'filled', w.filled,
    'completedAt', ms(w.completed_at), 'block', w.block_id, 'lot', w.lot, 'status', w.status,
    'founders', to_jsonb(w.founders), 'foundedBy', w.founded_by, 'foundedAt', ms(w.founded_at), 'openedAt', ms(w.opened_at))
$$;

-- Grants every period since the player's last visit, stopping at the bag cap.
-- Returns what it added: { picks, items: [kinds] }.
create or replace function public.accrue(p_player uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  s settings;
  me players;
  cur bigint := current_period();
  total int;
  periods int;
  n_add int;
  surprise text;
  added_picks int := 0;
  added_items text[] := '{}';
begin
  select * into s from settings;
  select * into me from players where id = p_player for update;
  if not found or me.last_period >= cur then
    return jsonb_build_object('picks', 0, 'items', '[]'::jsonb);
  end if;
  total := bag_total(me);
  periods := least(cur - me.last_period, ceil(s.bag_cap::numeric / (s.picks_per_period + s.surprises_per_period))::int + 1);
  for i in 1..periods loop
    exit when total >= s.bag_cap;
    n_add := least(s.picks_per_period, s.bag_cap - total);
    me.picks := me.picks + n_add;
    added_picks := added_picks + n_add;
    total := total + n_add;
    for j in 1..s.surprises_per_period loop
      exit when total >= s.bag_cap;
      surprise := s.surprise_pool[1 + floor(random() * array_length(s.surprise_pool, 1))::int];
      me.items := bump(me.items, surprise, 1);
      added_items := added_items || surprise;
      total := total + 1;
    end loop;
  end loop;
  update players set picks = me.picks, items = me.items, last_period = cur where id = p_player;
  return jsonb_build_object('picks', added_picks, 'items', to_jsonb(added_items));
end $$;

-- What a square is, and who may build there (mirrors zoneOf in js/rules.js):
-- outside, plot (owner may be null), shared, commons, lot, founding, slot or frame.
create or replace function public.zone_at(p_x int, p_y int) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  s settings;
  r jsonb := rules();
  b blocks;
  w wonders;
  bp blueprints;
  lx int;
  ly int;
  lot_x int;
  lot_y int;
  lot_size int := (r ->> 'lot')::int;
  plot int;
  plot_owner uuid;
  ch text;
begin
  select * into s from settings;
  select * into b from blocks where gx = floor(p_x::numeric / s.block_size) and gy = floor(p_y::numeric / s.block_size);
  if not found then return jsonb_build_object('type', 'outside'); end if;
  lx := p_x - b.gx * s.block_size;
  ly := p_y - b.gy * s.block_size;
  if b.kind = 'commons' then
    for i in 0 .. jsonb_array_length(r -> 'lots') - 1 loop
      lot_x := (r -> 'lots' -> i ->> 0)::int;
      lot_y := (r -> 'lots' -> i ->> 1)::int;
      continue when lx < lot_x or ly < lot_y or lx >= lot_x + lot_size or ly >= lot_y + lot_size;
      select * into w from wonders where block_id = b.id and lot = i;
      if not found then return jsonb_build_object('type', 'lot', 'block', b.id, 'lot', i); end if;
      select * into bp from blueprints where id = w.blueprint;
      if w.status = 'founding' then
        return jsonb_build_object('type', 'founding', 'block', b.id, 'wonder', w.id, 'name', bp.name);
      end if;
      if p_x >= w.x and p_y >= w.y and p_y < w.y + array_length(bp.rows, 1) and p_x < w.x + length(bp.rows[1]) then
        ch := substr(bp.rows[p_y - w.y + 1], p_x - w.x + 1, 1);
      end if;
      return jsonb_build_object('type', case when r -> 'slotKinds' ->> ch is not null then 'slot' else 'frame' end,
        'block', b.id, 'wonder', w.id, 'name', bp.name, 'slotKind', r -> 'slotKinds' ->> ch);
    end loop;
    return jsonb_build_object('type', 'commons', 'block', b.id);
  end if;
  plot := plot_index(lx, ly);
  if plot is not null then
    select id into plot_owner from players where home_block = b.id and home_plot = plot;
    return jsonb_build_object('type', 'plot', 'block', b.id, 'plot', plot, 'owner', plot_owner);
  end if;
  return jsonb_build_object('type', 'shared', 'block', b.id, 'blockName', b.name);
end $$;

-- Whether a square touches someone else's patch (for the "build next to a neighbor" goal).
create or replace function public.beside_neighbor(p_x int, p_y int, p_owner uuid) returns boolean
language sql stable set search_path = public as $$
  select exists (
    select 1 from (values (0, -1), (1, 0), (0, 1), (-1, 0)) d(dx, dy)
    join patches p on p.x = p_x + d.dx and p.y = p_y + d.dy
    where p.owner is not null and p.owner <> p_owner)
$$;

-- Uses up one patch of a kind (mirrors spend in js/rules.js): a gift first, so it carries the
-- giver's name, then a matching surprise, then a pick. Keepsakes come from what you keep.
-- Returns { used, from }, or null when there's none.
create or replace function public.spend_patch(p_player uuid, p_kind text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me players;
  g gifts;
  grp text := rules() -> 'groups' ->> p_kind;
begin
  select * into me from players where id = p_player for update;
  if grp in ('landmark', 'decor') then
    if coalesce((me.keep ->> p_kind)::int, 0) <= 0 then return null; end if;
    update players set keep = bump(keep, p_kind, -1) where id = p_player;
    return jsonb_build_object('used', 'keep');
  end if;
  select * into g from gifts where to_player = p_player and used_at is null and kind = p_kind order by id limit 1 for update;
  if found then
    update gifts set used_at = now() where id = g.id;
    return jsonb_build_object('used', 'gift', 'from', case when g.kit then 'kit' else g.from_player::text end);
  end if;
  if coalesce((me.items ->> p_kind)::int, 0) > 0 then
    update players set items = bump(items, p_kind, -1) where id = p_player;
    return jsonb_build_object('used', 'item');
  end if;
  if grp = 'basic' and me.picks > 0 then
    update players set picks = picks - 1 where id = p_player;
    return jsonb_build_object('used', 'pick');
  end if;
  return null;
end $$;

-- A finished Wonder: every builder gets XP, Buttons and the Wonder's own Stitchling.
create or replace function public.complete_wonder(p_wonder int) returns void
language plpgsql security definer set search_path = public as $$
declare
  r jsonb := rules();
  sprite_id text;
  builder uuid;
begin
  update wonders set completed_at = now() where id = p_wonder and completed_at is null;
  if not found then return; end if;
  select bp.sprite into sprite_id from wonders w join blueprints bp on bp.id = w.blueprint where w.id = p_wonder;
  for builder in select distinct owner from patches where wonder_id = p_wonder and owner is not null loop
    perform grant_xp(builder, (r -> 'xp' ->> 'wonderDone')::int);
    update players set
      buttons = buttons + coalesce((r ->> 'wonderButtons')::int, 50),
      stitchbook = case when sprite_id is null or stitchbook -> sprite_id is not null then stitchbook
        else stitchbook || jsonb_build_object(sprite_id, ms(now())) end
      where id = builder;
  end loop;
  perform propose_next_wonder();
end $$;

-- There's always a next Wonder. Once every Wonder is finished and none is gathering founders, the
-- town proposes one: the blueprint built least so far (ties go alphabetically), on the first free
-- Commons lot. Nobody has signed it yet. (rules.js nextProposal is the same rule.)
create or replace function public.propose_next_wonder() returns void
language plpgsql security definer set search_path = public as $$
declare
  s settings;
  r jsonb := rules();
  lot_size int := (rules() ->> 'lot')::int;
  bp blueprints;
  b blocks;
  i int;
  slot_count int;
begin
  perform pg_advisory_xact_lock(hashtext('quiltopia:found'));
  if exists (select 1 from wonders where completed_at is null) then return; end if;
  select * into s from settings;
  select * into bp from blueprints x order by (select count(*) from wonders w where w.blueprint = x.id), x.id limit 1;
  if not found then return; end if;
  select count(*) into slot_count from unnest(bp.rows) as rw(line), regexp_split_to_table(rw.line, '') as ch(c)
    where r -> 'slotKinds' ->> ch.c is not null;
  for b in select * from blocks where kind = 'commons' order by id loop
    for i in 0 .. jsonb_array_length(r -> 'lots') - 1 loop
      if not exists (select 1 from wonders where block_id = b.id and lot = i) then
        insert into wonders (id, blueprint, x, y, slots, filled, block_id, lot, status, founders, founded_by, founded_at)
          values (nextval('wonder_ids'), bp.id,
            b.gx * s.block_size + (r -> 'lots' -> i ->> 0)::int + (lot_size - length(bp.rows[1])) / 2,
            b.gy * s.block_size + (r -> 'lots' -> i ->> 1)::int + (lot_size - array_length(bp.rows, 1)) / 2,
            slot_count, 0, b.id, i, 'founding', '{}', null, now());
        return;
      end if;
    end loop;
  end loop;
end $$;

-- Recounts every Wonder after patches are removed, reopening any that are no longer complete.
create or replace function public.recount_wonders() returns void
language sql security definer set search_path = public as $$
  update wonders w set
    filled = (select count(*) from patches p where p.wonder_id = w.id),
    completed_at = case when (select count(*) from patches p where p.wonder_id = w.id) >= w.slots then w.completed_at end
$$;

-- When every home is taken, stitch the next planned Blocks onto the quilt until one has a home
-- free (every fourth is a Commons). Returns the new Neighborhood's name, or null.
create or replace function public.grow_if_full() returns text
language plpgsql security definer set search_path = public as $$
declare
  s settings;
  nxt block_plans;
  grew text;
begin
  select * into s from settings;
  loop
    exit when exists (
      select 1 from blocks bl cross join generate_series(0, s.plots_per_side * s.plots_per_side - 1) as pl(n)
      where bl.kind = 'neighborhood'
        and not exists (select 1 from players p where p.home_block = bl.id and p.home_plot = pl.n));
    select * into nxt from block_plans where id = (select coalesce(max(id), -1) + 1 from blocks);
    -- Out of planned Blocks: newcomers join without a home until more are planned (see README).
    exit when not found;
    insert into blocks (id, gx, gy, kind, name) values (nxt.id, nxt.gx, nxt.gy, nxt.kind, nxt.name);
    insert into patches (x, y, kind)
      select (l ->> 0)::int, (l ->> 1)::int, l ->> 2 from jsonb_array_elements(nxt.landscape) l
      on conflict (x, y) do nothing;
    if nxt.kind = 'neighborhood' then grew := nxt.name; end if;
  end loop;
  return grew;
end $$;

-- =========================================================================
-- Where rare Stitchlings live (mirrors rareSites in js/stitchlings.js)
-- =========================================================================

-- Patches of these kinds in the square of radius p_r around (x, y), not counting the middle.
create or replace function public.kinds_near(p_x int, p_y int, p_r int, p_kinds text[]) returns int
language sql stable set search_path = public as $$
  select count(*)::int from patches
  where x between p_x - p_r and p_x + p_r and y between p_y - p_r and p_y + p_r
    and not (x = p_x and y = p_y) and kind = any(p_kinds)
$$;

create or replace function public.kind_at(p_x int, p_y int) returns text
language sql stable set search_path = public as $$
  select kind from patches where x = p_x and y = p_y
$$;

-- A path with water on both sides.
create or replace function public.is_bridge(p_x int, p_y int) returns boolean
language sql stable set search_path = public as $$
  select kind_at(p_x, p_y) = 'path' and (
    (coalesce(kind_at(p_x - 1, p_y), '') = 'water' and coalesce(kind_at(p_x + 1, p_y), '') = 'water')
    or (coalesce(kind_at(p_x, p_y - 1), '') = 'water' and coalesce(kind_at(p_x, p_y + 1), '') = 'water'))
$$;

-- How many different builders' houses a market's paths reach.
create or replace function public.market_reach(p_x int, p_y int) returns int
language sql stable set search_path = public as $$
  with recursive d(dx, dy) as (values (0, -1), (1, 0), (0, 1), (-1, 0)),
  road(rx, ry) as (
    select p.x, p.y from d join patches p on p.x = p_x + d.dx and p.y = p_y + d.dy and p.kind = 'path'
    union
    select p.x, p.y from road join d on true join patches p on p.x = road.rx + d.dx and p.y = road.ry + d.dy and p.kind = 'path'
  ),
  reached as (select rx, ry from road limit 500)
  select count(distinct h.owner)::int
  from reached join d on true join patches h on h.x = reached.rx + d.dx and h.y = reached.ry + d.dy
  where h.kind = 'house' and h.owner is not null
$$;

-- How many squares of these kinds are joined to (x, y), counting up to p_limit.
create or replace function public.group_size(p_x int, p_y int, p_kinds text[], p_limit int) returns int
language sql stable set search_path = public as $$
  with recursive d(dx, dy) as (values (0, -1), (1, 0), (0, 1), (-1, 0)),
  g(cx, cy) as (
    select p.x, p.y from patches p where p.x = p_x and p.y = p_y and p.kind = any(p_kinds)
    union
    select p.x, p.y from g join d on true join patches p on p.x = g.cx + d.dx and p.y = g.cy + d.dy and p.kind = any(p_kinds)
  )
  select count(*)::int from (select 1 from g limit p_limit) s
$$;

-- A field of 6 or more gardens, joined to (x, y), with a park beside one of its squares.
create or replace function public.field_with_park(p_x int, p_y int) returns boolean
language sql stable set search_path = public as $$
  with recursive d(dx, dy) as (values (0, -1), (1, 0), (0, 1), (-1, 0)),
  g(cx, cy) as (
    select p.x, p.y from patches p where p.x = p_x and p.y = p_y and p.kind = 'garden'
    union
    select p.x, p.y from g join d on true join patches p on p.x = g.cx + d.dx and p.y = g.cy + d.dy and p.kind = 'garden'
  ),
  field as (select cx, cy from g limit 400)
  select count(*) >= 6 and coalesce(bool_or(kinds_near(cx, cy, 1, array['park']) > 0), false) from field
$$;

-- Trees (and cherry trees) in the home plot around (x, y).
create or replace function public.trees_in_home(p_x int, p_y int) returns int
language plpgsql stable security definer set search_path = public as $$
declare
  s settings;
  z jsonb := zone_at(p_x, p_y);
  b blocks;
  x0 int;
  y0 int;
begin
  if z ->> 'type' <> 'plot' then return 0; end if;
  select * into s from settings;
  select * into b from blocks where id = (z ->> 'block')::smallint;
  x0 := b.gx * s.block_size + s.plot_offset + ((z ->> 'plot')::int % s.plots_per_side) * s.plot_stride;
  y0 := b.gy * s.block_size + s.plot_offset + ((z ->> 'plot')::int / s.plots_per_side) * s.plot_stride;
  return (select count(*) from patches
    where x between x0 and x0 + s.plot_size - 1 and y between y0 and y0 + s.plot_size - 1 and kind in ('tree', 'cherry'));
end $$;

-- The same scatter as hash2 in js/stitchlings.js (Glowmoths only visit some lanterns).
create or replace function public.hash2(p_x int, p_y int) returns float8
language plpgsql immutable as $$
declare
  h bigint;
begin
  h := ((p_x::bigint * 374761393) & 4294967295) # ((p_y::bigint * 668265263) & 4294967295);
  h := ((h # (h >> 13)) * 1274126177) & 4294967295;
  return (h # (h >> 16))::float8 / 4294967296;
end $$;

-- Whether a rare Stitchling really lives within 6 squares of (x, y).
create or replace function public.rare_site_near(p_species text, p_x int, p_y int, p_night boolean) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  c patches;
begin
  for c in select * from patches where x between p_x - 6 and p_x + 6 and y between p_y - 6 and p_y + 6 loop
    if p_species = 'firefly' and c.kind = 'lantern' and kinds_near(c.x, c.y, 2, array['water']) > 0
      and kinds_near(c.x, c.y, 2, array['tree', 'cherry']) > 0 then return true; end if;
    if p_species = 'lamplighter' and c.kind = 'lantern' and kinds_near(c.x, c.y, 4, array['lantern']) >= 2
      and kinds_near(c.x, c.y, 1, array['path']) > 0 then return true; end if;
    if p_species = 'bridgekeeper' and is_bridge(c.x, c.y) and exists (
      select 1 from (values (0, -1), (1, 0), (0, 1), (-1, 0)) d(dx, dy)
      join patches l on l.x = c.x + d.dx and l.y = c.y + d.dy and l.kind = 'lantern') then return true; end if;
    if p_species = 'glowmoth' and p_night and c.kind = 'lantern' and hash2(c.x, c.y) < 0.35 then return true; end if;
    if p_species = 'picnicpip' and c.kind = 'park' and kinds_near(c.x, c.y, 1, array['garden']) > 0
      and kinds_near(c.x, c.y, 1, array['tree', 'cherry']) > 0 then return true; end if;
    if p_species = 'bazaarmouse' and c.kind = 'market' and market_reach(c.x, c.y) >= 4 then return true; end if;
    if p_species = 'splashkin' and c.kind = 'fountain' and kinds_near(c.x, c.y, 2, array['park']) >= 2 then return true; end if;
    if p_species = 'wren' and c.kind = 'birdhouse' and trees_in_home(c.x, c.y) >= 3 then return true; end if;
    if p_species = 'mossling' and c.kind in ('tree', 'cherry') and group_size(c.x, c.y, array['tree', 'cherry'], 9) >= 9 then return true; end if;
    if p_species = 'bloomkin' and c.kind = 'garden' and field_with_park(c.x, c.y) then return true; end if;
  end loop;
  return false;
end $$;

-- This player's three goals today, with progress (mirrors goalState in js/local-server.js).
create or replace function public.goal_state(p_player uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  r jsonb := rules();
  d int := today();
  since timestamptz := to_timestamp(d::bigint * 86400);
  me players;
  list jsonb := '[]'::jsonb;
  goal text;
  n int;
  goal_target int;
begin
  select * into me from players where id = p_player;
  for goal in select g from jsonb_object_keys(r -> 'goals') g order by md5(p_player::text || ':' || d || ':' || g) limit 3 loop
    n := case goal
      when 'place3' then (select count(*) from patches where owner = p_player and placed_at >= since)
      when 'wonder1' then (select count(*) from patches where owner = p_player and placed_at >= since and wonder_id is not null)
      when 'water2' then (select count(*) from waterings where helper = p_player and at >= since)
      when 'sticker1' then (select count(*) from stickers where from_player = p_player and at >= since)
      when 'meet1' then (select count(*) from meets where player = p_player and at >= since)
      when 'visit1' then (select count(*) from visits where player = p_player and at >= since)
      when 'gift1' then (select count(*) from gifts where from_player = p_player and at >= since)
      when 'beside1' then (select count(*) from patches where owner = p_player and placed_at >= since and beside)
      else 0 end;
    goal_target := (r -> 'goals' -> goal ->> 'target')::int;
    list := list || jsonb_build_array(jsonb_build_object(
      'id', goal, 'text', r -> 'goals' -> goal ->> 'text', 'target', goal_target, 'count', least(n, goal_target),
      'done', n >= goal_target, 'claimed', me.goals_day = d and goal = any(me.goals_done)));
  end loop;
  return jsonb_build_object('day', d, 'bonus', me.goals_day = d and me.goals_bonus, 'list', list);
end $$;

-- =========================================================================
-- Stitchlings' wishes (mirrors homes and needsOf in js/stitchlings.js)
-- =========================================================================

-- The squares of the home at (x, y): houses joined side by side, outside any Wonder.
create or replace function public.home_cells(p_x int, p_y int) returns table (cx int, cy int)
language sql stable set search_path = public as $$
  with recursive d(dx, dy) as (values (0, -1), (1, 0), (0, 1), (-1, 0)),
  g(hx, hy) as (
    select p.x, p.y from patches p where p.x = p_x and p.y = p_y and p.kind = 'house' and p.wonder_id is null
    union
    select p.x, p.y from g join d on true
      join patches p on p.x = g.hx + d.dx and p.y = g.hy + d.dy and p.kind = 'house' and p.wonder_id is null
  )
  select hx, hy from g limit 200
$$;

-- What the home at (x, y) has: food (a garden within 4 squares), fun (a park or fountain within 4),
-- a path beside it, and paths that reach another builder's house within 30 squares of path, so its
-- Stitchlings can visit (mirrors visitsNeighbor in js/stitchlings.js).
create or replace function public.home_needs(p_x int, p_y int) returns jsonb
language sql stable set search_path = public as $$
  with recursive d(dx, dy) as (values (0, -1), (1, 0), (0, 1), (-1, 0)),
  c as (select cx, cy from home_cells(p_x, p_y)),
  b as (select min(cx) as x0, max(cx) as x1, min(cy) as y0, max(cy) as y1 from c),
  walk(wx, wy, n) as (
    select distinct p.x, p.y, 0 from c join d on true join patches p on p.x = c.cx + d.dx and p.y = c.cy + d.dy and p.kind = 'path'
    union
    select p.x, p.y, walk.n + 1 from walk join d on true
      join patches p on p.x = walk.wx + d.dx and p.y = walk.wy + d.dy and p.kind = 'path'
      where walk.n < 30
  )
  select jsonb_build_object(
    'food', exists (select 1 from b join patches p on p.kind = 'garden'
      and p.x between b.x0 - 4 and b.x1 + 4 and p.y between b.y0 - 4 and b.y1 + 4),
    'fun', exists (select 1 from b join patches p on p.kind in ('park', 'fountain')
      and p.x between b.x0 - 4 and b.x1 + 4 and p.y between b.y0 - 4 and b.y1 + 4),
    'path', exists (select 1 from walk where n = 0),
    'visit', exists (select 1 from walk join d on true
      join patches h on h.x = walk.wx + d.dx and h.y = walk.wy + d.dy
      where h.kind = 'house' and h.wonder_id is null and h.owner is not null
        and h.owner is distinct from (select owner from patches where x = p_x and y = p_y)))
$$;

-- Grants the wishes a player's homes now have and weren't paid for yet: XP for each (once per home,
-- up to wishDaily a day) and Buttons for a home with all three. Returns [{ x, y, need }] at each
-- home's top-left square, like grantWishes in js/local-server.js.
create or replace function public.grant_wishes(p_player uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  r jsonb := rules();
  me players;
  d int := today();
  h record;
  has jsonb;
  home_key text;
  done jsonb;
  need text;
  granted jsonb := '[]'::jsonb;
begin
  select * into me from players where id = p_player for update;
  if not found then return granted; end if;
  if me.wish_day <> d then
    me.wish_day := d;
    me.wish_count := 0;
  end if;
  -- Each home once, by its top-left square; only homes whose top-left house is this player's.
  for h in
    select distinct a.ax, a.ay from patches p
      cross join lateral (select cx as ax, cy as ay from home_cells(p.x, p.y) order by cy, cx limit 1) a
      where p.owner = p_player and p.kind = 'house' and p.wonder_id is null
  loop
    continue when (select owner from patches where x = h.ax and y = h.ay) is distinct from p_player;
    has := home_needs(h.ax, h.ay);
    home_key := h.ax || ',' || h.ay;
    done := coalesce(me.wishes -> home_key, '[]'::jsonb);
    foreach need in array array['food', 'fun', 'path', 'visit'] loop
      continue when not (has ->> need)::boolean or done @> jsonb_build_array(need) or me.wish_count >= (r ->> 'wishDaily')::int;
      done := done || jsonb_build_array(need);
      me.wish_count := me.wish_count + 1;
      granted := granted || jsonb_build_array(jsonb_build_object('x', h.ax, 'y', h.ay, 'need', need));
    end loop;
    if (has ->> 'food')::boolean and (has ->> 'fun')::boolean and (has ->> 'path')::boolean and (has ->> 'visit')::boolean
      and not done @> '["cozy"]'::jsonb then
      done := done || '["cozy"]'::jsonb;
      me.buttons := me.buttons + (r ->> 'cozyButtons')::int;
      granted := granted || jsonb_build_array(jsonb_build_object('x', h.ax, 'y', h.ay, 'need', 'cozy'));
    end if;
    if jsonb_array_length(done) > 0 then me.wishes := jsonb_set(me.wishes, array[home_key], done); end if;
  end loop;
  update players set wishes = me.wishes, wish_day = me.wish_day, wish_count = me.wish_count, buttons = me.buttons where id = p_player;
  perform grant_xp(p_player, (r -> 'xp' ->> 'wish')::int * (select count(*)::int from jsonb_array_elements(granted) g where g ->> 'need' <> 'cozy'));
  return granted;
end $$;

-- =========================================================================
-- Player actions (called from the game with supabase.rpc)
-- =========================================================================

create or replace function public.get_me() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  added jsonb;
begin
  if auth.uid() is null then return null; end if;
  if not exists (select 1 from players where id = auth.uid()) then return jsonb_build_object('ok', false, 'me', null); end if;
  added := accrue(auth.uid());
  return ok_me(auth.uid(), null, jsonb_build_object('added', added, 'clubFabric', grant_club_fabric(auth.uid())));
end $$;

drop function if exists public.join_world(text, text);
create or replace function public.join_world(p_name text, p_nation text, p_invited_by uuid default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  s settings;
  b_id smallint;
  plot int;
  grew text;
  inviter uuid;
  added jsonb;
begin
  if auth.uid() is null then return err('Not signed in.'); end if;
  if exists (select 1 from players where id = auth.uid()) then return get_me(); end if;
  if not valid_name(p_name) then return err('Pick a name from the list.'); end if;
  if p_nation is not null and not exists (select 1 from nations where code = p_nation) then
    return err('Pick a nation from the list.');
  end if;
  select * into s from settings;
  -- One arrival at a time, so two people never get the same home or grow the same Block.
  perform pg_advisory_xact_lock(hashtext('quiltopia:join'));
  grew := grow_if_full();
  -- Arrival order: the first free plot in the first Neighborhood Block that has one.
  select bl.id, pl.n into b_id, plot
    from blocks bl cross join generate_series(0, s.plots_per_side * s.plots_per_side - 1) as pl(n)
    where bl.kind = 'neighborhood'
      and not exists (select 1 from players p where p.home_block = bl.id and p.home_plot = pl.n)
    order by bl.id, pl.n
    limit 1;
  insert into players (id, name, nation, home_block, home_plot, last_period)
    values (auth.uid(), p_name, p_nation, b_id, plot, current_period() - 1);
  -- The welcome kit: five patches with glowing spots in the new home showing where they go.
  insert into gifts (to_player, kit, kind)
    select auth.uid(), true, k.value ->> 'kind' from jsonb_array_elements(rules() -> 'kit') with ordinality k(value, n) order by k.n;
  -- Coming in through a friend's link makes you friends.
  if p_invited_by is not null and p_invited_by <> auth.uid() then
    select id into inviter from players where id = p_invited_by;
    if inviter is not null then
      update players set invited_by = inviter, friends = array[inviter] where id = auth.uid();
      update players set friends = friends || auth.uid() where id = inviter and not auth.uid() = any(friends);
    end if;
  end if;
  added := accrue(auth.uid());
  return ok_me(auth.uid(), null, jsonb_build_object('added', added, 'grew', grew));
end $$;

create or replace function public.place_patch(p_x int, p_y int, p_kind text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  s settings;
  r jsonb := rules();
  grp text := rules() -> 'groups' ->> p_kind;
  me players;
  z jsonb;
  zt text;
  owner_name text;
  cur bigint := current_period();
  w_id int;
  lv int;
  spent jsonb;
  new_patch patches;
  finished boolean;
  granted jsonb;
  extra jsonb := '{}'::jsonb;
begin
  select * into s from settings;
  if grp is null then return err('That patch doesn''t exist.'); end if;
  if auth.uid() is null then return err('Join the world to start building.'); end if;
  perform accrue(auth.uid());
  select * into me from players where id = auth.uid() for update;
  if not found then return err('Join the world to start building.'); end if;
  if me.banned then return err('Building is switched off for this account.'); end if;

  z := zone_at(p_x, p_y);
  zt := z ->> 'type';
  if zt = 'outside' then return err('That''s past the edge of the quilt.'); end if;
  if exists (select 1 from patches where x = p_x and y = p_y) then return err('Someone already patched this square.'); end if;
  if zt = 'plot' and (z ->> 'owner') is distinct from me.id::text then
    select name into owner_name from players where id = (z ->> 'owner')::uuid;
    return err(case when owner_name is null then 'That home plot is saved for a new neighbor.'
      else 'That''s ' || owner_name || '''s home. Only they can build there.' end);
  end if;
  if grp = 'decor' and zt <> 'plot' then return err('Decorations go in your home.'); end if;
  if zt = 'shared' and me.home_block is distinct from (z ->> 'block')::smallint then
    return err('Only people who live in ' || (z ->> 'blockName') || ' can build on its shared land.');
  end if;
  if zt = 'lot' then return err('This lot is saved for a new Wonder. Builders at Level ' || (r ->> 'foundLevel') || ' can found one here.'); end if;
  if zt = 'founding' then return err('The ' || (z ->> 'name') || ' is still gathering founders.'); end if;
  if zt = 'frame' then return err('This square frames the ' || (z ->> 'name') || '.'); end if;
  if zt in ('slot', 'commons') and s.commons_requires_signin and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    return err('Sign in to build in the Commons.');
  end if;
  if zt = 'slot' then
    w_id := (z ->> 'wonder')::int;
    if z ->> 'slotKind' <> p_kind then return err('This Wonder slot needs a ' || patch_name(z ->> 'slotKind') || '.'); end if;
    if (select count(*) from patches where owner = me.id and wonder_id = w_id and period_of(placed_at) = cur) >= s.wonder_per_period then
      return err('You''ve filled ' || s.wonder_per_period || ' slots in this Wonder ' || period_word() || '. Your next patches unlock more.');
    end if;
  end if;

  lv := level_of(me.xp);
  -- Spending and placing succeed or fail together.
  begin
    spent := spend_patch(me.id, p_kind);
    if spent is null then
      return err(case grp when 'basic' then 'You''re out of patches ' || period_word() || '.'
        when 'surprise' then 'You don''t have a ' || patch_name(p_kind) || ' right now. They come as surprises.'
        else 'You don''t have a ' || patch_name(p_kind) || '.' end);
    end if;
    insert into patches (x, y, kind, owner, wonder_id, beside, gift_from)
      values (p_x, p_y, p_kind, me.id, w_id, beside_neighbor(p_x, p_y, me.id), case when spent ->> 'used' = 'gift' then spent ->> 'from' end)
      returning * into new_patch;
  exception when unique_violation then
    return err('Someone just patched this square.');
  end;

  if w_id is not null then
    update wonders set filled = filled + 1 where id = w_id returning filled >= slots and completed_at is null into finished;
    if finished then perform complete_wonder(w_id); end if;
  end if;
  perform grant_xp(me.id, case when w_id is not null then (r -> 'xp' ->> 'wonderSlot')::int else (r -> 'xp' ->> 'patch')::int end);
  -- The welcome kit is done when its last patch is placed.
  if spent ->> 'from' = 'kit' and not me.kit_done
    and not exists (select 1 from gifts where to_player = me.id and kit and used_at is null) then
    update players set kit_done = true where id = me.id;
    perform grant_xp(me.id, (r ->> 'kitXp')::int);
    extra := extra || jsonb_build_object('kitDone', true);
  end if;
  -- A friend who came through an invite and fills their first Wonder slot rewards the inviter.
  if w_id is not null and me.invited_by is not null and not me.invite_rewarded then
    update players set invite_rewarded = true where id = me.id;
    perform grant_xp(me.invited_by, (r -> 'xp' ->> 'inviteFilled')::int);
  end if;
  granted := grant_wishes(me.id);
  if jsonb_array_length(granted) > 0 then extra := extra || jsonb_build_object('wishes', granted); end if;
  return ok_me(me.id, lv, extra || jsonb_build_object('patch', patch_json(new_patch)));
end $$;

-- Patches in your own home can be picked up and rearranged; everything else stays for the season.
create or replace function public.pick_up(p_patch bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  s settings;
  me players;
  p patches;
  grp text;
begin
  select * into s from settings;
  select * into me from players where id = auth.uid() for update;
  select * into p from patches where id = p_patch;
  if me.id is null or p.id is null or p.owner is distinct from me.id then
    return err('You can only pick up your own patches.');
  end if;
  if zone_at(p.x, p.y) ->> 'type' <> 'plot' then return err('Patches outside your home stay for the whole season.'); end if;
  grp := rules() -> 'groups' ->> p.kind;
  if grp in ('landmark', 'decor') then
    update players set keep = bump(keep, p.kind, 1) where id = me.id;
  elsif bag_total(me) >= s.bag_cap then
    return err('Your bag is full (' || s.bag_cap || '). Place a patch first.');
  else
    update players set items = bump(items, p.kind, 1) where id = me.id;
  end if;
  delete from patches where id = p.id;
  return ok_me(me.id, null, '{}'::jsonb);
end $$;

-- Watering a neighbor's garden earns XP, and a bonus pick up to help_bonus times a period.
create or replace function public.water_garden(p_patch bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  s settings;
  me players;
  g patches;
  cur bigint := current_period();
  bonus boolean := false;
  lv int;
begin
  select * into s from settings;
  select * into me from players where id = auth.uid() for update;
  if not found then return err('Join the world first.'); end if;
  select * into g from patches where id = p_patch;
  if g.id is null or g.kind <> 'garden' then return err('Only gardens can be watered.'); end if;
  if g.owner = me.id then return err('That''s your own garden. Water a neighbor''s to earn a bonus patch.'); end if;
  begin
    insert into waterings (garden_id, helper, period) values (g.id, me.id, cur);
  exception when unique_violation then
    return err('You''ve already watered this garden ' || period_word() || '.');
  end;
  lv := level_of(me.xp);
  if me.help_period <> cur then
    me.help_period := cur;
    me.helps := 0;
  end if;
  me.helps := me.helps + 1;
  if me.helps <= s.help_bonus and bag_total(me) < s.bag_cap then
    me.picks := me.picks + 1;
    bonus := true;
  end if;
  update players set picks = me.picks, helps = me.helps, help_period = me.help_period where id = me.id;
  perform grant_xp(me.id, (rules() -> 'xp' ->> 'water')::int);
  return ok_me(me.id, lv, jsonb_build_object('bonus', bonus));
end $$;

create or replace function public.report_patch(p_patch bigint, p_reason text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  p patches;
begin
  if not exists (select 1 from players where id = auth.uid()) then return err('Join the world first.'); end if;
  if p_reason not in ('symbol', 'other') then return err('Pick a reason from the list.'); end if;
  select * into p from patches where id = p_patch;
  if p.id is null then return err('That patch is gone already.'); end if;
  insert into reports (patch_id, x, y, kind, owner, reporter, reason)
    values (p.id, p.x, p.y, p.kind, p.owner, auth.uid(), p_reason);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.set_name(p_name text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not valid_name(p_name) then return err('Pick a name from the list.'); end if;
  update players set name = p_name where id = auth.uid();
  if not found then return err('Join the world first.'); end if;
  return ok_me(auth.uid(), null, '{}'::jsonb);
end $$;

create or replace function public.set_nation(p_nation text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if p_nation is not null and not exists (select 1 from nations where code = p_nation) then
    return err('Pick a nation from the list.');
  end if;
  update players set nation = p_nation where id = auth.uid();
  if not found then return err('Join the world first.'); end if;
  return ok_me(auth.uid(), null, '{}'::jsonb);
end $$;

-- This week's points per active builder: 1 per patch, 3 per Wonder slot.
create or replace function public.nation_board()
returns table (code text, name text, points bigint, members bigint, active bigint, score numeric)
language sql stable security definer set search_path = public as $$
  with week as (
    select pl.nation, p.owner, case when p.wonder_id is null then 1 else 3 end as pts
    from patches p join players pl on pl.id = p.owner
    where p.placed_at > now() - interval '7 days' and pl.nation is not null
  ), member_counts as (
    select pl.nation, count(*) as n from players pl where pl.nation is not null group by pl.nation
  )
  select n.code, n.name,
    coalesce(sum(w.pts), 0)::bigint,
    mc.n,
    count(distinct w.owner),
    case when count(distinct w.owner) > 0 then round(coalesce(sum(w.pts), 0)::numeric / count(distinct w.owner), 2) else 0 end
  from nations n
  join member_counts mc on mc.nation = n.code
  left join week w on w.nation = n.code
  group by n.code, n.name, mc.n
  order by 6 desc, 3 desc
$$;

-- ---------- Stitchlings and exploring ----------

create or replace function public.meet_stitchling(p_species text, p_x int, p_y int, p_night boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  r jsonb := rules();
  sp jsonb := rules() -> 'species' -> p_species;
  me players;
  lv int;
  extra jsonb;
  page jsonb;
  total int;
  found_n int;
  reward_keep text;
begin
  select * into me from players where id = auth.uid() for update;
  if not found then return err('Join the world first.'); end if;
  if sp is null then return err('That Stitchling wandered off.'); end if;
  if sp ->> 'page' = 'wonder' then
    if me.stitchbook -> p_species is not null then return ok_me(me.id, null, jsonb_build_object('isNew', false)); end if;
    return err('Only the builders of the ' || coalesce((select name from blueprints where id = sp ->> 'wonder'), 'Wonder') || ' get this one.');
  end if;
  if sp ->> 'page' = 'rare' and not rare_site_near(p_species, p_x, p_y, coalesce(p_night, false)) then
    return err('That Stitchling wandered off.');
  end if;
  insert into meets (player, species) values (me.id, p_species);
  if me.stitchbook -> p_species is not null then return ok_me(me.id, null, jsonb_build_object('isNew', false)); end if;
  lv := level_of(me.xp);
  update players set stitchbook = stitchbook || jsonb_build_object(p_species, ms(now())) where id = me.id
    returning stitchbook into me.stitchbook;
  perform grant_xp(me.id, (r -> 'xp' ->> 'meet')::int);
  extra := jsonb_build_object('isNew', true);
  -- A finished Stitchbook page pays out once.
  select count(*), count(*) filter (where me.stitchbook -> e.key is not null) into total, found_n
    from jsonb_each(r -> 'species') e where e.value ->> 'page' = sp ->> 'page';
  if found_n = total then
    select p into page from jsonb_array_elements(r -> 'pages') p where p ->> 'id' = sp ->> 'page';
    reward_keep := page -> 'reward' ->> 'keep';
    update players set buttons = buttons + (page -> 'reward' ->> 'buttons')::int, keep = bump(keep, reward_keep, 1) where id = me.id;
    extra := extra || jsonb_build_object('pageDone', sp ->> 'page');
  end if;
  return ok_me(me.id, lv, extra);
end $$;

create or replace function public.visit_block(p_block int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me players;
begin
  select * into me from players where id = auth.uid() for update;
  if not found or p_block::smallint = any(me.visited) or me.home_block = p_block
    or not exists (select 1 from blocks where id = p_block) then
    return jsonb_build_object('ok', true, 'isNew', false);
  end if;
  update players set visited = visited || p_block::smallint where id = me.id;
  insert into visits (player, block_id) values (me.id, p_block);
  return ok_me(me.id, null, jsonb_build_object('isNew', true));
end $$;

-- ---------- The calendar and daily goals ----------

-- Today's calendar reward. Missing a day pauses the calendar; it never resets.
create or replace function public.claim_day() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  r jsonb := rules();
  me players;
  d int := today();
  slot int;
  reward jsonb;
  got jsonb;
  pick text;
  fresh text[];
begin
  select * into me from players where id = auth.uid() for update;
  if not found then return err('Join the world first.'); end if;
  if me.calendar_last = d then return ok_me(me.id, null, jsonb_build_object('reward', null)); end if;
  slot := me.calendar_day;
  reward := r -> 'calendar' -> slot;
  got := jsonb_build_object('day', slot + 1);
  if reward ->> 'buttons' is not null then
    me.buttons := me.buttons + (reward ->> 'buttons')::int;
    got := got || jsonb_build_object('buttons', (reward ->> 'buttons')::int);
  end if;
  if coalesce((reward ->> 'decor')::boolean, false) or coalesce((reward ->> 'landmark')::boolean, false) then
    select g.key into pick from jsonb_each_text(r -> 'groups') g
      where g.value = case when coalesce((reward ->> 'decor')::boolean, false) then 'decor' else 'landmark' end
      order by random() limit 1;
    me.keep := bump(me.keep, pick, 1);
    got := got || jsonb_build_object('keep', pick);
  end if;
  if coalesce((reward ->> 'outfit')::boolean, false) then
    fresh := array(select o from jsonb_array_elements_text(r -> 'outfits') o where not o = any(me.outfits));
    if cardinality(fresh) > 0 then
      pick := fresh[1 + floor(random() * cardinality(fresh))::int];
      me.outfits := me.outfits || pick;
      got := got || jsonb_build_object('outfit', pick);
    else
      me.buttons := me.buttons + 60;
      got := got || jsonb_build_object('buttons', 60);
    end if;
  end if;
  update players set buttons = me.buttons, keep = me.keep, outfits = me.outfits,
    calendar_day = (slot + 1) % jsonb_array_length(r -> 'calendar'), calendar_last = d
    where id = me.id;
  return ok_me(me.id, null, jsonb_build_object('reward', got));
end $$;

create or replace function public.get_goals() returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from players where id = auth.uid()) then return null; end if;
  return goal_state(auth.uid());
end $$;

-- Pays out goals finished since last time, plus a bonus when all three are done.
create or replace function public.claim_goals() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  r jsonb := rules();
  me players;
  d int := today();
  lv int;
  state jsonb;
  newly text[] := '{}';
  bonus boolean := false;
begin
  select * into me from players where id = auth.uid() for update;
  if not found then return err('Join the world first.'); end if;
  if me.goals_day <> d then
    update players set goals_day = d, goals_done = '{}', goals_bonus = false where id = me.id;
    me.goals_done := '{}';
    me.goals_bonus := false;
  end if;
  lv := level_of(me.xp);
  state := goal_state(me.id);
  newly := array(select e ->> 'id' from jsonb_array_elements(state -> 'list') e
    where (e ->> 'done')::boolean and not (e ->> 'claimed')::boolean);
  if cardinality(newly) > 0 then
    me.goals_done := me.goals_done || newly;
    update players set goals_done = me.goals_done,
      buttons = buttons + (r ->> 'goalButtons')::int * cardinality(newly) where id = me.id;
    perform grant_xp(me.id, (r -> 'xp' ->> 'goal')::int * cardinality(newly));
  end if;
  if not me.goals_bonus and cardinality(me.goals_done) >= 3 then
    update players set goals_bonus = true, buttons = buttons + (r ->> 'goalsBonus')::int where id = me.id;
    bonus := true;
  end if;
  return ok_me(me.id, lv, jsonb_build_object('newly', to_jsonb(newly), 'bonus', bonus, 'goals', goal_state(me.id)));
end $$;

-- ---------- Kindness: stickers, gifts, friends ----------

create or replace function public.send_sticker(p_target text, p_kind text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me players;
  target_type text := split_part(p_target, ':', 1);
  target_id text := split_part(p_target, ':', 2);
  lv int;
begin
  select * into me from players where id = auth.uid() for update;
  if not found then return err('Join the world first.'); end if;
  if not exists (select 1 from jsonb_array_elements_text(rules() -> 'stickers') k where k = p_kind) then return err('Pick a sticker.'); end if;
  if target_type = 'home' then
    if target_id = me.id::text then return err('Stickers are for other people''s homes.'); end if;
    if not exists (select 1 from players where id::text = target_id) then return err('That home is empty.'); end if;
  elsif target_type <> 'wonder' or not exists (select 1 from wonders where id::text = target_id) then
    return err('Stickers go on homes and Wonders.');
  end if;
  lv := level_of(me.xp);
  begin
    insert into stickers (from_player, target, kind, day) values (me.id, p_target, p_kind, today());
  exception when unique_violation then
    return err('You already left a sticker here today.');
  end;
  perform grant_xp(me.id, (rules() -> 'xp' ->> 'sticker')::int);
  return ok_me(me.id, lv, '{}'::jsonb);
end $$;

-- One gift a day, to a friend or a neighbor, from your own daily patches.
create or replace function public.send_gift(p_to uuid, p_kind text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me players;
  friend players;
  grp text := rules() -> 'groups' ->> p_kind;
  lv int;
begin
  select * into me from players where id = auth.uid() for update;
  select * into friend from players where id = p_to;
  if me.id is null or friend.id is null or friend.id = me.id then return err('Pick a friend or neighbor to send it to.'); end if;
  if not friend.id = any(me.friends) and me.home_block is distinct from friend.home_block then
    return err('You can gift patches to friends and neighbors.');
  end if;
  if grp is null or grp in ('landmark', 'decor') then return err('Pick a patch from your bag.'); end if;
  if me.gift_day = today() then return err('You can send one gift a day. Try again tomorrow.'); end if;
  if coalesce((me.items ->> p_kind)::int, 0) > 0 then
    update players set items = bump(items, p_kind, -1) where id = me.id;
  elsif grp = 'basic' and me.picks > 0 then
    update players set picks = picks - 1 where id = me.id;
  else
    return err('You don''t have a ' || patch_name(p_kind) || ' to give.');
  end if;
  lv := level_of(me.xp);
  insert into gifts (to_player, from_player, kind) values (friend.id, me.id, p_kind);
  update players set gift_day = today() where id = me.id;
  perform grant_xp(me.id, (rules() -> 'xp' ->> 'gift')::int);
  return ok_me(me.id, lv, '{}'::jsonb);
end $$;

create or replace function public.add_friend(p_friend uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if p_friend = auth.uid() or not exists (select 1 from players where id = p_friend) then return err('That builder is gone.'); end if;
  update players set friends = friends || p_friend where id = auth.uid() and not p_friend = any(friends);
  if not exists (select 1 from players where id = auth.uid()) then return err('Join the world first.'); end if;
  return ok_me(auth.uid(), null, '{}'::jsonb);
end $$;

create or replace function public.remove_friend(p_friend uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  update players set friends = array_remove(friends, p_friend) where id = auth.uid();
  if not found then return err('Join the world first.'); end if;
  return ok_me(auth.uid(), null, '{}'::jsonb);
end $$;

-- ---------- The Button Shop ----------

-- Whether a player may use a quilt fabric: everyday ones always, others once reached or bought
-- (mirrors canUseFabric in js/rules.js).
create or replace function public.can_use_fabric(p public.players, p_fabric text) returns boolean
language sql stable set search_path = public as $$
  select case
    when rules() -> 'fabrics' -> p_fabric is null then false
    when rules() -> 'fabrics' -> p_fabric ->> 'level' is not null then level_of(p.xp) >= (rules() -> 'fabrics' -> p_fabric ->> 'level')::int
    when coalesce((rules() -> 'fabrics' -> p_fabric ->> 'shop')::boolean, false) then p_fabric = any(p.fabrics)
    else true end
$$;

-- ---------- The Quiltopia Club (looks only: a fabric a month, a badge, the season credits) ----------

-- A member gets each month's Club fabric to keep (mirrors grantClubFabric in js/local-server.js).
-- Returns the fabric if it was just given.
create or replace function public.grant_club_fabric(p_player uuid) returns text
language plpgsql security definer set search_path = public as $$
declare
  me players;
  seq jsonb := rules() -> 'clubFabrics';
  this_month text;
begin
  select * into me from players where id = p_player for update;
  if not found or me.club_until is null or me.club_until <= now() or jsonb_array_length(coalesce(seq, '[]'::jsonb)) = 0 then return null; end if;
  this_month := seq ->> ((extract(year from now() at time zone 'utc')::int * 12 + extract(month from now() at time zone 'utc')::int - 1) % jsonb_array_length(seq));
  if this_month = any(me.fabrics) then return null; end if;
  update players set fabrics = fabrics || this_month where id = p_player;
  return this_month;
end $$;

-- Stripe confirmed a payment: a member until p_until. Only the club-webhook function (with the
-- service role key) can call this; the game can't.
create or replace function public.club_paid(p_player uuid, p_until timestamptz) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  update players set club_until = greatest(coalesce(club_until, now()), p_until) where id = p_player;
  if not found then return err('No such player.'); end if;
  perform grant_club_fabric(p_player);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.buy_item(p_item text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  r jsonb := rules();
  me players;
  item jsonb;
  price int;
begin
  select * into me from players where id = auth.uid() for update;
  select e into item from jsonb_array_elements(r -> 'shop') e where e ->> 'id' = p_item;
  if me.id is null or item is null then return err('That item is sold out.'); end if;
  if level_of(me.xp) < (r ->> 'shopLevel')::int then return err('The Button Shop opens at Level ' || (r ->> 'shopLevel') || '.'); end if;
  if item ->> 'type' = 'outfit' and p_item = any(me.outfits) then return err('You already have that outfit.'); end if;
  if item ->> 'type' = 'fabric' and p_item = any(me.fabrics) then return err('You already have that fabric.'); end if;
  price := (item ->> 'price')::int;
  if me.buttons < price then return err('You need ' || (price - me.buttons) || ' more Buttons.'); end if;
  update players set buttons = buttons - price,
    keep = case when item ->> 'type' = 'decor' then bump(keep, p_item, 1) else keep end,
    outfits = case when item ->> 'type' = 'outfit' then outfits || p_item else outfits end,
    fabrics = case when item ->> 'type' = 'fabric' then fabrics || p_item else fabrics end
    where id = me.id;
  return ok_me(me.id, null, '{}'::jsonb);
end $$;

-- p_change: any of { "style": "gingham" }, { "outfit": "scarf" } ({ "outfit": null } takes it off)
-- and { "fabric": "rosebud" } ({ "fabric": null } goes back to the one picked for you).
create or replace function public.equip(p_change jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me players;
  new_outfit text := nullif(p_change ->> 'outfit', '');
  new_fabric text := nullif(p_change ->> 'fabric', '');
begin
  select * into me from players where id = auth.uid() for update;
  if not found then return err('Join the world first.'); end if;
  if p_change -> 'style' is not null then
    if not (p_change ->> 'style') = any(me.styles) then return err('That roof style is still locked.'); end if;
    update players set style = p_change ->> 'style' where id = me.id;
  end if;
  if p_change -> 'outfit' is not null then
    if new_outfit is not null and not new_outfit = any(me.outfits) then return err('Get that outfit first.'); end if;
    update players set outfit = new_outfit where id = me.id;
  end if;
  if p_change -> 'fabric' is not null then
    if new_fabric is not null and not can_use_fabric(me, new_fabric) then return err('That fabric is still locked.'); end if;
    update players set fabric = new_fabric where id = me.id;
  end if;
  return ok_me(me.id, null, '{}'::jsonb);
end $$;

-- ---------- Founding Wonders ----------

create or replace function public.found_wonder(p_blueprint text, p_block int, p_lot int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  s settings;
  r jsonb := rules();
  me players;
  bp blueprints;
  b blocks;
  lot_size int := (rules() ->> 'lot')::int;
  slot_count int;
  w wonders;
begin
  select * into s from settings;
  select * into me from players where id = auth.uid();
  if not found then return err('Join the world first.'); end if;
  if level_of(me.xp) < (r ->> 'foundLevel')::int then return err('Founding a Wonder opens at Level ' || (r ->> 'foundLevel') || '.'); end if;
  select * into bp from blueprints where id = p_blueprint;
  if not found then return err('Pick a blueprint from the list.'); end if;
  select * into b from blocks where id = p_block;
  if not found or b.kind <> 'commons' or p_lot < 0 or p_lot >= jsonb_array_length(r -> 'lots') then
    return err('Wonders go on Commons lots.');
  end if;
  perform pg_advisory_xact_lock(hashtext('quiltopia:found'));
  if exists (select 1 from wonders where block_id = p_block and lot = p_lot) then return err('That lot already has a Wonder.'); end if;
  if exists (select 1 from wonders where status = 'founding' and founded_by = me.id) then
    return err('You''re already gathering founders for a Wonder.');
  end if;
  select count(*) into slot_count from unnest(bp.rows) as rw(line), regexp_split_to_table(rw.line, '') as ch(c)
    where r -> 'slotKinds' ->> ch.c is not null;
  insert into wonders (id, blueprint, x, y, slots, filled, block_id, lot, status, founders, founded_by, founded_at)
    values (nextval('wonder_ids'), p_blueprint,
      b.gx * s.block_size + (r -> 'lots' -> p_lot ->> 0)::int + (lot_size - length(bp.rows[1])) / 2,
      b.gy * s.block_size + (r -> 'lots' -> p_lot ->> 1)::int + (lot_size - array_length(bp.rows, 1)) / 2,
      slot_count, 0, p_block, p_lot, 'founding', array[me.id], me.id, now())
    returning * into w;
  return ok_me(me.id, null, jsonb_build_object('wonder', wonder_json(w)));
end $$;

-- Signing as a founder; at ten, the Wonder opens for building and every founder gets XP.
create or replace function public.sign_founder(p_wonder int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  r jsonb := rules();
  me players;
  w wonders;
  lv int;
  f uuid;
begin
  select * into me from players where id = auth.uid();
  select * into w from wonders where id = p_wonder for update;
  if me.id is null or w.id is null or w.status <> 'founding' then return err('That Wonder is already underway.'); end if;
  if me.id = any(w.founders) then return err('You''ve already signed.'); end if;
  lv := level_of(me.xp);
  update wonders set founders = founders || me.id where id = w.id returning * into w;
  if cardinality(w.founders) >= (r ->> 'foundersNeeded')::int then
    update wonders set status = 'open', opened_at = now() where id = w.id returning * into w;
    foreach f in array w.founders loop
      perform grant_xp(f, (r -> 'xp' ->> 'founded')::int);
    end loop;
  end if;
  return ok_me(me.id, lv, jsonb_build_object('wonder', wonder_json(w)));
end $$;

create or replace function public.track(p_name text, p_props jsonb) returns void
language sql security definer set search_path = public as $$
  insert into events (player, name, props)
  select auth.uid(), left(p_name, 40), coalesce(p_props, '{}'::jsonb)
  where auth.uid() is not null
$$;

-- =========================================================================
-- Moderation (only for accounts listed in admins)
-- =========================================================================

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where id = auth.uid())
$$;

create or replace function public.list_reports()
returns table (id bigint, patch_id bigint, x int, y int, kind text, owner uuid, owner_name text, reporter_name text, reason text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select r.id, r.patch_id, r.x, r.y, r.kind, r.owner, o.name, rp.name, r.reason, r.created_at
  from reports r
  left join players o on o.id = r.owner
  left join players rp on rp.id = r.reporter
  where not r.resolved and is_admin()
  order by r.created_at desc
  limit 200
$$;

create or replace function public.resolve_report(p_report bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then return err('Moderators only.'); end if;
  update reports set resolved = true where id = p_report;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.remove_patch(p_patch bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  n int;
begin
  if not is_admin() then return err('Moderators only.'); end if;
  delete from patches where id = p_patch;
  get diagnostics n = row_count;
  perform recount_wonders();
  update reports set resolved = true where patch_id = p_patch;
  return jsonb_build_object('ok', true, 'removed', n);
end $$;

-- Removes every player-made patch within p_radius squares placed in the last p_hours.
create or replace function public.rollback_area(p_x int, p_y int, p_radius int, p_hours int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  n int;
begin
  if not is_admin() then return err('Moderators only.'); end if;
  delete from patches
    where owner is not null and placed_at > now() - make_interval(hours => p_hours)
      and abs(x - p_x) <= p_radius and abs(y - p_y) <= p_radius;
  get diagnostics n = row_count;
  perform recount_wonders();
  update reports set resolved = true where abs(x - p_x) <= p_radius and abs(y - p_y) <= p_radius;
  return jsonb_build_object('ok', true, 'removed', n);
end $$;

create or replace function public.ban_player(p_player uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then return err('Moderators only.'); end if;
  update players set banned = true where id = p_player;
  return jsonb_build_object('ok', true);
end $$;

-- =========================================================================
-- Who can see and do what
-- =========================================================================

-- The world is public to read. There are no insert, update or delete policies:
-- every change goes through the functions above, which check the rules.
do $$
declare t text;
begin
  foreach t in array array['settings', 'blocks', 'blueprints', 'wonders', 'nations', 'name_words', 'players', 'patches', 'waterings', 'stickers'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "Anyone can read" on public.%I', t);
    execute format('create policy "Anyone can read" on public.%I for select using (true)', t);
  end loop;
end $$;

-- Nothing is written straight from the browser, policies or not.
revoke insert, update, delete, truncate on all tables in schema public from anon, authenticated;

-- Everyone can see names, nations, homes, levels and looks; only you (through get_me) see your bag.
revoke select on public.players from anon, authenticated;
grant select (id, name, nation, home_block, home_plot, created_at, xp, style, outfit, fabric, club_until) on public.players to anon, authenticated;

-- Gifts are seen only by who sent and who got them.
alter table public.gifts enable row level security;
drop policy if exists "Your gifts" on public.gifts;
create policy "Your gifts" on public.gifts for select using (to_player = auth.uid() or from_player = auth.uid());

-- Plans, meetings, visits, reports, analytics and the moderator list are never readable from the browser.
do $$
declare t text;
begin
  foreach t in array array['block_plans', 'meets', 'visits', 'reports', 'events', 'admins', 'club_subscriptions'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- Only the player actions can be called from the game; the helpers they use can't.
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = any(array[
      'err', 'rules', 'ms', 'current_period', 'period_of', 'today', 'period_word', 'patch_name', 'bag_total', 'bump',
      'plot_index', 'valid_name', 'level_of', 'grant_xp', 'me_json', 'ok_me', 'patch_json', 'wonder_json', 'accrue',
      'zone_at', 'beside_neighbor', 'spend_patch', 'complete_wonder', 'propose_next_wonder', 'recount_wonders', 'grow_if_full', 'kinds_near',
      'kind_at', 'is_bridge', 'market_reach', 'group_size', 'field_with_park', 'trees_in_home', 'hash2',
      'rare_site_near', 'goal_state', 'home_cells', 'home_needs', 'grant_wishes', 'can_use_fabric', 'grant_club_fabric', 'club_paid'])
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', f.sig);
  end loop;
end $$;

-- Club payments arrive through the service role (supabase/functions/club-webhook), never the game.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.club_paid(uuid, timestamptz) to service_role;
    grant select, insert, update on public.club_subscriptions to service_role;
  end if;
end $$;

-- =========================================================================
-- Live updates: what everyone viewing should see change
-- =========================================================================

alter table public.patches replica identity full;
do $$
declare t text;
begin
  foreach t in array array['patches', 'wonders', 'waterings', 'stickers', 'gifts', 'blocks'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

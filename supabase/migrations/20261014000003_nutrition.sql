-- FORMA – Phase 2: nutrition. All rows are private per user (RLS).

alter table public.profiles
  add column kcal_target int check (kcal_target is null or kcal_target between 0 and 20000),
  add column protein_target int check (protein_target is null or protein_target between 0 and 1000),
  add column carbs_target int check (carbs_target is null or carbs_target between 0 and 2000),
  add column fat_target int check (fat_target is null or fat_target between 0 and 1000);

create table public.foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 160),
  brand text not null default '',
  -- Nutrition per 100 g, as entered by the user or copied from the cited source
  kcal numeric(7, 2) not null check (kcal between 0 and 1000),
  protein numeric(6, 2) not null default 0 check (protein between 0 and 100),
  carbs numeric(6, 2) not null default 0 check (carbs between 0 and 100),
  fat numeric(6, 2) not null default 0 check (fat between 0 and 100),
  fiber numeric(6, 2) check (fiber is null or fiber between 0 and 100),
  portion_g numeric(7, 1) check (portion_g is null or portion_g > 0),
  portion_name text not null default '',
  source text not null default 'manual' check (source in ('manual', 'openfoodfacts', 'livsmedelsverket')),
  source_id text,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index foods_user_idx on public.foods (user_id);
create unique index foods_user_source_uniq on public.foods (user_id, source, source_id) where source_id is not null;

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 160),
  servings numeric(5, 1) not null default 1 check (servings > 0),
  -- Weight after cooking; when null the sum of the raw ingredients is used
  cooked_weight_g numeric(8, 1) check (cooked_weight_g is null or cooked_weight_g > 0),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.recipe_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  food_id uuid not null references public.foods (id) on delete restrict,
  grams numeric(8, 1) not null check (grams > 0),
  position int not null default 0
);
create index recipe_items_recipe_idx on public.recipe_items (recipe_id);

create table public.saved_meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 160),
  created_at timestamptz not null default now()
);

create table public.saved_meal_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  meal_id uuid not null references public.saved_meals (id) on delete cascade,
  food_id uuid references public.foods (id) on delete cascade,
  recipe_id uuid references public.recipes (id) on delete cascade,
  grams numeric(8, 1) not null check (grams > 0),
  position int not null default 0,
  check ((food_id is null) <> (recipe_id is null))
);
create index saved_meal_items_meal_idx on public.saved_meal_items (meal_id);

-- A logged portion. Nutrition values are snapshotted so later edits to a food never rewrite history.
create table public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  logged_on date not null,
  meal text not null check (meal in ('breakfast', 'lunch', 'dinner', 'snack')),
  food_id uuid references public.foods (id) on delete set null,
  recipe_id uuid references public.recipes (id) on delete set null,
  name text not null,
  grams numeric(8, 1) not null check (grams > 0 and grams <= 10000),
  kcal numeric(8, 1) not null check (kcal >= 0),
  protein numeric(7, 1) not null default 0 check (protein >= 0),
  carbs numeric(7, 1) not null default 0 check (carbs >= 0),
  fat numeric(7, 1) not null default 0 check (fat >= 0),
  created_at timestamptz not null default now()
);
create index food_logs_user_day_idx on public.food_logs (user_id, logged_on);

alter table public.foods enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_items enable row level security;
alter table public.saved_meals enable row level security;
alter table public.saved_meal_items enable row level security;
alter table public.food_logs enable row level security;

create policy "foods: all own" on public.foods
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "recipes: all own" on public.recipes
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "saved_meals: all own" on public.saved_meals
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "recipe_items: read own" on public.recipe_items
  for select to authenticated using (user_id = (select auth.uid()));
create policy "recipe_items: write own" on public.recipe_items
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = (select auth.uid()))
    and exists (select 1 from public.foods f where f.id = food_id and f.user_id = (select auth.uid()))
  );
create policy "recipe_items: update own" on public.recipe_items
  for update to authenticated using (user_id = (select auth.uid())) with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = (select auth.uid()))
    and exists (select 1 from public.foods f where f.id = food_id and f.user_id = (select auth.uid()))
  );
create policy "recipe_items: delete own" on public.recipe_items
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "saved_meal_items: read own" on public.saved_meal_items
  for select to authenticated using (user_id = (select auth.uid()));
create policy "saved_meal_items: write own" on public.saved_meal_items
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.saved_meals m where m.id = meal_id and m.user_id = (select auth.uid()))
    and (food_id is null or exists (select 1 from public.foods f where f.id = food_id and f.user_id = (select auth.uid())))
    and (recipe_id is null or exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = (select auth.uid())))
  );
create policy "saved_meal_items: delete own" on public.saved_meal_items
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "food_logs: read own" on public.food_logs
  for select to authenticated using (user_id = (select auth.uid()));
create policy "food_logs: insert own" on public.food_logs
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and (food_id is null or exists (select 1 from public.foods f where f.id = food_id and f.user_id = (select auth.uid())))
    and (recipe_id is null or exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = (select auth.uid())))
  );
create policy "food_logs: update own" on public.food_logs
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "food_logs: delete own" on public.food_logs
  for delete to authenticated using (user_id = (select auth.uid()));

create trigger foods_touch before update on public.foods for each row execute function public.touch_updated_at();
create trigger recipes_touch before update on public.recipes for each row execute function public.touch_updated_at();

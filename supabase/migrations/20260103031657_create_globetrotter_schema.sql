-- =========================================================
-- GlobeTrotter Travel Planning Platform - Final Schema
-- =========================================================

-- Enable required extension
create extension if not exists "pgcrypto";

-- =========================================================
-- 1. profiles
-- =========================================================
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  avatar_url text,
  language_preference text default 'en',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Profiles: select own"
on profiles for select
to authenticated
using (auth.uid() = id);

create policy "Profiles: insert own"
on profiles for insert
to authenticated
with check (auth.uid() = id);

create policy "Profiles: update own"
on profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- =========================================================
-- 2. cities (public reference data)
-- =========================================================
create table if not exists cities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text not null,
  region text,
  latitude decimal(9,6),
  longitude decimal(9,6),
  cost_index integer default 3 check (cost_index between 1 and 5),
  popularity_score integer default 50 check (popularity_score between 0 and 100),
  description text,
  image_url text,
  created_at timestamptz default now()
);

alter table cities enable row level security;

create policy "Cities: readable"
on cities for select
to authenticated
using (true);

-- =========================================================
-- 3. activities (public reference data)
-- =========================================================
create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  city_id uuid references cities(id) on delete cascade,
  name text not null,
  description text,
  category text not null,
  estimated_cost decimal(10,2) default 0,
  estimated_duration_hours decimal(4,1) default 1,
  image_url text,
  created_at timestamptz default now()
);

alter table activities enable row level security;

create policy "Activities: readable"
on activities for select
to authenticated
using (true);

-- =========================================================
-- 4. trips
-- =========================================================
create table if not exists trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  description text,
  start_date date,
  end_date date,
  cover_photo_url text,
  is_public boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table trips enable row level security;

create policy "Trips: view own or public"
on trips for select
to authenticated
using (user_id = auth.uid() or is_public = true);

create policy "Trips: insert own"
on trips for insert
to authenticated
with check (user_id = auth.uid());

create policy "Trips: update own"
on trips for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Trips: delete own"
on trips for delete
to authenticated
using (user_id = auth.uid());

-- =========================================================
-- 5. trip_stops
-- =========================================================
create table if not exists trip_stops (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  city_id uuid not null references cities(id) on delete restrict,
  arrival_date date,
  departure_date date,
  order_index integer default 0,
  notes text,
  created_at timestamptz default now()
);

alter table trip_stops enable row level security;

create policy "TripStops: view allowed"
on trip_stops for select
to authenticated
using (
  exists (
    select 1 from trips
    where trips.id = trip_stops.trip_id
      and (trips.user_id = auth.uid() or trips.is_public = true)
  )
);

create policy "TripStops: insert own"
on trip_stops for insert
to authenticated
with check (
  exists (
    select 1 from trips
    where trips.id = trip_stops.trip_id
      and trips.user_id = auth.uid()
  )
);

create policy "TripStops: update own"
on trip_stops for update
to authenticated
using (
  exists (
    select 1 from trips
    where trips.id = trip_stops.trip_id
      and trips.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from trips
    where trips.id = trip_stops.trip_id
      and trips.user_id = auth.uid()
  )
);

create policy "TripStops: delete own"
on trip_stops for delete
to authenticated
using (
  exists (
    select 1 from trips
    where trips.id = trip_stops.trip_id
      and trips.user_id = auth.uid()
  )
);

-- =========================================================
-- 6. stop_activities
-- =========================================================
create table if not exists stop_activities (
  id uuid primary key default gen_random_uuid(),
  stop_id uuid not null references trip_stops(id) on delete cascade,
  activity_id uuid not null references activities(id) on delete restrict,
  scheduled_date date,
  scheduled_time time,
  actual_cost decimal(10,2),
  notes text,
  is_completed boolean default false,
  created_at timestamptz default now()
);

alter table stop_activities enable row level security;

create policy "StopActivities: view allowed"
on stop_activities for select
to authenticated
using (
  exists (
    select 1
    from trip_stops
    join trips on trips.id = trip_stops.trip_id
    where trip_stops.id = stop_activities.stop_id
      and (trips.user_id = auth.uid() or trips.is_public = true)
  )
);

create policy "StopActivities: insert own"
on stop_activities for insert
to authenticated
with check (
  exists (
    select 1
    from trip_stops
    join trips on trips.id = trip_stops.trip_id
    where trip_stops.id = stop_activities.stop_id
      and trips.user_id = auth.uid()
  )
);

create policy "StopActivities: update own"
on stop_activities for update
to authenticated
using (
  exists (
    select 1
    from trip_stops
    join trips on trips.id = trip_stops.trip_id
    where trip_stops.id = stop_activities.stop_id
      and trips.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from trip_stops
    join trips on trips.id = trip_stops.trip_id
    where trip_stops.id = stop_activities.stop_id
      and trips.user_id = auth.uid()
  )
);

create policy "StopActivities: delete own"
on stop_activities for delete
to authenticated
using (
  exists (
    select 1
    from trip_stops
    join trips on trips.id = trip_stops.trip_id
    where trip_stops.id = stop_activities.stop_id
      and trips.user_id = auth.uid()
  )
);

-- =========================================================
-- 7. trip_expenses
-- =========================================================
create table if not exists trip_expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  stop_id uuid references trip_stops(id) on delete set null,
  category text not null,
  description text,
  amount decimal(10,2) not null,
  expense_date date,
  created_at timestamptz default now()
);

alter table trip_expenses enable row level security;

create policy "TripExpenses: view allowed"
on trip_expenses for select
to authenticated
using (
  exists (
    select 1 from trips
    where trips.id = trip_expenses.trip_id
      and (trips.user_id = auth.uid() or trips.is_public = true)
  )
);

create policy "TripExpenses: insert own"
on trip_expenses for insert
to authenticated
with check (
  exists (
    select 1 from trips
    where trips.id = trip_expenses.trip_id
      and trips.user_id = auth.uid()
  )
);

create policy "TripExpenses: update own"
on trip_expenses for update
to authenticated
using (
  exists (
    select 1 from trips
    where trips.id = trip_expenses.trip_id
      and trips.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from trips
    where trips.id = trip_expenses.trip_id
      and trips.user_id = auth.uid()
  )
);

create policy "TripExpenses: delete own"
on trip_expenses for delete
to authenticated
using (
  exists (
    select 1 from trips
    where trips.id = trip_expenses.trip_id
      and trips.user_id = auth.uid()
  )
);

-- =========================================================
-- Indexes
-- =========================================================
create index if not exists idx_cities_country on cities(country);
create index if not exists idx_cities_region on cities(region);
create index if not exists idx_activities_city on activities(city_id);
create index if not exists idx_activities_category on activities(category);
create index if not exists idx_trips_user on trips(user_id);
create index if not exists idx_trips_public on trips(is_public);
create index if not exists idx_trip_stops_trip on trip_stops(trip_id);
create index if not exists idx_trip_stops_city on trip_stops(city_id);
create index if not exists idx_stop_activities_stop on stop_activities(stop_id);
create index if not exists idx_trip_expenses_trip on trip_expenses(trip_id);

-- ============================================
-- HASSLE FREE - Supabase Database Schema
-- Run this entire file in Supabase SQL Editor
-- ============================================

-- Profiles (one per user, extends auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text not null,
  role text not null check (role in ('customer', 'provider', 'admin')),
  phone text,
  avatar_url text,
  city text,
  bio text,
  is_verified boolean default false,
  created_at timestamptz default now()
);

-- Tasks
create table public.tasks (
  id uuid default gen_random_uuid() primary key,
  customer_id uuid references public.profiles(id) on delete cascade not null,
  provider_id uuid references public.profiles(id) on delete set null,
  title text not null,
  description text not null,
  category text not null check (category in ('cleaning','moving','repairs','errands','gardening','painting','plumbing','electrical','other')),
  status text not null default 'open' check (status in ('open','assigned','in_progress','completed','cancelled')),
  budget integer not null,
  location text not null,
  scheduled_date date,
  created_at timestamptz default now()
);

-- Reviews
create table public.reviews (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references public.tasks(id) on delete cascade not null,
  reviewer_id uuid references public.profiles(id) on delete cascade not null,
  reviewee_id uuid references public.profiles(id) on delete cascade not null,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamptz default now(),
  unique(task_id, reviewer_id)
);

-- ============================================
-- ROW LEVEL SECURITY (keeps data safe)
-- ============================================

alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.reviews enable row level security;

-- Profiles: anyone can read, only owner can update
create policy "Profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can insert their own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update their own profile" on public.profiles for update using (auth.uid() = id);

-- Tasks: anyone logged in can read, customers create, providers update to accept
create policy "Tasks are viewable by everyone" on public.tasks for select using (true);
create policy "Customers can create tasks" on public.tasks for insert with check (auth.uid() = customer_id);
create policy "Task parties can update" on public.tasks for update using (
  auth.uid() = customer_id or auth.uid() = provider_id
);

-- Reviews: anyone can read, only reviewer can write
create policy "Reviews are viewable by everyone" on public.reviews for select using (true);
create policy "Authenticated users can write reviews" on public.reviews for insert with check (auth.uid() = reviewer_id);

-- ============================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', 'User'),
    coalesce(new.raw_user_meta_data->>'role', 'customer')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Agent Market Database Schema

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Agent profiles table
create table if not exists agent_profiles (
  id uuid primary key default uuid_generate_v4(),
  agent_id text unique not null,
  name text not null,
  verified boolean default false,
  reputation_score decimal default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Listings table
create table if not exists listings (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  price decimal not null,
  condition_rating decimal default 1.0 check (condition_rating >= 0 and condition_rating <= 1),
  distance_km decimal not null,
  distance_origin text,
  image_urls jsonb default '[]',
  main_category text,
  subcategory text,
  specifications jsonb default '{}',
  negotiation_logic text default 'standard' check (negotiation_logic in ('standard', 'aggressive', 'strict')),
  seller_id uuid references agent_profiles(id),
  status text default 'active' check (status in ('active', 'sold', 'pending', 'hidden')),
  published_at timestamp with time zone default now(),
  hidden_reason text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Negotiation messages table
create table if not exists negotiation_messages (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid references listings(id) on delete cascade,
  buyer_id uuid references agent_profiles(id),
  seller_id uuid references agent_profiles(id),
  actor text not null check (actor in ('buyer', 'seller')),
  message text not null,
  timestamp timestamp with time zone default now()
);

-- Enable RLS (Row Level Security)
alter table agent_profiles enable row level security;
alter table listings enable row level security;
alter table negotiation_messages enable row level security;

-- Policies for public read access (for marketplace browsing)
create policy "Public listings are viewable by everyone"
  on listings for select
  using (status = 'active');

create policy "Agent profiles are viewable by everyone"
  on agent_profiles for select
  using (true);

-- Policies for authenticated writes
create policy "Users can insert their own listings"
  on listings for insert
  with check (true);

create policy "Users can update their own listings"
  on listings for update
  using (true);

create policy "Anyone can insert negotiation messages"
  on negotiation_messages for insert
  with check (true);

-- Create indexes for better query performance
create index if not exists listings_status_idx on listings(status);
create index if not exists listings_distance_idx on listings(distance_km);
create index if not exists listings_price_idx on listings(price);
create index if not exists listings_published_idx on listings(published_at);
create index if not exists negotiation_messages_listing_idx on negotiation_messages(listing_id);

-- Function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers for updated_at
create trigger update_agent_profiles_updated_at
  before update on agent_profiles
  for each row execute function update_updated_at_column();

create trigger update_listings_updated_at
  before update on listings
  for each row execute function update_updated_at_column();

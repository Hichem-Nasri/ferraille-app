alter table users add column address varchar(200);
alter table users add column opening_hours varchar(120);
alter table users add column bio varchar(500);

alter table listings add column featured boolean not null default false;

create table part_requests (
    id              bigserial primary key,
    user_id         bigint        not null references users (id),
    make            varchar(60)   not null,
    model           varchar(60)   not null,
    year            integer,
    category        varchar(30),
    description     varchar(500)  not null,
    city            varchar(80),
    status          varchar(20)   not null default 'OPEN',
    created_at      timestamptz   not null default now()
);
create index idx_part_requests_status on part_requests (status, created_at desc);
create index idx_part_requests_make_model on part_requests (lower(make), lower(model));

create table reviews (
    id              bigserial primary key,
    seller_id       bigint        not null references users (id),
    author_id       bigint        not null references users (id),
    rating          integer       not null check (rating between 1 and 5),
    comment         varchar(500),
    created_at      timestamptz   not null default now(),
    unique (seller_id, author_id)
);
create index idx_reviews_seller on reviews (seller_id);

create table saved_searches (
    id              bigserial primary key,
    user_id         bigint        not null references users (id),
    label           varchar(120)  not null,
    q               varchar(120),
    category        varchar(30),
    make            varchar(60),
    model           varchar(60),
    year            integer,
    city            varchar(80),
    last_seen_at    timestamptz   not null default now(),
    created_at      timestamptz   not null default now()
);
create index idx_saved_searches_user on saved_searches (user_id);

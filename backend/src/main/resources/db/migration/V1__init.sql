create table users (
    id              bigserial primary key,
    full_name       varchar(120) not null,
    email           varchar(180) not null unique,
    phone           varchar(30),
    password_hash   varchar(100) not null,
    city            varchar(80),
    role            varchar(20)  not null default 'USER',
    seller_type     varchar(20)  not null default 'PARTICULIER',
    shop_name       varchar(120),
    verified        boolean      not null default false,
    created_at      timestamptz  not null default now()
);

create table listings (
    id              bigserial primary key,
    seller_id       bigint        not null references users (id),
    title           varchar(140)  not null,
    description     text,
    category        varchar(30)   not null,
    part_condition  varchar(20)   not null,
    price           numeric(12, 3) not null,
    negotiable      boolean       not null default false,
    city            varchar(80)   not null,
    oem_reference   varchar(60),
    status          varchar(20)   not null default 'ACTIVE',
    views           integer       not null default 0,
    created_at      timestamptz   not null default now(),
    updated_at      timestamptz   not null default now()
);

create index idx_listings_status_created on listings (status, created_at desc);
create index idx_listings_category on listings (category);
create index idx_listings_seller on listings (seller_id);

create table listing_photos (
    listing_id      bigint        not null references listings (id) on delete cascade,
    position        integer       not null,
    url             varchar(400)  not null,
    primary key (listing_id, position)
);

create table listing_fits (
    listing_id      bigint        not null references listings (id) on delete cascade,
    make            varchar(60)   not null,
    model           varchar(60)   not null,
    year_from       integer,
    year_to         integer
);

create index idx_listing_fits_make_model on listing_fits (lower(make), lower(model));

create table orders (
    id                  bigserial primary key,
    reference           varchar(20)    not null unique,
    listing_id          bigint         not null references listings (id),
    buyer_id            bigint         not null references users (id),
    seller_id           bigint         not null references users (id),
    carrier             varchar(20)    not null,
    payment_method      varchar(20)    not null,
    payment_reference   varchar(80),
    item_price          numeric(12, 3) not null,
    shipping_fee        numeric(12, 3) not null,
    protection_fee      numeric(12, 3) not null,
    cod_fee             numeric(12, 3) not null,
    commission          numeric(12, 3) not null,
    seller_net          numeric(12, 3) not null,
    total               numeric(12, 3) not null,
    status              varchar(20)    not null,
    tracking_number     varchar(60),
    ship_full_name      varchar(120)   not null,
    ship_phone          varchar(30)    not null,
    ship_address        varchar(200)   not null,
    ship_city           varchar(80)    not null,
    ship_postal_code    varchar(10),
    created_at          timestamptz    not null default now(),
    delivered_at        timestamptz,
    completed_at        timestamptz
);

create index idx_orders_buyer on orders (buyer_id);
create index idx_orders_seller on orders (seller_id);
create index idx_orders_status on orders (status);

create table order_events (
    id              bigserial primary key,
    order_id        bigint        not null references orders (id) on delete cascade,
    status          varchar(20)   not null,
    label           varchar(160)  not null,
    location        varchar(80),
    created_at      timestamptz   not null default now()
);

create index idx_order_events_order on order_events (order_id, created_at);

create table wallet_transactions (
    id              bigserial primary key,
    user_id         bigint         not null references users (id),
    order_id        bigint         references orders (id),
    type            varchar(20)    not null,
    status          varchar(20)    not null,
    amount          numeric(12, 3) not null,
    commission      numeric(12, 3) not null default 0,
    label           varchar(160)   not null,
    payout_method   varchar(20),
    payout_destination varchar(60),
    created_at      timestamptz    not null default now()
);

create index idx_wallet_user on wallet_transactions (user_id, created_at desc);

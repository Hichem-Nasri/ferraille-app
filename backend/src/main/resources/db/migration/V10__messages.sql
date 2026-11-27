create table messages (
    id              bigserial primary key,
    listing_id      bigint        not null references listings (id) on delete cascade,
    seller_id       bigint        not null references users (id),
    sender_id       bigint        references users (id),
    sender_name     varchar(80)   not null,
    sender_phone    varchar(30)   not null,
    body            varchar(1000) not null,
    read_at         timestamptz,
    created_at      timestamptz   not null default now()
);

create index idx_messages_seller on messages (seller_id, created_at desc);
create index idx_messages_phone on messages (sender_phone, created_at desc);

create table contact_events (
    id              bigserial primary key,
    listing_id      bigint        not null references listings (id) on delete cascade,
    channel         varchar(20)   not null,
    created_at      timestamptz   not null default now()
);

create index idx_contact_events_created on contact_events (created_at desc);

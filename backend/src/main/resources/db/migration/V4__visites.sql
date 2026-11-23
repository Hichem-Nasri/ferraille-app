create table page_visits (
    id              bigserial primary key,
    path            varchar(300) not null,
    visitor         varchar(64)  not null,
    referrer        varchar(120),
    device          varchar(10)  not null,
    created_at      timestamptz  not null default now()
);

create index idx_page_visits_created on page_visits (created_at);

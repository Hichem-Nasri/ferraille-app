alter table page_visits add column source varchar(40);
create index idx_page_visits_source on page_visits (source);

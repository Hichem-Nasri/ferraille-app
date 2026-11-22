alter table users alter column password_hash drop not null;
alter table users alter column email drop not null;
alter table users add column facebook_id varchar(64);
alter table users add column avatar_url varchar(500);
alter table users add column whatsapp varchar(30);
alter table users add column facebook_url varchar(300);
create unique index ux_users_facebook_id on users (facebook_id) where facebook_id is not null;

alter table listings add column contact_clicks integer not null default 0;

alter table listings alter column price drop not null;

update listings set price = null where price < 5;

update listings l set status = 'ARCHIVED', updated_at = now()
where l.status = 'ACTIVE'
  and exists (
    select 1 from listings o
    where o.seller_id = l.seller_id
      and lower(trim(o.title)) = lower(trim(l.title))
      and o.price is not distinct from l.price
      and o.status = 'ACTIVE'
      and o.id < l.id
  );

update listing_fits set year_from = null where year_from > extract(year from now()) + 1 or year_from < 1950;
update listing_fits set year_to = null where year_to > extract(year from now()) + 1 or year_to < 1950;
update listing_fits set year_from = null, year_to = null where year_from is not null and year_to is not null and year_from > year_to;

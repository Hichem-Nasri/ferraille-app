update listings
set status = 'ARCHIVED', featured = false
where status = 'ACTIVE'
  and seller_id in (select id from users where email like '%@demo.ferraille.tn');

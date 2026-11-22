export function slugify(text: string): string {
  const slug = text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '');
  return slug.length > 80 ? slug.slice(0, 80).replace(/-+$/, '') : slug;
}

export function listingPath(id: number, title: string): string[] {
  return ['/piece', String(id), slugify(title)];
}

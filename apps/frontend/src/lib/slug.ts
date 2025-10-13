export function toSlug(input: string, maxLen = 80): string {
  if (!input) return '';
  const s = String(input)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '-')
    .replace(/-+/g, '-');
  return s.slice(0, maxLen).replace(/-+$/,'');
}


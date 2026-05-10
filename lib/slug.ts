// Deterministic slug generator for course names.
// - Lowercase
// - Strip diacritics (Ñ → N)
// - Replace non-alphanumeric runs with single hyphen
// - Strip leading/trailing hyphens, collapse repeats
// - Truncate to 80 chars

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
    .replace(/-$/, '');
}

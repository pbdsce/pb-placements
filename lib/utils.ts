import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(name: string, id: string): string {
  const base = name
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .replace(/-{2,}/g, '-');
  if (!base) base = 'user';
  const short = (id || '').slice(0, 6);
  return `${base}-${short}`;
}

export function extractSlugId(id: string): string | null {
  if (!id) return null;
  const match = id.match(/([0-9a-f]{6})$/i);
  return match ? match[1].toLowerCase() : null;
}

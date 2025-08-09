import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(name: string | null | undefined, id: string): string {
  let base = (name || 'user')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  if (!base) base = 'user';
  return `${base}-${id.slice(0, 6)}`;
}

export function memberUrl(
  name: string | null | undefined,
  id: string,
  type: 'profile' | 'resume' = 'profile',
  origin = ''
): string {
  if (origin.endsWith('/')) {
    origin = origin.slice(0, -1);
  }
  if (type === 'resume') {
    return `${origin}/profile/${slugify(name, id)}/resume`;
  }
  return `${origin}/profile/${slugify(name, id)}`;
}

export async function resolveIdFromParam(supabase: any, id: string): Promise<string> {
  const smatch = id.match(/([0-9a-f]{6})$/i);
  if (!smatch) return id;

  const suffix = smatch[1].toLowerCase();

  const base = id.replace(/-([0-9a-f]{6})$/i, '').replace(/-/g, ' ').trim();
  if (!base) return id;

  const { data } = await supabase
    .from('members')
    .select('id,name')
    .ilike('name', `%${base}%`)
    .limit(50);

  const match = (data || []).find((member: any) =>
    String(member.id).toLowerCase().startsWith(suffix)
  );

  return match?.id || id;
}

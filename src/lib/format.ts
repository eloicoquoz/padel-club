export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const s = parts.length >= 2 ? parts[0][0] + parts[1][0] : name.slice(0, 2);
  return s.toUpperCase();
}

/**
 * Merge class names conditionally (lightweight clsx alternative).
 * cn('base', condition && 'extra', { 'foo': true, 'bar': false })
 */
export function cn(...args) {
  const classes = [];
  for (const arg of args) {
    if (!arg) continue;
    if (typeof arg === 'string') {
      classes.push(arg);
    } else if (typeof arg === 'object' && !Array.isArray(arg)) {
      for (const [key, val] of Object.entries(arg)) {
        if (val) classes.push(key);
      }
    } else if (Array.isArray(arg)) {
      classes.push(cn(...arg));
    }
  }
  return classes.filter(Boolean).join(' ');
}

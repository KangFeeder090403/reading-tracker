export function getStats(items) {
  const total = items.length
  const reading = items.filter(i => i.status === 'reading').length
  const completed = items.filter(i => i.status === 'completed').length
  return { total, reading, completed }
}

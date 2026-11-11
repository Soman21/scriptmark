// A quick check on a reg number read from a script's front page. UNIZIK
// reg numbers start with the 4 digit entry year (2017364085, 2021/245678,
// 2025366001FN). A missing number, an odd shape, or a year no current
// student could have (a handwritten 2 read as 0 turns 2021 into 2001) is
// flagged so the lecturer checks it against the cover.
export function regNumberNeedsCheck(regNumber, now = new Date()) {
  const compact = String(regNumber || '').replace(/\s+/g, '').toUpperCase()
  if (!compact) return true
  const m = compact.match(/^(\d{4})\/?(\d{5,8})([A-Z]{0,3})$/)
  if (!m) return true
  const year = Number(m[1])
  return year < now.getFullYear() - 12 || year > now.getFullYear()
}

const requests = new Map<string, { count: number; resetTime: number }>()

// Auto-cleanup every 10 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of requests) {
    if (now > value.resetTime) {
      requests.delete(key)
    }
  }
}, 10 * 60 * 1000)

export function rateLimit(
  key: string,
  limit: number = 5,
  windowMs: number = 60 * 60 * 1000 // 1 hour
): boolean {
  const now = Date.now()
  const record = requests.get(key)

  if (!record || now > record.resetTime) {
    requests.set(key, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (record.count >= limit) {
    return false
  }

  record.count++
  return true
}

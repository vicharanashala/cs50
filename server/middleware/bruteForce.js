const attempts = new Map();

export function checkBruteForce(email) {
  const key = email.toLowerCase();
  const record = attempts.get(key);
  if (!record) return null;
  if (record.count >= 5 && Date.now() < record.lockoutUntil) {
    const remaining = Math.ceil((record.lockoutUntil - Date.now()) / 1000 / 60);
    return `Too many failed attempts. Try again in ${remaining} minute${remaining === 1 ? "" : "s"}.`;
  }
  if (Date.now() >= record.lockoutUntil) attempts.delete(key);
  return null;
}

export function recordFailedAttempt(email) {
  const key = email.toLowerCase();
  const record = attempts.get(key) ?? { count: 0, lockoutUntil: 0 };
  record.count += 1;
  if (record.count >= 5) record.lockoutUntil = Date.now() + 15 * 60 * 1000;
  attempts.set(key, record);
}

export function clearAttempts(email) {
  attempts.delete(email.toLowerCase());
}

setInterval(() => {
  const now = Date.now();
  for (const [key, record] of attempts) {
    if (now >= record.lockoutUntil) attempts.delete(key);
  }
}, 60000);

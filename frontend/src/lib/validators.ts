export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidUrl(url: string): boolean {
  try { new URL(url); return true; } catch { return false; }
}

export function isArxivUrl(url: string): boolean {
  return /^https?:\/\/arxiv\.org\/(abs|pdf)\/\d{4}\.\d{4,5}/.test(url);
}

export function sanitizeInput(input: string): string {
  return input.replace(/[<>]/g, '').trim();
}

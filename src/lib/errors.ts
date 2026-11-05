export function messageForStatus(status: number, what: string) {
  if (status === 429) return "Too many requests right now. Try again in a minute.";
  if (status === 401) return "Your session has expired. Please sign in again.";
  return `Couldn't load ${what}. Try again.`;
}
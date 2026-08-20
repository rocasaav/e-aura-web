export function getOrCreateSessionToken(): string {
  if (typeof window === 'undefined') return '';

  let token = localStorage.getItem('eaura_session_token');

  if (!token) {
    token = 'sess_' + crypto.randomUUID();
    localStorage.setItem('eaura_session_token', token);
  }

  return token;
}
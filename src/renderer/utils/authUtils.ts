export interface JwtPayload {
  id?: number | string;
  sub?: string;
  email?: string;
  name?: string;
  exp?: number;
  [key: string]: unknown;
}

/**
 * Safely decodes a JWT payload with UTF-8 character support.
 */
export function decodeJwt(token: string): JwtPayload | null {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Checks if a JWT token is already expired.
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodeJwt(token);
  if (!payload || !payload.exp) return true;
  return payload.exp * 1000 <= Date.now();
}

/**
 * Checks if a JWT token will expire within the given threshold in seconds (default: 5 minutes).
 */
export function isTokenExpiringSoon(token: string, thresholdSeconds: number = 300): boolean {
  const payload = decodeJwt(token);
  if (!payload || !payload.exp) return true;
  const timeUntilExpirySeconds = payload.exp - Math.floor(Date.now() / 1000);
  return timeUntilExpirySeconds <= thresholdSeconds;
}

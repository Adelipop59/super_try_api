import { CookieOptions } from 'express';

export const COOKIE_NAMES = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
} as const;

export const COOKIE_EXPIRY = {
  ACCESS_TOKEN: 60 * 60 * 1000, // 1 hour in milliseconds
  REFRESH_TOKEN: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
} as const;

export const getCookieOptions = (
  isProduction: boolean,
  maxAge: number,
): CookieOptions => ({
  httpOnly: true,
  secure: isProduction, // HTTPS only in production
  sameSite: isProduction ? 'strict' : 'lax', // 'lax' in dev for localhost compatibility
  maxAge,
  path: '/',
  domain: process.env.COOKIE_DOMAIN || undefined,
});

import { randomBytes } from 'node:crypto';

export function generateToken(length = 16): string {
  return randomBytes(length).toString('hex');
}

import type { AppUser } from '../types'

const hex = (bytes: ArrayBuffer) => Array.from(new Uint8Array(bytes), n => n.toString(16).padStart(2, '0')).join('')
async function derive(password: string, salt: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: 600000 }, key, 256))
}
export async function credentials(password: string) {
  if (password.length < 8) throw new Error('كلمة المرور يجب أن تكون 8 أحرف على الأقل')
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)).buffer)
  return { salt, hash: await derive(password, salt) }
}
export async function verifyPassword(user: AppUser, password: string) {
  const candidate = await derive(password, user.salt)
  let mismatch = 0
  for (let i = 0; i < user.hash.length; i++) mismatch |= user.hash.charCodeAt(i) ^ candidate.charCodeAt(i)
  return mismatch === 0
}

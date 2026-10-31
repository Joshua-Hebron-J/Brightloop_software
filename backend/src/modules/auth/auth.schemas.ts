import { z } from 'zod';
export const passwordSchema=z.string().min(9,'Use more than eight characters').max(72).regex(/[A-Z]/,'Include uppercase').regex(/[a-z]/,'Include lowercase').regex(/[^A-Za-z0-9]/,'Include a special character');

export const registerSchema = z.object({
  email: z.string().email().transform(s=>s.toLowerCase().trim()),
  password: passwordSchema,
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.enum(['CUSTOMER']).default('CUSTOMER'),
});

export const loginSchema = z.object({
  email: z.string().email().transform(s=>s.toLowerCase().trim()),
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
});

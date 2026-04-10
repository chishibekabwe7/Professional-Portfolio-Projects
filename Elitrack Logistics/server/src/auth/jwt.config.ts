export interface JwtConfig {
  secret: string;
  issuer: string;
  audience: string;
  expiresIn: string;
}

export const getJwtConfig = (): JwtConfig => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is required in environment variables.');
  }

  return {
    secret,
    issuer: process.env.JWT_ISSUER || 'elitrack-api',
    audience: process.env.JWT_AUDIENCE || 'elitrack-client',
    expiresIn: process.env.JWT_EXPIRES_IN || '12h',
  };
};
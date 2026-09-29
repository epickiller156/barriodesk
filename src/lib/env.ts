/**
 * Validación de variables de entorno
 * 
 * Variables requeridas:
 * - DATABASE_URL: URL de conexión a Neon PostgreSQL
 * - JWT_SECRET: Secreto para firmar tokens JWT (mínimo 32 caracteres)
 * - VAPID_PUBLIC_KEY: Clave pública VAPID para push notifications
 * - VAPID_PRIVATE_KEY: Clave privada VAPID para push notifications
 * - VAPID_SUBJECT: Subject para VAPID (generalmente un email)
 * 
 * Variables opcionales:
 * - NEXT_PUBLIC_VAPID_PUBLIC_KEY: Clave pública VAPID para el cliente
 */

// Variables requeridas para el servidor
const requiredServerEnvVars = [
  "DATABASE_URL",
  "JWT_SECRET",
  "VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
  "VAPID_SUBJECT",
] as const;

// Variables requeridas para el cliente
const requiredClientEnvVars = [
  "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
] as const;

export function validateEnv() {
  const missing: string[] = [];
  const invalid: string[] = [];

  // Validar variables del servidor
  for (const key of requiredServerEnvVars) {
    const value = process.env[key];
    if (!value) {
      missing.push(key);
    } else if (key === "JWT_SECRET" && value.length < 32) {
      invalid.push(`${key} (mínimo 32 caracteres)`);
    }
  }

  // Validar variables del cliente
  for (const key of requiredClientEnvVars) {
    const value = process.env[key];
    if (!value) {
      missing.push(key);
    }
  }

  if (missing.length > 0 || invalid.length > 0) {
    const errors: string[] = [];
    if (missing.length > 0) {
      errors.push(`Faltan variables: ${missing.join(", ")}`);
    }
    if (invalid.length > 0) {
      errors.push(`Variables inválidas: ${invalid.join(", ")}`);
    }
    throw new Error(`Error de configuración:\n${errors.join("\n")}`);
  }

  return {
    databaseUrl: process.env.DATABASE_URL!,
    jwtSecret: process.env.JWT_SECRET!,
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY!,
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY!,
    vapidSubject: process.env.VAPID_SUBJECT!,
    nextPublicVapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  };
}

// Validar al importar este módulo (solo en el servidor)
if (typeof window === "undefined") {
  validateEnv();
}

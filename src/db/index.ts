import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });  // Carga ambos por si acaso

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

// Connection pooling optimizado para serverless (Vercel + Neon)
// En serverless, cada función puede crear conexiones nuevas, por lo que
// necesitamos un pool pequeño con timeout corto para evitar agotar conexiones
const isServerless = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: isServerless ? 3 : 10,                    // Máximo de conexiones en el pool
  idleTimeoutMillis: 30000,                      // Cerrar conexiones inactivas después de 30s
  connectionTimeoutMillis: 5000,                  // Timeout de conexión de 5s
  allowExitOnIdle: isServerless,                  // Permitir que el proceso salga cuando el pool esté inactivo
});

// Manejar errores de conexión
pool.on("error", (err) => {
  console.error("Error en el pool de conexiones:", err);
});

export const db = drizzle(pool, { schema });
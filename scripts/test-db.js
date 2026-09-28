import { drizzle } from "drizzle-orm/node-postgres";
import { pgTable, serial, text } from "drizzle-orm/pg-core";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("ERROR: DATABASE_URL no está definida");
  process.exit(1);
}

console.log("Conectando a:", connectionString.replace(/:[^:@]+@/, ":****@"));

const pool = new pg.Pool({ connectionString });

try {
  const result = await pool.query("SELECT NOW()");
  console.log("Conexión exitosa:", result.rows[0]);
  await pool.end();
} catch (error) {
  console.error("Error de conexión:", error.message);
  console.error("Código:", error.code);
  process.exit(1);
}

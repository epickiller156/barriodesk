import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("ERROR: DATABASE_URL no está definida");
  process.exit(1);
}

console.log("Conectando a la base de datos...");

const pool = new pg.Pool({ connectionString });
const db = drizzle(pool);

try {
  console.log("Aplicando migraciones...");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migraciones aplicadas exitosamente");
  await pool.end();
} catch (error) {
  console.error("Error aplicando migraciones:");
  console.error(error.message);
  console.error(error.stack);
  await pool.end();
  process.exit(1);
}

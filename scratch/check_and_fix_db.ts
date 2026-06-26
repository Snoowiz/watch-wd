import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = Number(process.env.DB_PORT) || 3306;
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'watchwds';

async function main() {
  console.log('Connecting to database:', DB_NAME);
  const conn = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME
  });

  try {
    for (const table of ['users', 'ads', 'ad_impressions']) {
      const [rows]: any = await conn.query(`DESCRIBE \`${table}\``);
      console.log(`\nColumns for table ${table}:`);
      console.log(rows.map((r: any) => `${r.Field} (${r.Type})`));
    }
  } catch (err: any) {
    console.error('Error:', err.message);
  } finally {
    await conn.end();
  }
}

main().catch(console.error);

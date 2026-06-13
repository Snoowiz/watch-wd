import Database from "better-sqlite3";
const db = new Database("wdsportz.db");
console.log(db.prepare("SELECT * FROM features").all());

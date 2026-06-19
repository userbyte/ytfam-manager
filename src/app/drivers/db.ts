import { Db, MongoClient } from "mongodb";
const connectionString =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/placeholder";
if (!process.env.MONGO_URI) {
  console.error(
    "MONGO_URI env var is unset. this is required... please make sure its set!"
  );
  console.error(
    "MONGO_URI env var is unset. this is required... please make sure its set!"
  );
  console.error(
    "MONGO_URI env var is unset. this is required... please make sure its set!"
  );
  console.error(
    "MONGO_URI env var is unset. this is required... please make sure its set!"
  );
}
const client = new MongoClient(connectionString, { timeoutMS: 10000 });

let conn: MongoClient | null = null;
let db: Db | null = null;

try {
  conn = await client.connect();
  db = conn.db("ytmgr");
} catch (e) {
  console.error(e);
}

export default db;

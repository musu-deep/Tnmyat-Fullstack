import {openDatabase} from '../src/database.js';

const email = process.argv[2]?.trim().toLowerCase();
if (!email) throw Error('Usage: npm run admin -- user@example.org');
const db = openDatabase();
try {
  const {meta} = db.prepare("UPDATE users SET role='admin' WHERE email=?").bind(email).run();
  if (!meta.changes) throw Error('Account not found.');
  console.log('Admin role assigned.');
} finally { db.close(); }

import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import { createInterface } from 'node:readline/promises';
const config=JSON.parse(fs.readFileSync(new URL('./config.json',import.meta.url),'utf8'));
const rl=createInterface({input:process.stdin,output:process.stdout});
try {
 const name=(await rl.question('Admin name: ')).trim();
 const email=(await rl.question('Admin email: ')).trim().toLowerCase();
 const password=await rl.question('Admin password (8+ characters; input visible): ');
 if(!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length<8) throw Error('Invalid admin details.');
 const conn=await mysql.createConnection(config);
 try { const hash=await bcrypt.hash(password,12); await conn.execute("INSERT INTO users(name,email,password_hash,role) VALUES (?,?,?,'Admin')",[name,email,hash]); console.log('Admin created.'); } finally { await conn.end(); }
} catch(e) { console.error(e.message); process.exitCode=1; } finally { rl.close(); }

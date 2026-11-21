import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import fs from 'node:fs';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const app = express();
app.use(cors({
  origin: [
    'http://localhost:5173',
    process.env.FRONTEND_URL
  ].filter(Boolean)
}));
app.use(express.json());

const configPath = new URL('./config.json', import.meta.url);

const config = fs.existsSync(configPath)
  ? JSON.parse(fs.readFileSync(configPath, 'utf8'))
  : {};

if (!process.env.DB_HOST && !config.host) {
  console.error('Database configuration is missing.');
  process.exit(1);
}
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret.length < 32) { console.error('Set JWT_SECRET (at least 32 characters) before starting the API.'); process.exit(1); }
const db = mysql.createPool({
  host: process.env.DB_HOST || config.host,
  port: Number(process.env.DB_PORT || config.port || 3306),
  user: process.env.DB_USER || config.user,
  password: process.env.DB_PASSWORD || config.password,
  database: process.env.DB_NAME || config.database,

  ssl: process.env.DB_HOST
    ? {
        ca: process.env.DB_CA_CERT?.replace(/\\n/g, '\n'),
        rejectUnauthorized: true
      }
    : undefined,

  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true
});
const itemSelect = `SELECT id, name, type, category, color, location,
DATE_FORMAT(date, '%Y-%m-%d') AS date,
status, description, reporter FROM items`;
const claimSelect = `SELECT c.id, c.item_id AS itemId, i.name AS itemName, c.claimant,
  DATE_FORMAT(c.date, '%Y-%m-%d') AS date, c.status FROM claims c JOIN items i ON i.id=c.item_id`;
const valid = (v, values) => values.includes(v);
const errorHandler = (res, err) => { console.error(err); res.status(500).json({ error: 'Database operation failed. Check the backend terminal.' }); };

const auth = (req,res,next) => {
  const token = (req.headers.authorization || '').replace(/^Bearer /i,'');
  try { req.user = jwt.verify(token,jwtSecret); next(); }
  catch { res.status(401).json({error:'Please sign in again.'}); }
};
const admin = (req,res,next) => req.user.role === 'Admin' ? next() : res.status(403).json({error:'Admin access required.'});
const publicUser = (row) => ({id:row.id,name:row.name,email:row.email,role:row.role});
const sign = (row) => jwt.sign(publicUser(row),jwtSecret,{expiresIn:'8h'});
app.post('/api/auth/signup',async(req,res) => {
  const {name,email,password}=req.body || {};
  if(typeof name!=='string' || !name.trim() || typeof email!=='string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof password!=='string' || password.length<8 || password.length>72) return res.status(400).json({error:'Enter a name, valid email, and password of 8–72 characters.'});
  try {
    const hash=await bcrypt.hash(password,12);
    const [result]=await db.execute("INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,'Student')",[name.trim(),email.trim().toLowerCase(),hash]);
    const user={id:result.insertId,name:name.trim(),email:email.trim().toLowerCase(),role:'Student'};
    res.status(201).json({user,token:sign(user)});
  } catch(err) { if(err.code==='ER_DUP_ENTRY') return res.status(409).json({error:'Email already registered.'}); errorHandler(res,err); }
});
app.post('/api/auth/login',async(req,res) => {
  const {email,password}=req.body || {};
  if(typeof email!=='string' || typeof password!=='string') return res.status(400).json({error:'Email and password required.'});
  try {
    const [[row]]=await db.execute('SELECT id,name,email,role,password_hash FROM users WHERE email=?',[email.trim().toLowerCase()]);
    if(!row || !(await bcrypt.compare(password,row.password_hash))) return res.status(401).json({error:'Invalid email or password.'});
    res.json({user:publicUser(row),token:sign(row)});
  } catch(err) { errorHandler(res,err); }
});
app.get('/api/auth/me',auth,async(req,res)=>{
  try { const [[row]]=await db.execute('SELECT id,name,email,role FROM users WHERE id=?',[req.user.id]); if(!row) return res.status(401).json({error:'Account no longer exists.'}); res.json({user:publicUser(row)}); }
  catch(err) { errorHandler(res,err); }
});
app.get('/api/health', async (_req,res) => {
  try { await db.query('SELECT 1'); res.json({ ok:true }); }
  catch(err) { errorHandler(res,err); }
});
app.get('/api/items', async (_req,res) => {
  try { const [rows]=await db.query(`${itemSelect} ORDER BY id DESC`); res.json(rows); }
  catch(err) { errorHandler(res,err); }
});
app.post('/api/items', auth, async (req,res) => {
  const {name,type,category,color='',location,date,description=''}=req.body;
  const reporter=req.user.name;
  if (![name,category,location,date,reporter].every(v => typeof v==='string' && v.trim()) || !valid(type,['Lost','Found']) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({error:'Please fill in all required report fields.'});
  try {
    const [result]=await db.execute('INSERT INTO items (name,type,category,color,location,date,description,reporter) VALUES (?,?,?,?,?,?,?,?)',[name.trim(),type,category.trim(),color,location.trim(),date,description,reporter.trim()]);
    const [rows]=await db.execute(`${itemSelect} WHERE id=?`,[result.insertId]);
    res.status(201).json(rows[0]);
  } catch(err) { errorHandler(res,err); }
});
app.delete('/api/items/:id', auth, admin, async(req,res) => {
  try { const [r]=await db.execute('DELETE FROM items WHERE id=?',[req.params.id]); if(!r.affectedRows) return res.status(404).json({error:'Report not found'}); res.json({success:true}); }
  catch(err) { errorHandler(res,err); }
});
app.get('/api/claims', auth, async (req,res) => {
  try { const [rows]=await db.execute(`${claimSelect} ${req.user.role==='Admin'?'':'WHERE c.claimant=?'} ORDER BY c.id DESC`,req.user.role==='Admin'?[]:[req.user.name]); res.json(rows); }
  catch(err) { errorHandler(res,err); }
});
app.post('/api/claims', auth, async(req,res) => {
  const {itemId}=req.body;
  const claimant=req.user.name;
  if(!Number.isInteger(itemId) || typeof claimant!=='string' || !claimant.trim()) return res.status(400).json({error:'Valid item and claimant name are required.'});
  const conn=await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[item]]=await conn.execute('SELECT id,status FROM items WHERE id=? FOR UPDATE',[itemId]);
    if(!item) { await conn.rollback(); return res.status(404).json({error:'Item not found'}); }
    if(item.status==='Returned') { await conn.rollback(); return res.status(409).json({error:'This item has already been returned.'}); }
    const [[pending]]=await conn.execute("SELECT id FROM claims WHERE item_id=? AND status='Pending' LIMIT 1",[itemId]);
    if(pending) { await conn.rollback(); return res.status(409).json({error:'A pending claim already exists for this item.'}); }
    const [r]=await conn.execute("INSERT INTO claims (item_id,claimant,date) VALUES (?,?,CURDATE())",[itemId,claimant.trim()]);
    await conn.execute("UPDATE items SET status='Claimed' WHERE id=?",[itemId]);
    await conn.commit();
    const [rows]=await db.execute(`${claimSelect} WHERE c.id=?`,[r.insertId]);
    res.status(201).json(rows[0]);
  } catch(err) { await conn.rollback(); errorHandler(res,err); } finally { conn.release(); }
});
app.patch('/api/claims/:id', auth, admin, async(req,res) => {
  const {status}=req.body;
  if(!valid(status,['Approved','Rejected'])) return res.status(400).json({error:'Status must be Approved or Rejected.'});
  const conn=await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[claim]]=await conn.execute('SELECT id,item_id,status FROM claims WHERE id=? FOR UPDATE',[req.params.id]);
    if(!claim) { await conn.rollback(); return res.status(404).json({error:'Claim not found'}); }
    if(claim.status!=='Pending') { await conn.rollback(); return res.status(409).json({error:'Only pending claims can be reviewed.'}); }
    await conn.execute('UPDATE claims SET status=? WHERE id=?',[status,claim.id]);
    await conn.execute('UPDATE items SET status=? WHERE id=?',[status==='Approved'?'Returned':'Open',claim.item_id]);
    await conn.commit();
    res.json({success:true});
  } catch(err) { await conn.rollback(); errorHandler(res,err); } finally { conn.release(); }
});
app.post('/api/reset', async(_req,res) => res.status(403).json({error:'Database reset is disabled to protect saved records.'}));
app.listen(4000, () => console.log('API running at http://localhost:4000'));

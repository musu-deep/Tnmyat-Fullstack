import { socialRoute, validateImage } from './social.js';
import { writePost, serveFile } from './media.js';
import { groupRoute } from './groups.js';

const topics = new Set(['التعليم','البيئة','المجتمع','الاقتصاد']);
const encoder = new TextEncoder();
const sessionSeconds = 7 * 24 * 3600;
const pageSize = 12;
const jsonLimit = 400 * 1024;
const hashIterations = 100000;

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...headers
    }
  });
}

function textField(value, min, max, label, trim = true) {
  const text = typeof value === 'string' ? (trim ? value.trim() : value) : '';
  if (text.length < min || text.length > max) {
    throw new ApiError(400, 'طول ' + label + ' يجب أن يكون بين ' + min + ' و' + max + ' حرفًا.');
  }
  return text;
}

async function parseBody(request,limit=jsonLimit) {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') || '')) {
    throw new ApiError(415, 'أرسل البيانات بصيغة JSON.');
  }
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, 'البيانات مفقودة.');
  const decoder = new TextDecoder();
  let input = '';
  let bytes = 0;
  while (true) {
    const {done,value} = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > limit) {
      await reader.cancel();
      throw new ApiError(413, 'حجم البيانات أكبر من المسموح.');
    }
    input += decoder.decode(value,{stream:true});
  }
  try {
    const data = JSON.parse(input + decoder.decode());
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error();
    return data;
  } catch {
    throw new ApiError(400, 'تعذرت قراءة البيانات المرسلة.');
  }
}

function hex(bytes) {
  return Array.from(bytes, b => b.toString(16).padStart(2,'0')).join('');
}
function randomHex(bytes) {
  return hex(crypto.getRandomValues(new Uint8Array(bytes)));
}
async function digest(text) {
  return hex(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(text))));
}
async function passwordHash(password,salt) {
  const key = await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);
  const hash = await crypto.subtle.deriveBits({
    name: 'PBKDF2', hash: 'SHA-256', salt: encoder.encode(salt), iterations: hashIterations
  },key,256);
  return hex(new Uint8Array(hash));
}
function sameHash(a,b) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i=0; i<a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}
function publicUser(user) {
  return {id:user.id,name:user.name,role:user.role};
}
function sessionToken(request) {
  return (request.headers.get('Cookie') || '').match(/(?:^|;\s*)tn_session=([a-f0-9]{64})(?:;|$)/)?.[1];
}
function cookie(request,token,age) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return 'tn_session=' + token + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=' + age + secure;
}
async function currentUser(request,db) {
  const token = sessionToken(request);
  if (!token) return null;
  return db.prepare(`
    SELECT u.id,u.name,u.role,u.bio,
      CASE WHEN u.avatar_version IS NOT NULL THEN '/api/media/avatar/'||u.id||'?v='||u.avatar_version END AS avatar
    FROM sessions s JOIN users u ON u.id=s.user_id
    WHERE s.token_hash=? AND s.expires_at>unixepoch()
  `).bind(await digest(token)).first();
}
function requireUser(user) {
  if (!user) throw new ApiError(401,'سجّل الدخول لإتمام العملية.');
}
function requireAdmin(user) {
  requireUser(user);
  if (user.role !== 'admin') throw new ApiError(403,'هذه العملية متاحة للمشرف فقط.');
}
async function enforceLimit(db,scope,identity,maximum,seconds) {
  const window = Math.floor(Date.now()/1000/seconds);
  const bucket = await digest(scope + '|' + window + '|' + identity);
  const expiry = (window + 1)*seconds;
  const row = await db.prepare(`
    INSERT INTO rate_limits(bucket,used,expires_at) VALUES(?,1,?)
    ON CONFLICT(bucket) DO UPDATE SET used=used+1 WHERE used < ?
    RETURNING used
  `).bind(bucket,expiry,maximum).first();
  if (!row) throw new ApiError(429,'بلغت الحد المسموح لهذه العملية. حاول لاحقًا.');
}
async function authenticate(request,db,register) {
  const ip = request.headers.get('CF-Connecting-IP') || 'local';
  await enforceLimit(db,register?'register':'login',ip,register?12:40,900);
  const data = await parseBody(request);
  const email = textField(data.email,3,254,'البريد الإلكتروني').toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(400,'تحقق من البريد الإلكتروني.');
  const password = textField(data.password,10,128,'كلمة المرور',false);
  const token = randomHex(32);
  const tokenHash = await digest(token);
  const expire = db.prepare('DELETE FROM sessions WHERE expires_at<=unixepoch()');
  const cleanupLimits = db.prepare('DELETE FROM rate_limits WHERE expires_at<=unixepoch()');
  let user;
  if (register) {
    const name = textField(data.name,2,60,'الاسم');
    const salt = randomHex(16);
    const hash = await passwordHash(password,salt);
    // Both account creation and the initial session commit atomically.
    try {
      await db.batch([
        db.prepare('INSERT INTO users(email,name,password_hash,salt,last_seen) VALUES(?,?,?,?,unixepoch())').bind(email,name,hash,salt),
        db.prepare('INSERT INTO sessions SELECT ?,id,unixepoch()+? FROM users WHERE email=?').bind(tokenHash,sessionSeconds,email),
        expire, cleanupLimits
      ]);
    } catch (error) {
      if (await db.prepare('SELECT id FROM users WHERE email=?').bind(email).first()) {
        throw new ApiError(409,'تعذر إنشاء حساب بهذا البريد.');
      }
      throw error;
    }
    user = await db.prepare('SELECT id,name,role FROM users WHERE email=?').bind(email).first();
  } else {
    await enforceLimit(db,'login-email',email,16,900);
    user = await db.prepare('SELECT id,name,role,password_hash,salt FROM users WHERE email=?').bind(email).first();
    const candidate = await passwordHash(password,user?.salt || '00000000000000000000000000000000');
    if (!user?.password_hash || !sameHash(candidate,user.password_hash)) {
      throw new ApiError(401,'البريد الإلكتروني أو كلمة المرور غير صحيحة.');
    }
    await db.batch([
      db.prepare('INSERT INTO sessions VALUES(?,?,unixepoch()+?)').bind(tokenHash,user.id,sessionSeconds),
      db.prepare('UPDATE users SET last_seen=unixepoch() WHERE id=?').bind(user.id),
      expire,cleanupLimits
    ]);
  }
  return json({user:publicUser(user)},register?201:200,{'Set-Cookie':cookie(request,token,sessionSeconds)});
}

const postFields = `
  p.id,p.author_id,p.title,p.body,p.topic,p.created_at,p.version,u.name AS author,
  p.image_mime AS legacy_mime,length(p.image_bytes) AS legacy_size,
  (SELECT json_group_array(json_object('id',id,'name',name,'mime',mime,'size',size,'url','/api/files/'||id))
   FROM (SELECT id,name,mime,size FROM post_files WHERE post_id=p.id ORDER BY position)) AS file_list,
  CASE WHEN u.avatar_version IS NOT NULL THEN '/api/media/avatar/'||u.id||'?v='||u.avatar_version END AS author_avatar,
  CASE WHEN p.image_mime IS NOT NULL THEN '/api/media/post/'||p.id END AS image,
  (SELECT COUNT(*) FROM likes l WHERE l.post_id=p.id) AS likes,
  EXISTS(SELECT 1 FROM likes l WHERE l.post_id=p.id AND l.user_id=viewer.id) AS liked,
  (SELECT COUNT(*) FROM comments c WHERE c.post_id=p.id) AS comments_count,
  (SELECT COUNT(*) FROM reposts r WHERE r.post_id=p.id) AS reposts_count,
  EXISTS(SELECT 1 FROM reposts r WHERE r.post_id=p.id AND r.user_id=viewer.id) AS reposted
`;
const postFrom = ' FROM posts p JOIN users u ON u.id=p.author_id CROSS JOIN (SELECT ? AS id) viewer ';
function postView(row) {
  const {repost_user_id,repost_name,legacy_mime,legacy_size,file_list,...post}=row;
  const attachments=JSON.parse(file_list);
  if(legacy_mime)attachments.unshift({id:'legacy',name:'صورة المنشور',mime:legacy_mime,size:legacy_size,url:post.image});
  post.image=attachments.find(file=>file.mime.startsWith('image/'))?.url??null;
  post.attachments=attachments;
  return {...post,liked:Boolean(post.liked),reposted:Boolean(post.reposted),
    repost_by:repost_user_id ? {id:repost_user_id,name:repost_name} : null,repost_at:post.repost_at ?? null};
}
async function getPost(db,id,user) {
  const post = await db.prepare('SELECT '+postFields+postFrom+' WHERE p.id=?').bind(user?.id ?? 0,id).first();
  if (!post) throw new ApiError(404,'تعذر العثور على المنشور.');
  return postView(post);
}
async function route(request,db) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  if (!['GET','HEAD'].includes(method)) {
    const origin = request.headers.get('Origin');
    if ((origin && origin !== url.origin) || request.headers.get('Sec-Fetch-Site') === 'cross-site') {
      throw new ApiError(403,'تعذر التحقق من مصدر الطلب.');
    }
  }
  if (method === 'POST' && (path === '/api/register' || path === '/api/login')) {
    return authenticate(request,db,path === '/api/register');
  }
  if (method === 'POST' && path === '/api/logout') {
    const token = sessionToken(request);
    if (token) {
      const hashed=await digest(token);
      await db.batch([
        db.prepare(`UPDATE users SET last_seen=NULL WHERE id=(SELECT user_id FROM sessions WHERE token_hash=?)
          AND NOT EXISTS(SELECT 1 FROM sessions s WHERE s.user_id=users.id AND s.token_hash<>? AND s.expires_at>unixepoch())`).bind(hashed,hashed),
        db.prepare('DELETE FROM sessions WHERE token_hash=?').bind(hashed)
      ]);
    }
    return json({ok:true},200,{'Set-Cookie':cookie(request,'',0)});
  }
  const user = await currentUser(request,db);
  const helpers={json,parseBody,textField,requireUser,ApiError,enforceLimit,validateImage,topics};
  const file=path.match(/^\/api\/files\/([0-9a-f-]{36})$/);
  if(file&&['GET','HEAD'].includes(method))return serveFile(request,db,file[1],helpers);
  if (path.startsWith('/api/groups')) return groupRoute(request,db,user,helpers);
  const social=await socialRoute(request,db,user,helpers);
  if (social) return social;
  if (method === 'GET' && path === '/api/me') return json({user});
  if (path === '/api/posts' && method === 'GET') {
    const q = textField(url.searchParams.get('q') || '',0,160,'عبارة البحث');
    const topic = url.searchParams.get('topic') || '';
    if (topic && !topics.has(topic)) throw new ApiError(400,'المجال غير معروف.');
    const page = Number(url.searchParams.get('page') || 1);
    if (!Number.isSafeInteger(page) || page < 1 || page > 1000000) throw new ApiError(400,'رقم الصفحة غير صالح.');
    const member = Number(url.searchParams.get('user') || 0);
    if (!Number.isSafeInteger(member) || member<0) throw new ApiError(400,'معرف العضو غير صالح.');
    const {results} = await db.prepare(`WITH wall AS (
      SELECT id AS post_id,created_at AS event_time,NULL AS repost_user_id FROM posts WHERE ?=0 OR author_id=?
      UNION ALL
      SELECT post_id,created_at,user_id FROM reposts WHERE ?=0 OR user_id=?
    )
    SELECT `+postFields+`,w.repost_user_id,rep.name AS repost_name,
      CASE WHEN w.repost_user_id IS NOT NULL THEN w.event_time END AS repost_at`+postFrom+`
    JOIN wall w ON w.post_id=p.id LEFT JOIN users rep ON rep.id=w.repost_user_id
    WHERE (?='' OR p.topic=?) AND (?='' OR instr(lower(p.title),lower(?))>0 OR instr(lower(p.body),lower(?))>0 OR instr(lower(u.name),lower(?))>0)
    ORDER BY w.event_time DESC,p.id DESC,COALESCE(w.repost_user_id,0) DESC LIMIT ? OFFSET ?
    `).bind(member,member,member,member,user?.id ?? 0,topic,topic,q,q,q,q,pageSize+1,pageSize*(page-1)).all();
    return json({posts:results.slice(0,pageSize).map(postView),hasMore:results.length>pageSize});
  }
  if (path === '/api/posts' && method === 'POST') {
    requireUser(user);
    const id=await writePost(request,db,user,null,helpers);
    return json({post:await getPost(db,id,user)},201);
  }
  if (path === '/api/reports' && method === 'GET') {
    requireAdmin(user);
    const {results} = await db.prepare(`SELECT r.id,r.post_id,COALESCE(NULLIF(p.title,''),NULLIF(substr(p.body,1,80),''),'منشور بصورة') AS title,r.created_at FROM reports r JOIN posts p ON p.id=r.post_id ORDER BY r.created_at DESC,r.id DESC`).all();
    return json({reports:results});
  }
  const reportMatch = path.match(/^\/api\/reports\/(\d+)$/);
  if (reportMatch && method === 'DELETE') {
    requireAdmin(user);
    await db.prepare('DELETE FROM reports WHERE id=?').bind(reportMatch[1]).run();
    return json({ok:true});
  }
  const match = path.match(/^\/api\/posts\/(\d+)(?:\/(comments|like|report|repost))?$/);
  if (match) {
    const [,id,action] = match;
    if (!action && method === 'GET') {
      const post = await getPost(db,id,user);
      const {results} = await db.prepare(`
        SELECT c.id,c.body,c.created_at,u.id AS author_id,u.name AS author,
          CASE WHEN u.avatar_version IS NOT NULL THEN '/api/media/avatar/'||u.id||'?v='||u.avatar_version END AS author_avatar FROM comments c JOIN users u ON u.id=c.author_id
        WHERE c.post_id=? ORDER BY c.id
      `).bind(id).all();
      return json({post,comments:results});
    }
    requireUser(user);
    const post = await getPost(db,id,user);
    if(!action && method==='PATCH'){
      await writePost(request,db,user,post,helpers);
      return json({post:await getPost(db,id,user)});
    }
    if (!action && method === 'DELETE') {
      if (post.author_id !== user.id && user.role !== 'admin') throw new ApiError(403,'لا تملك صلاحية حذف هذا المنشور.');
      await db.prepare('DELETE FROM posts WHERE id=?').bind(id).run();
    } else if (action === 'like' && method === 'PUT') {
      const data = await parseBody(request);
      if (typeof data.liked !== 'boolean') throw new ApiError(400,'قيمة التفاعل غير صالحة.');
      await db.prepare(data.liked
        ? 'INSERT INTO likes(post_id,user_id) VALUES(?,?) ON CONFLICT DO NOTHING'
        : 'DELETE FROM likes WHERE post_id=? AND user_id=?').bind(id,user.id).run();
    } else if (action === 'repost' && method === 'PUT') {
      const data=await parseBody(request);
      if (typeof data.reposted!=='boolean') throw new ApiError(400,'قيمة إعادة النشر غير صالحة.');
      if (post.author_id===user.id && data.reposted) throw new ApiError(400,'المنشور موجود بالفعل على حائطك.');
      await enforceLimit(db,'repost',user.id,100,3600);
      await db.prepare(data.reposted
        ? 'INSERT INTO reposts(post_id,user_id) VALUES(?,?) ON CONFLICT DO NOTHING'
        : 'DELETE FROM reposts WHERE post_id=? AND user_id=?').bind(id,user.id).run();
    } else if (action === 'comments' && method === 'POST') {
      const data = await parseBody(request);
      const body = textField(data.body,1,1500,'التعليق');
      await enforceLimit(db,'comment',user.id,60,3600);
      await db.prepare('INSERT INTO comments(post_id,author_id,body) VALUES(?,?,?)').bind(id,user.id,body).run();
    } else if (action === 'report' && method === 'POST') {
      await enforceLimit(db,'report',user.id,20,3600);
      await db.prepare('INSERT INTO reports(post_id,user_id) VALUES(?,?) ON CONFLICT DO NOTHING').bind(id,user.id).run();
    } else throw new ApiError(405,'طريقة الطلب غير مدعومة.');
    return json({ok:true});
  }
  throw new ApiError(404,'تعذر العثور على المسار.');
}
export async function api(request,env) {
  try {
    return await route(request,env.DB);
  } catch (error) {
    if (error instanceof ApiError) return json({error:error.message},error.status);
    console.error('API request failed',request.method,new URL(request.url).pathname,error.name);
    return json({error:'تعذر إتمام الطلب الآن. حاول مجددًا.'},500);
  }
}

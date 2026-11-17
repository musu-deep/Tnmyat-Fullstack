import { governanceRoute } from './governance.js';
import { developmentHubRoute } from './development-hub.js';
import { memberJourneyRoute } from './member-journey.js';
import { networkRoute } from './network-engine.js';
import { developmentWorkRoute } from './development-work.js';
import { communityNeedsRoute } from './community-needs.js';
import { reviewCenterRoute } from './review-center.js';
import { staffRoute, staffCapabilities } from './staff.js';
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
function validateNewPassword(value){
 const password=textField(value,8,256,'كلمة المرور الجديدة',false);
 if(!/\p{L}/u.test(password)||!/[\p{N}\p{P}\p{S}]/u.test(password)||/\s/u.test(password)||
    /^(?:password|12345678|qwerty123|admin123|password123)$/i.test(password)){
  throw new ApiError(400,'اختر كلمة مرور قوية تتضمن حروفاً وأرقاماً أو رموزاً، دون مسافات.');
 }
 return password;
}
// Password reset links are generated only by a signed-in director, never exposed by public email lookup.
async function passwordRecoveryRoute(request,db,user){
 const {pathname:path}=new URL(request.url),method=request.method;
 if(!['/api/admin/password-recovery','/api/password-recovery/complete'].includes(path))return null;
 const ip=request.headers.get('CF-Connecting-IP')||'local';
 if(path==='/api/admin/password-recovery'){
  requireAdmin(user);
  if(user.account_status!=='active')throw new ApiError(403,'الحساب الإداري غير نشط.');
  if(method!=='POST')throw new ApiError(405,'طريقة الطلب غير مدعومة.');
  await enforceLimit(db,'admin-recovery',user.id,12,3600);
  const body=await parseBody(request);
  const email=textField(body.email,3,254,'البريد الإلكتروني').toLowerCase();
  const reason=textField(body.reason,12,500,'سبب استعادة الحساب');
  const account=await db.prepare('SELECT id,name,role,account_status,password_hash FROM users WHERE email=?').bind(email).first();
  if(!account)throw new ApiError(404,'لا يوجد حساب بهذا البريد في قاعدة البيانات.');
  if(account.account_status!=='active')throw new ApiError(403,'الحساب موقوف أو غير نشط. راجع حالة الحساب قبل إعادة كلمة المرور.');
  if(account.role==='admin'&&account.id!==user.id)throw new ApiError(403,'لا يمكن إنشاء رابط لحساب مدير آخر من هذا المسار.');
  if(!account.password_hash)throw new ApiError(400,'هذا الحساب لا يستخدم كلمة مرور محلية.');
  const token=randomHex(32),tokenHash=await digest(token);
  await db.batch([
   db.prepare('DELETE FROM password_reset_tokens WHERE user_id=? OR expires_at<=unixepoch()').bind(account.id),
   db.prepare('INSERT INTO password_reset_tokens(token_hash,user_id,issued_by,expires_at) VALUES(?,?,?,unixepoch()+1800)').bind(tokenHash,account.id,user.id),
   db.prepare('INSERT INTO moderation_actions(actor_id,target_type,target_id,action,reason) VALUES(?,?,?,?,?)')
    .bind(user.id,'user',account.id,'password_recovery_issued',reason)
  ]);
  // Only show the bearer link once. Deliver it through an identity-verified private channel.
  const url=new URL(request.url);
  const resetUrl=url.origin+'/reset-password?token='+encodeURIComponent(token);
  return json({reset_url:resetUrl,expires_minutes:30,account_name:account.name});
 }
 if(method!=='POST')throw new ApiError(405,'طريقة الطلب غير مدعومة.');
 await enforceLimit(db,'password-recovery',ip,16,900);
 const body=await parseBody(request),token=textField(body.token,64,64,'رمز الاستعادة',false);
 if(!/^[0-9a-f]{64}$/.test(token))throw new ApiError(400,'رابط الاستعادة غير صالح أو منتهي الصلاحية.');
 const password=validateNewPassword(body.password);
 if(body.confirm_password!==password)throw new ApiError(400,'تأكيد كلمة المرور غير مطابق.');
 const hash=await digest(token);
 const userRow=await db.prepare(`SELECT u.id FROM password_reset_tokens t JOIN users u ON u.id=t.user_id
  WHERE t.token_hash=? AND t.expires_at>unixepoch() AND u.account_status='active'`).bind(hash).first();
 if(!userRow)throw new ApiError(400,'رابط الاستعادة غير صالح أو منتهي الصلاحية.');
 const salt=randomHex(16),password_hash=await passwordHash(password,salt);
 const changes=await db.batch([
  db.prepare(`UPDATE users SET password_hash=?,salt=? WHERE id=?
   AND account_status='active'
   AND EXISTS(SELECT 1 FROM password_reset_tokens WHERE token_hash=? AND user_id=users.id AND expires_at>unixepoch())
   RETURNING id`).bind(password_hash,salt,userRow.id,hash),
  db.prepare('DELETE FROM password_reset_tokens WHERE user_id=?').bind(userRow.id),
  db.prepare('DELETE FROM sessions WHERE user_id=?').bind(userRow.id),
  db.prepare('INSERT INTO moderation_actions(actor_id,target_type,target_id,action,reason) VALUES(?,?,?,?,?)')
   .bind(userRow.id,'user',userRow.id,'password_recovery_completed','اكتملت إعادة تعيين كلمة المرور باستخدام رابط مؤقت')
 ]);
 if(!changes[0].results.length)throw new ApiError(400,'رابط الاستعادة لم يعد صالحاً.');
 return json({ok:true});
}
async function currentUser(request,db) {
  const token = sessionToken(request);
  if (!token) return null;
  return db.prepare(`
    SELECT u.id,u.name,u.role,u.bio,u.account_status,u.status_until,u.cover_position,
      CASE WHEN u.cover_version IS NOT NULL THEN '/api/media/cover/'||u.id||'?v='||u.cover_version END AS cover,
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
  // Preserve login compatibility for accounts created before this change.
  const password = textField(data.password,1,256,'كلمة المرور',false);
  if(register){
    const letters=/\p{L}/u.test(password);
    const secondary=/[\p{N}\p{P}\p{S}]/u.test(password);
    if(password.length<8||!letters||!secondary||/\s/u.test(password)||
       /^(?:password|12345678|qwerty123|admin123|password123)$/i.test(password)){
      throw new ApiError(400,'اختر كلمة مرور قوية من 8 أحرف على الأقل، تتضمن حروفاً مع أرقام أو رموزاً، دون مسافات.');
    }
  }
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
    const status=await db.prepare('SELECT account_status,status_until FROM users WHERE id=?').bind(user.id).first();
    if(status.account_status==='banned'||(status.account_status==='suspended'&&(!status.status_until||status.status_until>Math.floor(Date.now()/1000))))throw new ApiError(403,'الحساب موقوف؛ تواصل مع إدارة المجتمع.');
    await db.batch([
      db.prepare('INSERT INTO sessions VALUES(?,?,unixepoch()+?)').bind(tokenHash,user.id,sessionSeconds),
      db.prepare('UPDATE users SET last_seen=unixepoch() WHERE id=?').bind(user.id),
      expire,cleanupLimits
    ]);
  }
  return json({user:publicUser(user)},register?201:200,{'Set-Cookie':cookie(request,token,sessionSeconds)});
}

const postFields = `
  p.id,p.author_id,p.title,p.body,p.topic,p.created_at,p.version,p.post_kind,p.pinned,u.name AS author,
  EXISTS(SELECT 1 FROM featured_member_posts f WHERE f.post_id=p.id AND f.status='published') AS gold_featured,
  EXISTS(SELECT 1 FROM post_bookmarks b WHERE b.post_id=p.id AND b.user_id=viewer.id) AS saved,
  p.image_mime AS legacy_mime,length(p.image_bytes) AS legacy_size,
  (SELECT json_group_array(json_object('id',id,'name',name,'mime',mime,'size',size,'url','/api/files/'||id))
   FROM (SELECT id,name,mime,size FROM post_files WHERE post_id=p.id ORDER BY position)) AS file_list,
  CASE WHEN u.avatar_version IS NOT NULL THEN '/api/media/avatar/'||u.id||'?v='||u.avatar_version END AS author_avatar,
  CASE WHEN u.cover_version IS NOT NULL THEN '/api/media/cover/'||u.id||'?v='||u.cover_version END AS author_cover,
  u.cover_position AS author_cover_position,
  CASE WHEN p.image_mime IS NOT NULL THEN '/api/media/post/'||p.id END AS image,
  (SELECT COUNT(*) FROM likes l WHERE l.post_id=p.id) AS likes,
  EXISTS(SELECT 1 FROM likes l WHERE l.post_id=p.id AND l.user_id=viewer.id) AS liked,
  (SELECT COUNT(*) FROM comments c WHERE c.post_id=p.id AND c.moderation_status='visible') AS comments_count,
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
  return {...post,pinned:Boolean(post.pinned),gold_featured:Boolean(post.gold_featured),saved:Boolean(post.saved),liked:Boolean(post.liked),reposted:Boolean(post.reposted),
    repost_by:repost_user_id ? {id:repost_user_id,name:repost_name} : null,repost_at:post.repost_at ?? null};
}
async function getPost(db,id,user) {
  const post = await db.prepare('SELECT '+postFields+postFrom+" WHERE p.id=? AND (p.moderation_status='visible' OR ?=1)").bind(user?.id ?? 0,id,user?.role==='admin'?1:0).first();
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
  const recovery=await passwordRecoveryRoute(request,db,user);
  if(recovery)return recovery;
  const helpers={json,parseBody,textField,requireUser,ApiError,enforceLimit,validateImage,topics};
  const governance=await governanceRoute(request,db,user,helpers);
  if(governance)return governance;
  if(user&&(user.account_status==='banned'||(user.account_status==='suspended'&&(!user.status_until||user.status_until>Math.floor(Date.now()/1000)))))throw new ApiError(403,'الحساب موقوف؛ تواصل مع إدارة المجتمع.');
  const staff=await staffRoute(request,db,user,helpers);
  if(staff)return staff;

  const hub=await developmentHubRoute(request,db,user,helpers);
  if(hub)return hub;
  const journey=await memberJourneyRoute(request,db,user,helpers);
  if(journey)return journey;
  const network=await networkRoute(request,db,user,helpers);
  if(network)return network;
  const work=await developmentWorkRoute(request,db,user,helpers);
  if(work)return work;
  const needs=await communityNeedsRoute(request,db,user,helpers);
  if(needs)return needs;
  const reviewCenter=await reviewCenterRoute(request,db,user,helpers);
  if(reviewCenter)return reviewCenter;
  const file=path.match(/^\/api\/files\/([0-9a-f-]{36})$/);
  if(file&&['GET','HEAD'].includes(method))return serveFile(request,db,file[1],helpers);
  if (path.startsWith('/api/groups')) return groupRoute(request,db,user,helpers);
  const social=await socialRoute(request,db,user,helpers);
  if (social) return social;
  if (method === 'GET' && path === '/api/me') return json({user:user ? {id:user.id,name:user.name,role:user.role,permissions:await staffCapabilities(db,user),bio:user.bio,avatar:user.avatar,cover:user.cover,cover_position:user.cover_position} : null});
  if (path === '/api/posts' && method === 'GET') {
    const q = textField(url.searchParams.get('q') || '',0,160,'عبارة البحث');
    const topic = url.searchParams.get('topic') || '';
    if (topic && !topics.has(topic)) throw new ApiError(400,'المجال غير معروف.');
    const page = Number(url.searchParams.get('page') || 1);
    if (!Number.isSafeInteger(page) || page < 1 || page > 1000000) throw new ApiError(400,'رقم الصفحة غير صالح.');
    const view = url.searchParams.get('view') || 'latest';
    if(!['latest','following','saved','trending'].includes(view)) throw new ApiError(400,'طريقة العرض غير معروفة.');
    if(['following','saved'].includes(view)) requireUser(user);
    const tag = textField(url.searchParams.get('tag') || '',0,40,'الوسم').replace(/^#/, '');
    const kind = url.searchParams.get('kind') || '';
    if (kind && !['post','article','initiative','question','announcement'].includes(kind)) throw new ApiError(400,'نوع المنشور غير صالح.');
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
    WHERE (p.moderation_status='visible' OR ?=1)
      AND (?='' OR p.topic=?)
      AND (?='' OR instr(lower(p.title),lower(?))>0 OR instr(lower(p.body),lower(?))>0 OR instr(lower(u.name),lower(?))>0)
      AND (?='' OR p.post_kind=?)
      AND (?='' OR instr(lower(p.body),lower('#'||?))>0 OR instr(lower(p.title),lower('#'||?))>0)
      AND (?!='saved' OR EXISTS(SELECT 1 FROM post_bookmarks b WHERE b.post_id=p.id AND b.user_id=?))
      AND (?!='following' OR p.author_id=? OR EXISTS(SELECT 1 FROM follows f WHERE f.follower=? AND f.followed=p.author_id))
    ORDER BY CASE WHEN ?='trending' THEN (SELECT COUNT(*) FROM likes l WHERE l.post_id=p.id)*2+(SELECT COUNT(*) FROM comments c WHERE c.post_id=p.id)*3+(SELECT COUNT(*) FROM reposts r WHERE r.post_id=p.id)*2 ELSE 0 END DESC,
      CASE WHEN ?='latest' AND ?=0 THEN p.pinned ELSE 0 END DESC,
      w.event_time DESC,p.id DESC,COALESCE(w.repost_user_id,0) DESC LIMIT ? OFFSET ?
    `).bind(member,member,member,member,user?.id ?? 0,user?.role==='admin'?1:0,
      topic,topic,q,q,q,q,kind,kind,tag,tag,tag,view,user?.id ?? 0,
      view,user?.id ?? 0,user?.id ?? 0,view,view,member,pageSize+1,pageSize*(page-1)).all();
    return json({posts:results.slice(0,pageSize).map(postView),hasMore:results.length>pageSize});
  }
  if(path==='/api/trends' && method==='GET') {
    const {results}=await db.prepare(`SELECT title,body FROM posts WHERE moderation_status='visible' ORDER BY id DESC LIMIT 180`).all();
    const counts=new Map();
    for(const row of results){
      const tags=new Set((String(row.title||'')+' '+String(row.body||'')).match(/#[\p{L}\p{N}_]{2,40}/gu)||[]);
      for(const tag of tags)counts.set(tag,(counts.get(tag)||0)+1);
    }
    return json({tags:[...counts].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'ar')).slice(0,8).map(([tag,count])=>({tag,count}))});
  }
  if(path==='/api/discover' && method==='GET') {
    const {results:members}=await db.prepare(`SELECT u.id,u.name,u.bio,
      CASE WHEN u.avatar_version IS NOT NULL THEN '/api/media/avatar/'||u.id||'?v='||u.avatar_version END AS avatar,
      CASE WHEN u.cover_version IS NOT NULL THEN '/api/media/cover/'||u.id||'?v='||u.cover_version END AS cover,
      u.cover_position,
      (SELECT count(*) FROM posts p WHERE p.author_id=u.id AND p.moderation_status='visible') AS posts_count,
      (SELECT count(*) FROM follows f WHERE f.followed=u.id) AS followers_count
      FROM users u WHERE u.id<>? AND u.password_hash IS NOT NULL AND u.account_status='active'
      AND NOT EXISTS(SELECT 1 FROM follows f WHERE f.follower=? AND f.followed=u.id)
      ORDER BY (SELECT COUNT(*) FROM posts p WHERE p.author_id=u.id AND p.moderation_status='visible') DESC,u.id DESC LIMIT 4`).bind(user?.id??0,user?.id??0).all();
    const {results:groups}=await db.prepare(`SELECT g.id,g.name,g.description,
      (SELECT COUNT(*) FROM group_members m WHERE m.group_id=g.id AND m.status!='blocked')+1 AS members
      FROM community_groups g WHERE g.moderation_status='visible' ORDER BY members DESC,g.id DESC LIMIT 4`).all();
    return json({members,groups});
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
  const pinMatch=path.match(/^\/api\/posts\/(\d+)\/pin$/);
  if(pinMatch && method==='PUT'){
    requireAdmin(user);
    const {pinned}=await parseBody(request);
    if(typeof pinned!=='boolean')throw new ApiError(400,'قيمة التثبيت غير صالحة.');
    const result=await db.prepare("UPDATE posts SET pinned=? WHERE id=? AND moderation_status='visible'").bind(pinned?1:0,pinMatch[1]).run();
    if(!result.meta.changes)throw new ApiError(404,'المنشور غير متاح');
    await db.prepare('INSERT INTO moderation_actions(actor_id,action,target_type,target_id,reason) VALUES(?,?,?,?,?)').bind(user.id,pinned?'pin':'unpin','post',Number(pinMatch[1]),pinned?'تثبيت منشور في الحائط':'إلغاء تثبيت منشور').run();
    return json({ok:true});
  }
  const match = path.match(/^\/api\/posts\/(\d+)(?:\/(comments|like|report|repost|bookmark))?$/);
  if (match) {
    const [,id,action] = match;
    if (!action && method === 'GET') {
      const post = await getPost(db,id,user);
      const {results} = await db.prepare(`
        SELECT c.id,c.body,c.created_at,u.id AS author_id,u.name AS author,
          CASE WHEN u.avatar_version IS NOT NULL THEN '/api/media/avatar/'||u.id||'?v='||u.avatar_version END AS author_avatar,
          CASE WHEN u.cover_version IS NOT NULL THEN '/api/media/cover/'||u.id||'?v='||u.cover_version END AS author_cover,
          u.cover_position AS author_cover_position FROM comments c JOIN users u ON u.id=c.author_id
        WHERE c.post_id=? AND (c.moderation_status='visible' OR ?=1) ORDER BY c.id
      `).bind(id,user?.role==='admin'?1:0).all();
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
      if(user.role==='admin'&&post.author_id!==user.id)throw new ApiError(403,'استخدم مركز الإدارة لإخفاء المنشور مع توثيق القرار');
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
    } else if (action === 'bookmark' && method === 'PUT') {
      const data=await parseBody(request);
      if(typeof data.saved!=='boolean')throw new ApiError(400,'قيمة الحفظ غير صالحة.');
      await db.prepare(data.saved ?
        'INSERT INTO post_bookmarks(user_id,post_id) VALUES(?,?) ON CONFLICT DO NOTHING' :
        'DELETE FROM post_bookmarks WHERE user_id=? AND post_id=?').bind(user.id,id).run();
    } else if (action === 'comments' && method === 'POST') {
      const data = await parseBody(request);
      const body = textField(data.body,1,8000,'التعليق');
      await enforceLimit(db,'comment',user.id,60,3600);
      await db.prepare('INSERT INTO comments(post_id,author_id,body) VALUES(?,?,?)').bind(id,user.id,body).run();
    } else if (action === 'report' && method === 'POST') {
      await enforceLimit(db,'report',user.id,20,3600);
      await db.batch([db.prepare('INSERT INTO reports(post_id,user_id) VALUES(?,?) ON CONFLICT DO NOTHING').bind(id,user.id),db.prepare('INSERT INTO moderation_reports(reporter_id,target_type,target_id,reason) VALUES(?,?,?,?)').bind(user.id,'post',Number(id),'بلاغ عن محتوى منشور')]);
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

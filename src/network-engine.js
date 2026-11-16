// Explicit, explainable member matching. No AI inference or automatic contact.
const fields="SELECT p.user_id,u.name,p.professional_role,p.country,p.city,p.sectors,p.skills,p.participation FROM member_preferences p JOIN users u ON u.id=p.user_id";
const parseList=x=>{try{const v=JSON.parse(x||'[]');return Array.isArray(v)?v.filter(y=>typeof y==='string'):[]}catch{return []}};
const clean=(x,n)=>typeof x==='string'?x.trim().slice(0,n):'';
const validDate=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&!Number.isNaN(Date.parse(x+'T12:00:00Z'))&&new Date(x+'T12:00:00Z').toISOString().startsWith(x);
const safeHttps=x=>{if(!x)return '';try{const u=new URL(x);return u.protocol==='https:'&&!u.username&&!u.password&&u.href.length<=1200?u.href:null}catch{return null}};
export async function networkRoute(request,db,user,{json,parseBody,requireUser,ApiError,enforceLimit}){
 const url=new URL(request.url),path=url.pathname,method=request.method;
 if(!path.startsWith('/api/network/'))return null;
 requireUser(user);
 const uid=user.id;
 const bad=message=>{throw new ApiError(400,message)};
 if(path==='/api/network/settings'){
  if(method==='GET'){
   const r=await db.prepare('SELECT network_discovery FROM member_preferences WHERE user_id=?').bind(uid).first();
   return json({enabled:Boolean(r?.network_discovery)});
  }
  if(method==='PATCH'){
   const d=await parseBody(request);
   if(typeof d.enabled!=='boolean')bad('اختر تفعيل أو إيقاف الاقتراحات.');
   await db.prepare(`INSERT INTO member_preferences(user_id,network_discovery) VALUES(?,?)
     ON CONFLICT(user_id) DO UPDATE SET network_discovery=excluded.network_discovery`).bind(uid,d.enabled?1:0).run();
   return json({enabled:d.enabled});
  }
 }
 if(path==='/api/network/matches'&&method==='GET'){
  const mine=await db.prepare('SELECT sectors,skills,participation,country,network_discovery FROM member_preferences WHERE user_id=?').bind(uid).first();
  if(!mine?.network_discovery)return json({enabled:false,people:[],groups:[],projects:[]});
  const sectors=parseList(mine.sectors),skills=parseList(mine.skills),participation=parseList(mine.participation);
  const {results:members}=await db.prepare(fields+` WHERE p.user_id<>? AND p.network_discovery=1
    AND p.profile_visibility='members' AND u.account_status='active'
    ORDER BY p.updated_at DESC LIMIT 200`).bind(uid).all();
  const people=members.map(m=>{
   const common=parseList(m.sectors).filter(x=>sectors.includes(x));
   const skillOverlap=parseList(m.skills).filter(x=>skills.includes(x));
   const complementary=skills.filter(x=>!parseList(m.skills).includes(x));
   const score=common.length*4+skillOverlap.length*2+(m.country&&m.country===mine.country?1:0);
   const reason=common.length?'اهتمام مشترك: '+common.slice(0,2).join('، '):skillOverlap.length?'مهارة مشتركة: '+skillOverlap.slice(0,2).join('، '):'فرصة للتعارف المهني';
   return {id:m.user_id,name:m.name,professional_role:m.professional_role,country:m.country,score,reason,sectors:parseList(m.sectors),skills:parseList(m.skills),participation:parseList(m.participation)};
  }).filter(m=>m.score>0).sort((a,b)=>b.score-a.score||a.id-b.id).slice(0,12);
  const {results:groups}=await db.prepare(`SELECT id,name,description FROM community_groups
    WHERE moderation_status='visible' ORDER BY id DESC LIMIT 80`).all();
  const matchedGroups=groups.map(g=>({...g,reason:sectors.find(s=>(g.name+' '+g.description).includes(s))||''})).filter(g=>g.reason).slice(0,8);
  const {results:projects}=await db.prepare(`SELECT id,title,summary,category,country,stage FROM development_projects
    WHERE status='published' AND owner_id<>? ORDER BY id DESC LIMIT 80`).bind(uid).all();
  const matches=projects.filter(p=>sectors.includes(p.category)).slice(0,8).map(p=>({...p,reason:'مجال اهتمامك: '+p.category}));
  return json({enabled:true,people,groups:matchedGroups,projects:matches,method:'مطابقة قواعد مع اهتمامات معلنة'});
 }
 if(path==='/api/network/relations'&&method==='GET'){
  const {results}=await db.prepare(`SELECT r.id,r.initiator_id,r.recipient_id,r.purpose,r.reason,r.status,r.next_step,r.due_date,
    r.outcome,r.evidence_url,r.created_at,r.updated_at,a.name AS initiator,b.name AS recipient
    FROM network_relations r JOIN users a ON a.id=r.initiator_id JOIN users b ON b.id=r.recipient_id
    WHERE r.initiator_id=? OR r.recipient_id=? ORDER BY r.id DESC LIMIT 100`).bind(uid,uid).all();
  return json({relations:results});
 }
 if(path==='/api/network/relations'&&method==='POST'){
  await enforceLimit(db,'network-invite',uid,8,86400);
  const d=await parseBody(request),recipient=Number(d.recipient_id),purpose=clean(d.purpose,250);
  if(!Number.isSafeInteger(recipient)||recipient<1||recipient===uid)bad('اختر عضواً مختلفاً.');
  if(purpose.length<12)bad('حدد غرضاً واضحاً للتعارف (12 حرفاً على الأقل).');
  const [me,target]=await Promise.all([
   db.prepare('SELECT network_discovery FROM member_preferences WHERE user_id=?').bind(uid).first(),
   db.prepare(`SELECT p.user_id FROM member_preferences p JOIN users u ON u.id=p.user_id
     WHERE p.user_id=? AND p.network_discovery=1 AND p.profile_visibility='members'
     AND u.account_status='active'`).bind(recipient).first()
  ]);
  if(!me?.network_discovery||!target)throw new ApiError(403,'التعارف المهني غير متاح إلا للأعضاء الذين فعّلوا الاقتراحات.');
  const existing=await db.prepare(`SELECT id FROM network_relations WHERE
   ((initiator_id=? AND recipient_id=?) OR (initiator_id=? AND recipient_id=?))
   AND status IN ('pending','accepted','working') LIMIT 1`).bind(uid,recipient,recipient,uid).first();
  if(existing)throw new ApiError(409,'هناك طلب تعارف أو علاقة قائمة بين العضوين.');
  const row=await db.prepare(`INSERT INTO network_relations(initiator_id,recipient_id,purpose,reason)
   VALUES(?,?,?,?) RETURNING id`).bind(uid,recipient,purpose,'طلب تعارف مهني أرسله العضو').first();
  await db.prepare('INSERT INTO network_relation_events(relation_id,actor_id,action,note) VALUES(?,?,?,?)').bind(row.id,uid,'request',purpose).run();
  return json({id:row.id,status:'pending'},201);
 }
 const match=path.match(/^\/api\/network\/relations\/(\d+)$/);
 if(match&&method==='PATCH'){
  await enforceLimit(db,'network-update',uid,35,3600);
  const id=Number(match[1]),d=await parseBody(request),action=d.action;
  const r=await db.prepare('SELECT * FROM network_relations WHERE id=? AND (initiator_id=? OR recipient_id=?)').bind(id,uid,uid).first();
  if(!r)throw new ApiError(404,'العلاقة غير متاحة.');
  const receiver=uid===r.recipient_id;
  let status=r.status,next=r.next_step,due=r.due_date,outcome=r.outcome,evidence=r.evidence_url;
  if(action==='accept'||action==='reject'){
   if(!receiver||r.status!=='pending')throw new ApiError(403,'قرار قبول الطلب أو رفضه مخصص للعضو المدعو.');
   status=action==='accept'?'accepted':'rejected';
  }else if(action==='close'){
   if(!['accepted','working'].includes(r.status)&&!(r.status==='pending'&&uid===r.initiator_id))bad('لا يمكن إغلاق هذه العلاقة.');
   status='closed';
  }else if(action==='plan'){
   if(!['accepted','working'].includes(r.status))bad('يجب قبول التعارف أولاً.');
   next=clean(d.next_step,220);due=d.due_date||null;
   if(next.length<6||(due&&!validDate(due)))bad('حدد خطوة تنفيذ وتاريخاً صالحاً عند إدخاله.');
   status='working';
  }else if(action==='result'){
   if(r.status!=='working')bad('سجل خطوة تنفيذ قبل إدخال النتيجة.');
   outcome=clean(d.outcome,1000);evidence=safeHttps(d.evidence_url);
   if(outcome.length<20||evidence===null)bad('أدخل وصف نتيجة واضحاً ورابط دليل HTTPS عند توفره.');
   status='completed'; // A self-reported result, not independent verification.
  }else bad('الإجراء غير معروف.');
  const note=action==='result'?outcome:action==='plan'?next:action;
  const result=await db.prepare(`UPDATE network_relations SET status=?,next_step=?,due_date=?,outcome=?,evidence_url=?,
   updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=? AND status=?`).bind(status,next,due,outcome,evidence,id,r.status).run();
  if(!result.meta.changes)throw new ApiError(409,'تغيرت حالة العلاقة؛ حدّث الصفحة.');
  await db.prepare('INSERT INTO network_relation_events(relation_id,actor_id,action,note) VALUES(?,?,?,?)').bind(id,uid,action,note).run();
  return json({ok:true,status});
 }
 if(path==='/api/network/admin/overview'&&method==='GET'){
  if(user.role!=='admin')throw new ApiError(403,'هذه المؤشرات مخصصة للإدارة.');
  const [members,relations,projects]=await Promise.all([
   db.prepare('SELECT COUNT(*) AS count FROM member_preferences WHERE network_discovery=1').first(),
   db.prepare(`SELECT COUNT(*) AS total,
     SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) AS pending,
     SUM(CASE WHEN status='accepted' THEN 1 ELSE 0 END) AS accepted,
     SUM(CASE WHEN status='working' THEN 1 ELSE 0 END) AS working,
     SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) AS completed,
     SUM(CASE WHEN status='closed' OR status='rejected' THEN 1 ELSE 0 END) AS closed
     FROM network_relations`).first(),
   db.prepare("SELECT COUNT(*) AS count FROM development_projects WHERE status='published'").first()
  ]);
  return json({members:members.count,relations,projects:projects.count,note:'النتائج المعلنة ذاتية وليست نتائج معتمدة من جهة مستقلة.'});
 }
 return null;
}

// Moderated development needs and consent-based cooperation across public communities.
const trim=(v,n)=>typeof v==='string'?v.trim().slice(0,n):'';
const dateValid=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&!Number.isNaN(Date.parse(x+'T12:00:00Z'))&&new Date(x+'T12:00:00Z').toISOString().startsWith(x);
const sectors=new Set(['التعليم','البيئة','المجتمع','الاقتصاد','الصحة','الإغاثة','البنية التحتية','المياه','الطاقة','التقنية','أخرى']);
export async function communityNeedsRoute(request,db,user,{json,parseBody,requireUser,ApiError,enforceLimit}){
 const url=new URL(request.url),path=url.pathname,method=request.method;
 if(!path.startsWith('/api/needs/')&&!path.startsWith('/api/partnerships/'))return null;
 const bad=s=>{throw new ApiError(400,s)},deny=s=>{throw new ApiError(403,s)};
 const log=async(type,id,action,detail='')=>db.prepare('INSERT INTO development_work_audit(actor_id,action,item_type,item_id,detail) VALUES(?,?,?,?,?)').bind(user.id,action,type,id,trim(detail,500)).run();
 if(path==='/api/needs/list'&&method==='GET'){
  const category=trim(url.searchParams.get('category'),40);
  const {results}=await db.prepare(`SELECT n.id,n.title,n.description,n.category,n.country,n.city,n.required_skills,n.urgency,n.deadline,
    n.project_id,n.created_at,u.name AS owner FROM development_needs n JOIN users u ON u.id=n.owner_id
    WHERE n.status='published' AND u.account_status='active' AND (n.deadline IS NULL OR n.deadline>=date('now'))
    AND (?='' OR n.category=?) ORDER BY n.id DESC LIMIT 120`).bind(category,category).all();
  return json({needs:results});
 }
 requireUser(user);const uid=user.id;
 if(path==='/api/needs/mine'&&method==='GET'){
  const {results}=await db.prepare('SELECT * FROM development_needs WHERE owner_id=? ORDER BY id DESC LIMIT 100').bind(uid).all();
  return json({needs:results});
 }
 if(path==='/api/needs/create'&&method==='POST'){
  await enforceLimit(db,'needs-create',uid,10,86400);
  const d=await parseBody(request),title=trim(d.title,150),description=trim(d.description,1500),project=Number(d.project_id||0)||null,deadline=d.deadline||null;
  if(title.length<5||description.length<25||!sectors.has(d.category)||!['normal','high'].includes(d.urgency)||deadline&&!dateValid(deadline)||deadline&&deadline<new Date().toISOString().slice(0,10))bad('تحقق من وصف الاحتياج والمجال والأولوية والتاريخ.');
  if(project){
   const owned=await db.prepare("SELECT id FROM development_projects WHERE id=? AND owner_id=? AND status='published'").bind(project,uid).first();
   if(!owned)deny('يمكن ربط الاحتياج بمشروع منشور تملكه فقط.');
  }
  const r=await db.prepare(`INSERT INTO development_needs(owner_id,project_id,title,description,category,country,city,required_skills,urgency,deadline)
    VALUES(?,?,?,?,?,?,?,?,?,?) RETURNING id`).bind(uid,project,title,description,d.category,trim(d.country,80),trim(d.city,80),trim(d.required_skills,500),d.urgency,deadline).first();
  await log('need',r.id,'submit');return json({id:r.id,status:'pending'},201);
 }
 const close=path.match(/^\/api\/needs\/(\d+)\/close$/);
 if(close&&method==='PATCH'){
  const id=Number(close[1]),changed=await db.prepare("UPDATE development_needs SET status='closed' WHERE id=? AND owner_id=? AND status='published'").bind(id,uid).run();
  if(!changed.meta.changes)throw new ApiError(404,'الاحتياج غير متاح للإغلاق.');
  await log('need',id,'close');return json({ok:true});
 }
 if(path==='/api/needs/admin/queue'&&method==='GET'){
  if(user.role!=='admin')deny('هذه المهمة للإدارة.');
  const {results}=await db.prepare(`SELECT n.id,n.title,n.description,n.category,n.country,n.urgency,u.name AS owner
  FROM development_needs n JOIN users u ON u.id=n.owner_id WHERE n.status='pending' ORDER BY n.id LIMIT 100`).all();
  return json({needs:results});
 }
 const review=path.match(/^\/api\/needs\/admin\/(\d+)$/);
 if(review&&method==='PATCH'){
  if(user.role!=='admin')deny('هذه المهمة للإدارة.');
  await enforceLimit(db,'needs-review',uid,75,3600);
  const id=Number(review[1]),d=await parseBody(request),note=trim(d.note,500);
  if(!['published','rejected'].includes(d.status)||note.length<12)bad('أدخل قراراً مبرراً.');
  const res=await db.prepare("UPDATE development_needs SET status=?,reviewed_by=?,reviewed_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=? AND status='pending'").bind(d.status,uid,id).run();
  if(!res.meta.changes)throw new ApiError(404,'الاحتياج غير متاح للمراجعة.');
  await log('need',id,d.status,note);return json({ok:true});
 }
 if(path==='/api/partnerships/groups'&&method==='GET'){
  const {results}=await db.prepare("SELECT id,name FROM community_groups WHERE moderation_status='visible' ORDER BY id DESC LIMIT 100").all();
  return json({groups:results});
 }
 if(path==='/api/partnerships/mine'&&method==='GET'){
  const {results}=await db.prepare(`SELECT c.id,c.from_group_id,c.to_group_id,c.purpose,c.status,c.created_at,a.name AS from_name,b.name AS to_name,
   a.owner_id AS from_owner,b.owner_id AS to_owner FROM community_partnerships c
   JOIN community_groups a ON a.id=c.from_group_id JOIN community_groups b ON b.id=c.to_group_id
   WHERE a.owner_id=? OR b.owner_id=? ORDER BY c.id DESC LIMIT 100`).bind(uid,uid).all();
  return json({partnerships:results});
 }
 if(path==='/api/partnerships/create'&&method==='POST'){
  await enforceLimit(db,'partnerships-request',uid,10,86400);
  const d=await parseBody(request),from=Number(d.from_group_id),to=Number(d.to_group_id),purpose=trim(d.purpose,450);
  if(!Number.isSafeInteger(from)||!Number.isSafeInteger(to)||from<1||to<1||from===to||purpose.length<15)bad('اختر مجموعتين مختلفتين واكتب غرض التعاون.');
  const [a,b]=await Promise.all([
   db.prepare("SELECT owner_id FROM community_groups WHERE id=? AND moderation_status='visible'").bind(from).first(),
   db.prepare("SELECT owner_id FROM community_groups WHERE id=? AND moderation_status='visible'").bind(to).first()
  ]);
  if(!a||!b||a.owner_id!==uid||a.owner_id===b.owner_id)deny('لا يمكنك طلب تعاون إلا من مجموعة تديرها مع مجموعة أخرى لها مسؤول مختلف.');
  const existing=await db.prepare(`SELECT id FROM community_partnerships WHERE
   ((from_group_id=? AND to_group_id=?) OR (from_group_id=? AND to_group_id=?)) AND status IN ('pending','approved')`).bind(from,to,to,from).first();
  if(existing)throw new ApiError(409,'يوجد بالفعل طلب تعاون أو ارتباط قائم بين هاتين المجموعتين.');
  const r=await db.prepare('INSERT INTO community_partnerships(from_group_id,to_group_id,initiator_id,purpose) VALUES(?,?,?,?) RETURNING id').bind(from,to,uid,purpose).first();
  await log('partnership',r.id,'request');return json({id:r.id,status:'pending'},201);
 }
 const decision=path.match(/^\/api\/partnerships\/(\d+)$/);
 if(decision&&method==='PATCH'){
  const id=Number(decision[1]),d=await parseBody(request);
  const p=await db.prepare(`SELECT c.*,a.owner_id AS from_owner,b.owner_id AS to_owner FROM community_partnerships c
   JOIN community_groups a ON a.id=c.from_group_id JOIN community_groups b ON b.id=c.to_group_id WHERE c.id=?`).bind(id).first();
  if(!p)throw new ApiError(404,'طلب التعاون غير موجود.');
  let status;
  if(['approved','rejected'].includes(d.status)){
   if(p.to_owner!==uid||p.status!=='pending')deny('قبول أو رفض التعاون مخصص لمسؤول المجموعة المدعوة.');
   status=d.status;
  }else if(d.status==='closed'){
   if(![p.from_owner,p.to_owner].includes(uid)||p.status!=='approved')deny('الإغلاق متاح لمسؤولي المجموعتين بعد الموافقة.');
   status='closed';
  }else bad('إجراء غير معروف.');
  await db.prepare("UPDATE community_partnerships SET status=?,decided_by=?,decided_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?").bind(status,uid,id).run();
  await log('partnership',id,status);return json({ok:true,status});
 }
 return null;
}

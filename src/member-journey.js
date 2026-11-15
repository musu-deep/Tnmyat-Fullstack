// Member-centered services: server-enforced ownership for all private data.
const sectors=['التعليم','البيئة','المجتمع','الاقتصاد','الصحة','الإغاثة','البنية التحتية','المياه','الطاقة','التقنية'];
const checkDate=(s)=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().startsWith(s);
const clamp=(s,n)=>typeof s==='string'?s.trim().slice(0,n):'';
const verifyUrl=(s)=>{if(!s)return '';try{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password&&u.href.length<=1200?u.href:null;}catch{return null;}};
const selectPreferences="SELECT professional_role,organization,country,city,goal,sectors,news_enabled,onboarding_complete FROM member_preferences WHERE user_id=?";
function response(json,data,status=200){return json(data,status);}
export async function memberJourneyRoute(request,db,user,h){
 const {json,parseBody,ApiError,requireUser,enforceLimit}=h;
 const url=new URL(request.url),path=url.pathname,method=request.method;
 if(!path.startsWith('/api/journey/'))return null;
 requireUser(user);
 const uid=user.id;
 const idOf=(regex)=>{const match=path.match(regex);if(!match)return null;const id=Number(match[1]);if(!Number.isSafeInteger(id)||id<1)throw new ApiError(400,'معرف غير صالح');return id;};
 const fail=(msg)=>{throw new ApiError(400,msg);};
 const prefs=async()=>{const r=await db.prepare(selectPreferences).bind(uid).first();return r?{...r,sectors:JSON.parse(r.sectors),news_enabled:Boolean(r.news_enabled),onboarding_complete:Boolean(r.onboarding_complete)}:{professional_role:'',organization:'',country:'',city:'',goal:'',sectors:[],news_enabled:true,onboarding_complete:false};};
 if(path==='/api/journey/preferences'){
  if(method==='GET')return response(json,{preferences:await prefs()});
  if(method==='PATCH'){
   const d=await parseBody(request);
   if(!Array.isArray(d.sectors)||d.sectors.length>10||d.sectors.some(x=>!sectors.includes(x)))fail('اختر مجالات اهتمام معروفة.');
   const values=[clamp(d.professional_role,80),clamp(d.organization,120),clamp(d.country,80),clamp(d.city,80),clamp(d.goal,400),JSON.stringify([...new Set(d.sectors)]),d.news_enabled===false?0:1,d.onboarding_complete===true?1:0];
   await db.prepare(`INSERT INTO member_preferences(user_id,professional_role,organization,country,city,goal,sectors,news_enabled,onboarding_complete) VALUES(?,?,?,?,?,?,?,?,?)
    ON CONFLICT(user_id) DO UPDATE SET professional_role=excluded.professional_role,organization=excluded.organization,country=excluded.country,city=excluded.city,goal=excluded.goal,sectors=excluded.sectors,news_enabled=excluded.news_enabled,onboarding_complete=excluded.onboarding_complete,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')`).bind(uid,...values).run();
   return response(json,{preferences:await prefs()});
  }
 }
 if(path==='/api/journey/alerts'&&method==='GET'){
  const {results}=await db.prepare(`SELECT id,title,event_date FROM member_calendar
    WHERE user_id=? AND event_date BETWEEN date('now') AND date('now','+14 days')
    ORDER BY event_date ASC,id ASC LIMIT 30`).bind(uid).all();
  return response(json,{alerts:results.map(x=>({type:'calendar',title:x.title,date:x.event_date,url:'/my-calendar'}))});
 }
 if(path==='/api/journey/dashboard'&&method==='GET'){
  const [pref,posts,relations,calendar,goals,impact,saves]=await Promise.all([
   prefs(),
   db.prepare('SELECT COUNT(*) AS n FROM posts WHERE author_id=? AND moderation_status=\'visible\'').bind(uid).first(),
   db.prepare('SELECT COUNT(*) AS n FROM follows WHERE follower=?').bind(uid).first(),
   db.prepare('SELECT COUNT(*) AS n FROM member_calendar WHERE user_id=?').bind(uid).first(),
   db.prepare("SELECT COUNT(*) AS n FROM member_goals WHERE user_id=? AND status='active'").bind(uid).first(),
   db.prepare('SELECT COUNT(*) AS n,COALESCE(SUM(beneficiaries),0) AS beneficiaries FROM member_impact WHERE user_id=?').bind(uid).first(),
   db.prepare('SELECT COUNT(*) AS n FROM member_map_saves WHERE user_id=?').bind(uid).first()
  ]);
  return response(json,{preferences:pref,summary:{posts:posts.n,following:relations.n,calendar:calendar.n,goals:goals.n,impact:impact.n,beneficiaries:impact.beneficiaries,saved_projects:saves.n}});
 }
 if(path==='/api/journey/calendar'){
  if(method==='GET'){
   const {results}=await db.prepare("SELECT id,title,event_date,note,event_id FROM member_calendar WHERE user_id=? ORDER BY event_date ASC,id DESC LIMIT 300").bind(uid).all();
   return response(json,{items:results});
  }
  if(method==='POST'){
   await enforceLimit(db,'member-calendar',uid,80,3600);
   const d=await parseBody(request),title=clamp(d.title,160),day=d.event_date;
   if(title.length<3||!checkDate(day))fail('أدخل عنواناً وتاريخاً صحيحين.');
   const eventId=d.event_id?Number(d.event_id):null;
   if(eventId){
    const event=await db.prepare("SELECT id FROM development_events WHERE id=? AND status='published'").bind(eventId).first();
    if(!event)throw new ApiError(404,'الفعالية غير متاحة');
   }
   try{
    const row=await db.prepare('INSERT INTO member_calendar(user_id,title,event_date,note,event_id) VALUES(?,?,?,?,?) RETURNING id').bind(uid,title,day,clamp(d.note,500),eventId).first();
    return response(json,{id:row.id},201);
   }catch(e){if(/UNIQUE/.test(String(e)))throw new ApiError(409,'الفعالية محفوظة في تقويمك.');throw e;}
  }
 }
 let id=idOf(/^\/api\/journey\/calendar\/(\d+)$/);
 if(id&&method==='DELETE'){
  const result=await db.prepare('DELETE FROM member_calendar WHERE id=? AND user_id=?').bind(id,uid).run();
  if(!result.meta.changes)throw new ApiError(404,'الموعد غير موجود');
  return response(json,{ok:true});
 }
 if(path==='/api/journey/map'){
  if(method==='GET'){
   const {results}=await db.prepare(`SELECT p.id,p.title,p.summary,p.category,p.country,p.city,p.latitude,p.longitude,p.stage,
    p.entity_name,p.beneficiaries FROM member_map_saves s JOIN development_projects p ON p.id=s.project_id
    WHERE s.user_id=? AND p.status='published' ORDER BY s.created_at DESC LIMIT 200`).bind(uid).all();
   return response(json,{projects:results});
  }
 }
 id=idOf(/^\/api\/journey\/map\/(\d+)$/);
 if(id&&method==='PUT'){
  const d=await parseBody(request);if(typeof d.saved!=='boolean')fail('قيمة الحفظ غير صالحة');
  if(d.saved){
   const row=await db.prepare("SELECT id FROM development_projects WHERE id=? AND status='published'").bind(id).first();
   if(!row)throw new ApiError(404,'المشروع غير منشور');
   await db.prepare('INSERT INTO member_map_saves(user_id,project_id) VALUES(?,?) ON CONFLICT DO NOTHING').bind(uid,id).run();
  }else await db.prepare('DELETE FROM member_map_saves WHERE user_id=? AND project_id=?').bind(uid,id).run();
  return response(json,{ok:true});
 }
 if(path==='/api/journey/goals'){
  if(method==='GET'){
   const {results}=await db.prepare('SELECT id,title,description,status,created_at FROM member_goals WHERE user_id=? ORDER BY id DESC LIMIT 100').bind(uid).all();
   return response(json,{goals:results});
  }
  if(method==='POST'){
   await enforceLimit(db,'member-goals',uid,30,3600);
   const d=await parseBody(request),title=clamp(d.title,160);
   if(title.length<3)fail('عنوان الهدف قصير');
   const row=await db.prepare('INSERT INTO member_goals(user_id,title,description) VALUES(?,?,?) RETURNING id').bind(uid,title,clamp(d.description,1000)).first();
   return response(json,{id:row.id},201);
  }
 }
 id=idOf(/^\/api\/journey\/goals\/(\d+)$/);
 if(id&&method==='PATCH'){
  const d=await parseBody(request);if(!['active','completed'].includes(d.status))fail('الحالة غير صحيحة');
  const result=await db.prepare('UPDATE member_goals SET status=? WHERE id=? AND user_id=?').bind(d.status,id,uid).run();
  if(!result.meta.changes)throw new ApiError(404,'الهدف غير موجود');
  return response(json,{ok:true});
 }
 if(path==='/api/journey/impact'){
  if(method==='GET'){
   const {results}=await db.prepare('SELECT id,title,outcome,evidence_url,beneficiaries,verification,created_at FROM member_impact WHERE user_id=? ORDER BY id DESC LIMIT 100').bind(uid).all();
   return response(json,{reports:results});
  }
  if(method==='POST'){
   await enforceLimit(db,'member-impact',uid,25,3600);
   const d=await parseBody(request),title=clamp(d.title,160),outcome=clamp(d.outcome,1600),link=verifyUrl(d.evidence_url);
   const beneficiaries=Number(d.beneficiaries||0);
   if(title.length<4||outcome.length<15||link===null||!Number.isSafeInteger(beneficiaries)||beneficiaries<0||beneficiaries>1e9)fail('أكمل بيانات الإنجاز والأدلة بصورة صحيحة');
   const goalId=d.goal_id?Number(d.goal_id):null;
   if(goalId){const goal=await db.prepare('SELECT id FROM member_goals WHERE id=? AND user_id=?').bind(goalId,uid).first();if(!goal)throw new ApiError(404,'الهدف غير متاح');}
   const row=await db.prepare('INSERT INTO member_impact(user_id,goal_id,title,outcome,evidence_url,beneficiaries) VALUES(?,?,?,?,?,?) RETURNING id').bind(uid,goalId,title,outcome,link,beneficiaries).first();
   return response(json,{id:row.id,verification:'self_reported'},201);
  }
 }
 if(path==='/api/journey/news-links'){
  if(method==='GET'){
   const {results}=await db.prepare('SELECT id,headline,source_url,note,category,created_at FROM member_news_links WHERE user_id=? ORDER BY id DESC LIMIT 150').bind(uid).all();
   return response(json,{links:results});
  }
  if(method==='POST'){
   await enforceLimit(db,'member-news-links',uid,40,3600);
   const d=await parseBody(request),headline=clamp(d.headline,180),note=clamp(d.note,500),category=clamp(d.category,60),link=verifyUrl(d.source_url);
   if(headline.length<5||!link||!sectors.includes(category))fail('أدخل عنواناً مناسباً ورابط HTTPS صحيحاً ومجالاً معتمداً.');
   const row=await db.prepare('INSERT INTO member_news_links(user_id,headline,source_url,note,category) VALUES(?,?,?,?,?) RETURNING id').bind(uid,headline,link,note,category).first();
   return response(json,{id:row.id},201);
  }
 }
 let newsLinkId=idOf(/^\/api\/journey\/news-links\/(\d+)$/);
 if(newsLinkId&&method==='DELETE'){
  const deleted=await db.prepare('DELETE FROM member_news_links WHERE id=? AND user_id=?').bind(newsLinkId,uid).run();
  if(!deleted.meta.changes)throw new ApiError(404,'الرابط غير موجود');
  return response(json,{ok:true});
 }
 if(path==='/api/journey/news'&&method==='GET'){
  const pref=await prefs();
  if(!pref.news_enabled)return response(json,{news:[],disabled:true});
  const {results}=await db.prepare(`SELECT headline,source_name,source_url,category,published_at FROM (
    SELECT headline,source_name,source_url,category,published_at FROM development_news WHERE status='published'
    UNION ALL
    SELECT COALESCE(NULLIF(p.title,''),substr(p.body,1,130)), 'مجتمع تنميات',
      '/post/'||p.id,p.topic,substr(f.endorsed_at,1,10)
    FROM featured_member_posts f JOIN posts p ON p.id=f.post_id JOIN users u ON u.id=p.author_id
    WHERE f.status='published' AND p.moderation_status='visible' AND u.account_status='active'
   ) ORDER BY published_at DESC LIMIT 75`).all();
  const terms=pref.sectors;
  const matched=terms.length?results.filter(x=>terms.some(t=>(x.category+' '+x.headline).includes(t))):results;
  const fallback=terms.length>0&&matched.length===0;
  return response(json,{news:(fallback?results:matched).slice(0,20),fallback});
 }
 if(path==='/api/journey/recommendations'&&method==='GET'){
  const pref=await prefs();
  const subjects=pref.sectors.filter(t=>['التعليم','البيئة','المجتمع','الاقتصاد'].includes(t));
  let posts=[];
  if(subjects.length){
   const qs=subjects.map(()=>'?').join(',');
   const {results}=await db.prepare(`SELECT p.id,p.title,p.topic,u.name AS author,COUNT(l.user_id) AS likes
     FROM posts p JOIN users u ON u.id=p.author_id LEFT JOIN likes l ON l.post_id=p.id
     WHERE p.moderation_status='visible' AND p.topic IN (${qs}) AND p.author_id<>? GROUP BY p.id
     ORDER BY likes DESC,p.id DESC LIMIT 8`).bind(...subjects,uid).all();posts=results;
  }
  const {results:groups}=await db.prepare(`SELECT id,name,description FROM community_groups WHERE moderation_status='visible' ORDER BY id DESC LIMIT 8`).all();
  return response(json,{posts,groups:groups.filter(g=>!pref.sectors.length||pref.sectors.some(t=>(g.name+' '+g.description).includes(t))).slice(0,5)});
 }
 if(path==='/api/journey/collaboration'&&method==='GET'){
  const {results}=await db.prepare(`SELECT p.id,p.title,p.stage,p.status,p.owner_id,c.status AS participation
    FROM development_projects p LEFT JOIN project_collaborators c ON c.project_id=p.id AND c.user_id=?
    WHERE p.owner_id=? OR (c.user_id=? AND p.status='published')
    ORDER BY p.id DESC LIMIT 100`).bind(uid,uid,uid).all();
  return response(json,{projects:results.map(p=>({...p,owner:p.owner_id===uid}))});
 }
 let m=path.match(/^\/api\/journey\/projects\/(\d+)\/join$/);
 if(m&&method==='POST'){
  const id=Number(m[1]);await enforceLimit(db,'project-join',uid,30,3600);
  const p=await db.prepare("SELECT id FROM development_projects WHERE id=? AND owner_id<>? AND status='published'").bind(id,uid).first();
  if(!p)throw new ApiError(404,'المشروع غير متاح لطلب المشاركة');
  await db.prepare("INSERT INTO project_collaborators(project_id,user_id) VALUES(?,?) ON CONFLICT(project_id,user_id) DO UPDATE SET status='pending',applied_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE status='rejected'").bind(id,uid).run();
  return response(json,{ok:true,status:'pending'});
 }
 m=path.match(/^\/api\/journey\/projects\/(\d+)\/work$/);
 if(m&&method==='GET'){
  const id=Number(m[1]);
  const p=await db.prepare('SELECT id,title,owner_id,status FROM development_projects WHERE id=?').bind(id).first();
  if(!p)throw new ApiError(404,'المشروع غير موجود');
  const mine=p.owner_id===uid,collab=mine?true:await db.prepare("SELECT 1 AS ok FROM project_collaborators WHERE project_id=? AND user_id=? AND status='approved'").bind(id,uid).first();
  if(!mine&&!collab)throw new ApiError(403,'المشروع غير متاح لك');
  const [{results:tasks},{results:members}]=await Promise.all([
   db.prepare('SELECT id,title,due_date,status,assigned_to FROM project_work_items WHERE project_id=? ORDER BY id DESC LIMIT 100').bind(id).all(),
   db.prepare(`SELECT c.user_id,u.name,c.status FROM project_collaborators c JOIN users u ON u.id=c.user_id WHERE c.project_id=? AND (c.status='approved' OR ?=1) ORDER BY c.applied_at DESC LIMIT 100`).bind(id,mine?1:0).all()
  ]);
  return response(json,{project:p,owner:mine,tasks,members});
 }
 m=path.match(/^\/api\/journey\/projects\/(\d+)\/members\/(\d+)$/);
 if(m&&method==='PATCH'){
  const [pid,member]=[Number(m[1]),Number(m[2])];
  const p=await db.prepare('SELECT owner_id FROM development_projects WHERE id=?').bind(pid).first();
  if(!p||p.owner_id!==uid)throw new ApiError(403,'الموافقة مخصصة لصاحب المشروع');
  const d=await parseBody(request);
  if(!['approved','rejected'].includes(d.status))fail('قرار غير صالح');
  const result=await db.prepare("UPDATE project_collaborators SET status=? WHERE project_id=? AND user_id=? AND status='pending'").bind(d.status,pid,member).run();
  if(!result.meta.changes)throw new ApiError(404,'طلب المشاركة غير متاح');
  return response(json,{ok:true});
 }
 m=path.match(/^\/api\/journey\/projects\/(\d+)\/tasks$/);
 if(m&&method==='POST'){
  const pid=Number(m[1]),d=await parseBody(request),title=clamp(d.title,160);
  const p=await db.prepare('SELECT owner_id FROM development_projects WHERE id=?').bind(pid).first();
  if(!p||p.owner_id!==uid)throw new ApiError(403,'إنشاء المهام مخصص لصاحب المشروع');
  if(title.length<3||(d.due_date&&!checkDate(d.due_date)))fail('العنوان أو تاريخ المهمة غير صحيح');
  const assigned=d.assigned_to?Number(d.assigned_to):null;
  if(assigned&&assigned!==uid){
   const member=await db.prepare("SELECT user_id FROM project_collaborators WHERE project_id=? AND user_id=? AND status='approved'").bind(pid,assigned).first();
   if(!member)fail('المكلَّف غير مشارك معتمد');
  }
  const row=await db.prepare('INSERT INTO project_work_items(project_id,title,due_date,assigned_to,created_by) VALUES(?,?,?,?,?) RETURNING id').bind(pid,title,d.due_date||null,assigned,uid).first();
  return response(json,{id:row.id},201);
 }
 m=path.match(/^\/api\/journey\/tasks\/(\d+)$/);
 if(m&&method==='PATCH'){
  const tid=Number(m[1]),d=await parseBody(request);
  if(!['open','done'].includes(d.status))fail('حالة المهمة غير صالحة');
  const task=await db.prepare(`SELECT t.id,t.assigned_to,p.owner_id,p.id AS project_id FROM project_work_items t JOIN development_projects p ON p.id=t.project_id WHERE t.id=?`).bind(tid).first();
  if(!task)throw new ApiError(404,'المهمة غير موجودة');
  const owner=task.owner_id===uid;
  if(!owner&&task.assigned_to!==uid)throw new ApiError(403,'لا تملك صلاحية تعديل المهمة');
  if(!owner){
   const ok=await db.prepare("SELECT 1 AS ok FROM project_collaborators WHERE project_id=? AND user_id=? AND status='approved'").bind(task.project_id,uid).first();
   if(!ok)throw new ApiError(403,'المشاركة غير معتمدة');
  }
  await db.prepare('UPDATE project_work_items SET status=? WHERE id=?').bind(d.status,tid).run();
  return response(json,{ok:true});
 }
 return null;
}

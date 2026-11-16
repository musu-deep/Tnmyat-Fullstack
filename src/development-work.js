// Moderated opportunities, verified organization affiliations, group consent and project outcomes.
const clip=(x,n)=>typeof x==='string'?x.trim().slice(0,n):'';
const dateOK=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&!Number.isNaN(Date.parse(x+'T12:00:00Z'))&&new Date(x+'T12:00:00Z').toISOString().startsWith(x);
const urlOK=x=>{if(!x)return '';try{const u=new URL(x);return u.protocol==='https:'&&!u.username&&!u.password&&u.href.length<=1200?u.href:null}catch{return null}};
const categories=new Set(['التعليم','البيئة','المجتمع','الاقتصاد','الصحة','الإغاثة','البنية التحتية','المياه','الطاقة','التقنية','أخرى']);
export async function developmentWorkRoute(request,db,user,{json,parseBody,requireUser,ApiError,enforceLimit}){
 const url=new URL(request.url),path=url.pathname,method=request.method;
 if(!path.startsWith('/api/work/'))return null;
 const bad=x=>{throw new ApiError(400,x)},forbidden=x=>{throw new ApiError(403,x)};
 const idFrom=regex=>{const m=path.match(regex);if(!m)return null;const n=Number(m[1]);if(!Number.isSafeInteger(n)||n<1)bad('معرف غير صالح');return n};
 const requireAdmin=()=>{if(user?.role!=='admin')forbidden('هذه المهمة للإدارة فقط')};
 const audit=async(action,type,id,detail='')=>db.prepare('INSERT INTO development_work_audit(actor_id,action,item_type,item_id,detail) VALUES(?,?,?,?,?)').bind(user.id,action,type,id,clip(detail,500)).run();
 if(path==='/api/work/opportunities'&&method==='GET'){
  const topic=clip(url.searchParams.get('category'),40),mode=clip(url.searchParams.get('mode'),20);
  const {results}=await db.prepare(`SELECT o.id,o.title,o.description,o.category,o.country,o.city,o.mode,o.arrangement,o.requirements,o.hours_estimate,
    o.capacity,o.deadline,o.project_id,o.need_id,o.created_at,u.name AS owner
    FROM development_opportunities o JOIN users u ON u.id=o.owner_id
    WHERE o.status='published' AND u.account_status='active'
     AND (o.deadline IS NULL OR o.deadline>=date('now'))
     AND (?='' OR o.category=?) AND (?='' OR o.mode=?)
    ORDER BY o.id DESC LIMIT 120`).bind(topic,topic,mode,mode).all();
  return json({opportunities:results});
 }
 if(path==='/api/work/organizations'&&method==='GET'){
  const {results}=await db.prepare(`SELECT id,name,country,description,website FROM development_organizations WHERE status='verified' ORDER BY id DESC LIMIT 100`).all();
  return json({organizations:results});
 }
 requireUser(user);const uid=user.id;
 if(path==='/api/work/mine'&&method==='GET'){
  const [orgs,opps,applications,projects]=await Promise.all([
   db.prepare('SELECT * FROM development_organizations WHERE owner_id=? ORDER BY id DESC LIMIT 80').bind(uid).all(),
   db.prepare('SELECT * FROM development_opportunities WHERE owner_id=? ORDER BY id DESC LIMIT 100').bind(uid).all(),
   db.prepare(`SELECT a.*,o.title,o.arrangement FROM opportunity_applications a JOIN development_opportunities o ON o.id=a.opportunity_id WHERE a.applicant_id=? ORDER BY a.created_at DESC LIMIT 100`).bind(uid).all(),
   db.prepare('SELECT id,title,status FROM development_projects WHERE owner_id=? ORDER BY id DESC LIMIT 100').bind(uid).all()
  ]);
  return json({organizations:orgs.results,opportunities:opps.results,applications:applications.results,projects:projects.results});
 }
 if(path==='/api/work/organizations'&&method==='POST'){
  await enforceLimit(db,'work-org',uid,5,86400);
  const d=await parseBody(request),name=clip(d.name,140),country=clip(d.country,80),description=clip(d.description,700),website=urlOK(d.website);
  if(name.length<4||!country||website===null)bad('أدخل اسم جهة واضحاً ودولة ورابطاً صحيحاً إن وجد.');
  const r=await db.prepare('INSERT INTO development_organizations(owner_id,name,country,description,website) VALUES(?,?,?,?,?) RETURNING id').bind(uid,name,country,description,website).first();
  await audit('create','organization',r.id);
  return json({id:r.id,status:'unverified'},201);
 }
 if(path==='/api/work/opportunities'&&method==='POST'){
  await enforceLimit(db,'work-opportunity',uid,8,86400);
  const d=await parseBody(request),title=clip(d.title,150),description=clip(d.description,1500),category=d.category,
   arrangement=d.arrangement,mode=d.mode,requirements=clip(d.requirements,650),deadline=d.deadline||null;
  const hours=Number(d.hours_estimate||0),capacity=Number(d.capacity||1),project=Number(d.project_id||0)||null,need=Number(d.need_id||0)||null;
  if(title.length<5||description.length<25||!categories.has(category)||!['remote','onsite','hybrid'].includes(mode)||
   !['volunteer','paid'].includes(arrangement)||!Number.isSafeInteger(hours)||hours<0||hours>10000||
   !Number.isSafeInteger(capacity)||capacity<1||capacity>100000||(deadline&&!dateOK(deadline)))bad('تحقق من بيانات الفرصة ومدتها وشروط المشاركة.');
  if(deadline&&deadline<new Date().toISOString().slice(0,10))bad('موعد انتهاء التقديم يجب ألا يكون في الماضي.');
  if(project){
   const owner=await db.prepare("SELECT id FROM development_projects WHERE id=? AND owner_id=? AND status='published'").bind(project,uid).first();
   if(!owner)forbidden('يمكن ربط الفرصة بمشروع منشور تملكه فقط.');
  }
  if(need){
   const owned=await db.prepare("SELECT id FROM development_needs WHERE id=? AND owner_id=? AND status='published'").bind(need,uid).first();
   if(!owned)forbidden('يمكن ربط الفرصة باحتياج منشور تملكه فقط.');
  }
  const r=await db.prepare(`INSERT INTO development_opportunities(owner_id,project_id,title,description,category,country,city,mode,arrangement,requirements,hours_estimate,capacity,deadline,need_id)
  VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id`).bind(uid,project,title,description,category,clip(d.country,80),clip(d.city,80),mode,arrangement,requirements,hours,capacity,deadline,need).first();
  await audit('submit','opportunity',r.id);
  return json({id:r.id,status:'pending'},201);
 }
 const applyId=idFrom(/^\/api\/work\/opportunities\/(\d+)\/apply$/);
 if(applyId&&method==='POST'){
  await enforceLimit(db,'work-apply',uid,12,86400);
  const d=await parseBody(request),note=clip(d.note,650);
  const o=await db.prepare(`SELECT id FROM development_opportunities WHERE id=? AND status='published' AND owner_id<>?
     AND (deadline IS NULL OR deadline>=date('now'))`).bind(applyId,uid).first();
  if(!o)throw new ApiError(404,'هذه الفرصة غير متاحة للتقديم.');
  const existing=await db.prepare('SELECT status FROM opportunity_applications WHERE opportunity_id=? AND applicant_id=?').bind(applyId,uid).first();
  if(existing)throw new ApiError(409,'لديك طلب سابق على هذه الفرصة.');
  const pending=await db.prepare("SELECT COUNT(*) AS n FROM opportunity_applications WHERE opportunity_id=? AND status='accepted'").bind(applyId).first();
  const cap=await db.prepare('SELECT capacity FROM development_opportunities WHERE id=?').bind(applyId).first();
  if(pending.n>=cap.capacity)throw new ApiError(409,'اكتملت المقاعد المتاحة لهذه الفرصة.');
  await db.prepare('INSERT INTO opportunity_applications(opportunity_id,applicant_id,note) VALUES(?,?,?)').bind(applyId,uid,note).run();
  await audit('apply','opportunity',applyId);
  return json({ok:true,status:'pending'},201);
 }
 const applicationId=idFrom(/^\/api\/work\/opportunities\/(\d+)\/applications$/);
 if(applicationId&&method==='GET'){
  const o=await db.prepare('SELECT owner_id FROM development_opportunities WHERE id=?').bind(applicationId).first();
  if(!o||o.owner_id!==uid)forbidden('طلبات الفرصة لصاحبها فقط.');
  const {results}=await db.prepare(`SELECT a.applicant_id,u.name,a.note,a.status,a.applicant_confirmed,a.owner_confirmed,a.created_at
   FROM opportunity_applications a JOIN users u ON u.id=a.applicant_id WHERE a.opportunity_id=? ORDER BY a.created_at DESC LIMIT 120`).bind(applicationId).all();
  return json({applications:results});
 }
 const applicationUpdate=path.match(/^\/api\/work\/opportunities\/(\d+)\/applications\/(\d+)$/);
 if(applicationUpdate&&method==='PATCH'){
  const oid=Number(applicationUpdate[1]),applicant=Number(applicationUpdate[2]),d=await parseBody(request);
  const o=await db.prepare('SELECT owner_id,capacity,status FROM development_opportunities WHERE id=?').bind(oid).first();
  const a=await db.prepare('SELECT status,applicant_confirmed,owner_confirmed FROM opportunity_applications WHERE opportunity_id=? AND applicant_id=?').bind(oid,applicant).first();
  if(!o||!a)throw new ApiError(404,'طلب غير موجود.');
  if(d.action==='accept'||d.action==='reject'){
   if(o.owner_id!==uid||o.status!=='published')forbidden('قرار المشاركة لصاحب الفرصة المنشورة فقط.');
   if(a.status!=='pending')bad('هذا الطلب ليس قيد المراجعة.');
   if(d.action==='accept'){
    const n=await db.prepare("SELECT COUNT(*) AS n FROM opportunity_applications WHERE opportunity_id=? AND status IN ('accepted','completed')").bind(oid).first();
    if(n.n>=o.capacity)throw new ApiError(409,'اكتمل العدد المسموح.');
   }
   await db.prepare("UPDATE opportunity_applications SET status=?,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE opportunity_id=? AND applicant_id=?").bind(d.action==='accept'?'accepted':'rejected',oid,applicant).run();
  }else if(d.action==='confirm'){
   if(a.status!=='accepted')bad('يجب قبول طلب المشاركة قبل تأكيد الإنجاز.');
   const isOwner=o.owner_id===uid,isApplicant=applicant===uid;
   if(!isOwner&&!isApplicant)forbidden('تأكيد المشاركة للطرفين فقط.');
   await db.prepare(`UPDATE opportunity_applications SET
    applicant_confirmed=CASE WHEN ?=1 THEN 1 ELSE applicant_confirmed END,
    owner_confirmed=CASE WHEN ?=1 THEN 1 ELSE owner_confirmed END,
    status=CASE WHEN (?=1 OR applicant_confirmed=1) AND (?=1 OR owner_confirmed=1) THEN 'completed' ELSE status END,
    updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE opportunity_id=? AND applicant_id=?`).bind(isApplicant?1:0,isOwner?1:0,isApplicant?1:0,isOwner?1:0,oid,applicant).run();
  }else if(d.action==='withdraw'){
   if(applicant!==uid||!['pending','accepted'].includes(a.status))forbidden('يمكن سحب طلب المشاركة الخاص بك فقط.');
   await db.prepare("UPDATE opportunity_applications SET status='withdrawn' WHERE opportunity_id=? AND applicant_id=?").bind(oid,uid).run();
  }else bad('إجراء غير صالح.');
  await audit(d.action,'application',oid,String(applicant));
  return json({ok:true});
 }
 const linkOrg=idFrom(/^\/api\/work\/projects\/(\d+)\/organizations$/);
 if(linkOrg&&method==='POST'){
  const d=await parseBody(request),orgId=Number(d.organization_id);
  if(!Number.isSafeInteger(orgId)||orgId<1)bad('اختر الجهة.');
  const p=await db.prepare('SELECT owner_id FROM development_projects WHERE id=?').bind(linkOrg).first();
  const o=await db.prepare("SELECT owner_id FROM development_organizations WHERE id=? AND status='verified'").bind(orgId).first();
  if(!p||!o||p.owner_id!==uid||o.owner_id!==uid)forbidden('ربط المشروع متاح فقط بجهة متحققة يمثلها صاحب المشروع نفسه.');
  await db.prepare('INSERT OR IGNORE INTO project_organization_links(project_id,organization_id,created_by) VALUES(?,?,?)').bind(linkOrg,orgId,uid).run();
  await audit('link','project_organization',linkOrg,String(orgId));return json({ok:true});
 }
 const linkGroup=idFrom(/^\/api\/work\/projects\/(\d+)\/groups$/);
 if(linkGroup&&method==='POST'){
  const d=await parseBody(request),group=Number(d.group_id);
  if(!Number.isSafeInteger(group)||group<1)bad('اختر المجموعة.');
  const p=await db.prepare('SELECT owner_id FROM development_projects WHERE id=?').bind(linkGroup).first();
  const g=await db.prepare("SELECT owner_id FROM community_groups WHERE id=? AND moderation_status='visible'").bind(group).first();
  if(!p||!g||p.owner_id!==uid)forbidden('ربط المجموعة يتطلب أن تكون صاحب المشروع.');
  await db.prepare(`INSERT INTO project_group_links(project_id,group_id,requested_by,status)
  VALUES(?,?,?,'pending') ON CONFLICT(project_id,group_id) DO UPDATE SET status='pending',requested_by=excluded.requested_by,decided_by=NULL,decided_at=NULL
  WHERE status='rejected'`).bind(linkGroup,group,uid).run();
  await audit('request','project_group',linkGroup,String(group));
  return json({ok:true,status:'pending'});
 }
 if(path==='/api/work/group-links'&&method==='GET'){
  const {results}=await db.prepare(`SELECT l.project_id,l.group_id,l.status,p.title AS project_title,g.name AS group_name,g.owner_id AS group_owner_id,p.owner_id AS project_owner_id
   FROM project_group_links l JOIN community_groups g ON g.id=l.group_id JOIN development_projects p ON p.id=l.project_id
   WHERE g.owner_id=? OR p.owner_id=? ORDER BY l.created_at DESC LIMIT 120`).bind(uid,uid).all();
  return json({links:results});
 }
 const groupDecision=path.match(/^\/api\/work\/group-links\/(\d+)\/(\d+)$/);
 if(groupDecision&&method==='PATCH'){
  const [pid,gid]=groupDecision.slice(1).map(Number),d=await parseBody(request);
  if(!['approved','rejected'].includes(d.status))bad('القرار غير صالح.');
  const g=await db.prepare('SELECT owner_id FROM community_groups WHERE id=?').bind(gid).first();
  if(!g||g.owner_id!==uid)forbidden('قرار ربط المجموعة لصاحب المجموعة.');
  const changed=await db.prepare(`UPDATE project_group_links SET status=?,decided_by=?,decided_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
   WHERE project_id=? AND group_id=? AND status='pending'`).bind(d.status,uid,pid,gid).run();
  if(!changed.meta.changes)throw new ApiError(404,'لا يوجد طلب ربط قيد المراجعة.');
  await audit(d.status,'project_group',pid,String(gid));return json({ok:true});
 }
 const projectLinks=idFrom(/^\/api\/work\/projects\/(\d+)\/links$/);
 if(projectLinks&&method==='GET'){
  const p=await db.prepare('SELECT id,owner_id,status FROM development_projects WHERE id=?').bind(projectLinks).first();
  if(!p||p.status!=='published'&&p.owner_id!==uid)throw new ApiError(404,'المشروع غير متاح.');
  const [orgs,groups]=await Promise.all([
   db.prepare(`SELECT o.id,o.name,o.country FROM project_organization_links l JOIN development_organizations o ON o.id=l.organization_id
     WHERE l.project_id=? AND o.status='verified'`).bind(projectLinks).all(),
   db.prepare(`SELECT g.id,g.name FROM project_group_links l JOIN community_groups g ON g.id=l.group_id
     WHERE l.project_id=? AND l.status='approved' AND g.moderation_status='visible'`).bind(projectLinks).all()
  ]);
  return json({organizations:orgs.results,groups:groups.results});
 }
 const outcomes=idFrom(/^\/api\/work\/projects\/(\d+)\/outcomes$/);
 if(outcomes&&method==='GET'){
  const p=await db.prepare('SELECT owner_id,status FROM development_projects WHERE id=?').bind(outcomes).first();
  if(!p||p.status!=='published'&&p.owner_id!==uid)throw new ApiError(404,'المشروع غير متاح.');
  const {results}=await db.prepare(`SELECT id,metric,unit,baseline,observed,measured_on,context,evidence_url,verification,reviewed_at
    FROM project_outcomes WHERE project_id=? ORDER BY measured_on DESC,id DESC LIMIT 100`).bind(outcomes).all();
  return json({outcomes:results});
 }
 if(outcomes&&method==='POST'){
  await enforceLimit(db,'work-outcomes',uid,30,86400);
  const p=await db.prepare('SELECT owner_id FROM development_projects WHERE id=?').bind(outcomes).first();
  if(!p||p.owner_id!==uid)forbidden('تسجيل النتائج لصاحب المشروع.');
  const d=await parseBody(request),metric=clip(d.metric,140),unit=clip(d.unit,60),context=clip(d.context,1000),
    baseline=Number(d.baseline),observed=Number(d.observed),evidence=urlOK(d.evidence_url);
  if(metric.length<5||unit.length<2||!Number.isFinite(baseline)||!Number.isFinite(observed)||
   Math.abs(baseline)>1e12||Math.abs(observed)>1e12||!dateOK(d.measured_on)||evidence===null)bad('أدخل المؤشر ووحدته والقيمة الأساسية والفعلية وتاريخ القياس.');
  const row=await db.prepare(`INSERT INTO project_outcomes(project_id,created_by,metric,unit,baseline,observed,measured_on,context,evidence_url)
   VALUES(?,?,?,?,?,?,?,?,?) RETURNING id`).bind(outcomes,uid,metric,unit,baseline,observed,d.measured_on,context,evidence).first();
  await audit('create','outcome',row.id);return json({id:row.id,verification:'self_reported'},201);
 }
 if(path==='/api/work/admin/queue'&&method==='GET'){
  requireAdmin();
  const [orgs,opps,outcomes]=await Promise.all([
   db.prepare("SELECT o.id,o.name,o.country,o.description,o.website,u.name AS owner FROM development_organizations o JOIN users u ON u.id=o.owner_id WHERE o.status='unverified' ORDER BY o.id LIMIT 80").all(),
   db.prepare("SELECT o.id,o.title,o.description,o.requirements,o.category,o.country,o.mode,o.arrangement,o.capacity,o.deadline,u.name AS owner FROM development_opportunities o JOIN users u ON u.id=o.owner_id WHERE o.status='pending' ORDER BY o.id LIMIT 80").all(),
   db.prepare(`SELECT o.id,o.metric,o.baseline,o.observed,o.unit,o.context,o.evidence_url,o.measured_on,p.title AS project_title FROM project_outcomes o JOIN development_projects p ON p.id=o.project_id
    WHERE o.verification='self_reported' ORDER BY o.id LIMIT 80`).all()
  ]);return json({organizations:orgs.results,opportunities:opps.results,outcomes:outcomes.results});
 }
 const decision=path.match(/^\/api\/work\/admin\/(organizations|opportunities|outcomes)\/(\d+)$/);
 if(decision&&method==='PATCH'){
  requireAdmin();await enforceLimit(db,'work-admin',uid,100,3600);
  const kind=decision[1],id=Number(decision[2]),d=await parseBody(request),note=clip(d.note,600);
  if(note.length<12)bad('يرجى كتابة مبرر المراجعة.');
  let changed;
  if(kind==='organizations'){
   if(!['verified','rejected'].includes(d.status))bad('قرار غير صالح.');
   changed=await db.prepare("UPDATE development_organizations SET status=?,reviewed_by=?,reviewed_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=? AND status='unverified'").bind(d.status,uid,id).run();
  }else if(kind==='opportunities'){
   if(!['published','rejected'].includes(d.status))bad('قرار غير صالح.');
   changed=await db.prepare("UPDATE development_opportunities SET status=?,reviewed_by=?,reviewed_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=? AND status='pending'").bind(d.status,uid,id).run();
  }else{
   if(d.status!=='reviewed')bad('قرار غير صالح.');
   const o=await db.prepare("SELECT evidence_url FROM project_outcomes WHERE id=? AND verification='self_reported'").bind(id).first();
   if(!o?.evidence_url)bad('لا يمكن تأكيد مراجعة دليل غير مرفق.');
   changed=await db.prepare("UPDATE project_outcomes SET verification='reviewed',reviewed_by=?,reviewed_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),review_note=? WHERE id=? AND verification='self_reported'").bind(uid,note,id).run();
  }
  if(!changed.meta.changes)throw new ApiError(404,'البند غير متاح للمراجعة.');
  await audit(d.status,'admin_'+kind,id,note);return json({ok:true});
 }
 if(path==='/api/work/metrics'&&method==='GET'){
  requireAdmin();
  const [opps,apps,results,orgs]=await Promise.all([
   db.prepare("SELECT COUNT(*) AS n FROM development_opportunities WHERE status='published'").first(),
   db.prepare(`SELECT COUNT(*) AS n,SUM(status='accepted') AS accepted,SUM(status='completed') AS completed FROM opportunity_applications`).first(),
   db.prepare("SELECT COUNT(*) AS n,SUM(verification='reviewed') AS reviewed FROM project_outcomes").first(),
   db.prepare("SELECT COUNT(*) AS n FROM development_organizations WHERE status='verified'").first()
  ]);
  return json({opportunities:opps.n,applications:apps.n,accepted:apps.accepted||0,completed:apps.completed||0,
    outcomes:results.n,reviewed_outcomes:results.reviewed||0,verified_organizations:orgs.n,
    note:'إكمال مشاركة بتأكيد الطرفين ومراجعة الأدلة لا يساوي إثبات أثر مستقل.'});
 }
 return null;
}

const protectedEmails = new Set(['araakdevelopment@gmail.com', 'louiabdalla1@gmail.com']);
const targetTables = {post:'posts', comment:'comments',group:'community_groups',group_note:'group_notes'};
const allowedStates = {post:['visible','hidden'],comment:['visible','hidden'],group:['visible','hidden'],group_note:['visible','hidden']};

export async function governanceRoute(request, db, user, helpers) {
  const {json,parseBody,textField,ApiError,enforceLimit}=helpers;
  const url=new URL(request.url),path=url.pathname,method=request.method;
  const isAdmin=user?.role==='admin';
  const isAppeal=path==='/api/appeals' && method==='POST';
  const isReport=path==='/api/moderation/report' && method==='POST';
  if (!path.startsWith('/api/admin/') && !isAppeal && !isReport) return null;
  if (!user) throw new ApiError(401,'سجّل الدخول أولاً.');
  if (!isAdmin && !isAppeal && !isReport) throw new ApiError(403,'إدارة المجتمع مخصصة للمشرفين.');
  const audit=async(type,id,action,reason,details='')=>db.prepare('INSERT INTO moderation_actions(actor_id,target_type,target_id,action,reason,details) VALUES(?,?,?,?,?,?)').bind(user.id,type,id,action,reason,details).run();
  const readId=value=>{const id=Number(value);if(!Number.isSafeInteger(id)||id<1)throw new ApiError(400,'معرف غير صالح');return id;};
  if(isReport){
    await enforceLimit(db,'moderation-report',user.id,12,3600);
    const body=await parseBody(request),type=body.target_type,id=readId(body.target_id);
    if(!['post','comment','group','group_note','user'].includes(type))throw new ApiError(400,'نوع البلاغ غير صالح');
    const table=type==='user'?'users':targetTables[type];
    if(!await db.prepare('SELECT id FROM '+table+' WHERE id=?').bind(id).first())throw new ApiError(404,'العنصر غير موجود');
    const reason=textField(body.reason,8,1000,'سبب البلاغ');
    await db.prepare('INSERT INTO moderation_reports(reporter_id,target_type,target_id,reason) VALUES(?,?,?,?)').bind(user.id,type,id,reason).run();
    return json({ok:true},201);
  }
  if(isAppeal){
    await enforceLimit(db,'moderation-appeal',user.id,6,86400);
    const body=await parseBody(request),actionId=readId(body.action_id);
    const action=await db.prepare('SELECT target_type,target_id FROM moderation_actions WHERE id=?').bind(actionId).first();
    if(!action)throw new ApiError(404,'القرار غير موجود');
    let owned=action.target_type==='user' && action.target_id===user.id;
    if(action.target_type==='post') owned=Boolean(await db.prepare('SELECT id FROM posts WHERE id=? AND author_id=?').bind(action.target_id,user.id).first());
    if(action.target_type==='comment') owned=Boolean(await db.prepare('SELECT id FROM comments WHERE id=? AND author_id=?').bind(action.target_id,user.id).first());
    if(action.target_type==='group') owned=Boolean(await db.prepare('SELECT id FROM community_groups WHERE id=? AND owner_id=?').bind(action.target_id,user.id).first());
    if(action.target_type==='group_note') owned=Boolean(await db.prepare('SELECT id FROM group_notes WHERE id=? AND user_id=?').bind(action.target_id,user.id).first());
    if(!owned)throw new ApiError(403,'لا يمكن الاعتراض على إجراء يخص عضواً آخر');
    const existing=await db.prepare("SELECT id FROM moderation_appeals WHERE action_id=? AND appellant_id=? AND status IN ('open','reviewing')").bind(actionId,user.id).first();
    if(existing)throw new ApiError(409,'يوجد اعتراض مفتوح لهذا الإجراء');
    const statement=textField(body.statement,10,2000,'الاعتراض');
    await db.prepare('INSERT INTO moderation_appeals(appellant_id,action_id,statement) VALUES(?,?,?)').bind(user.id,actionId,statement).run();
    return json({ok:true},201);
  }
  if(path==='/api/admin/overview' && method==='GET'){
    const counts=await db.prepare(`SELECT (SELECT count(*) FROM users WHERE password_hash IS NOT NULL) AS members,
      (SELECT count(*) FROM users WHERE account_status!='active') AS restricted,
      (SELECT count(*) FROM posts WHERE moderation_status='visible') AS posts,
      (SELECT count(*) FROM moderation_reports WHERE status IN ('open','reviewing')) AS reports,
      (SELECT count(*) FROM moderation_appeals WHERE status IN ('open','reviewing')) AS appeals,
      (SELECT count(*) FROM community_groups WHERE moderation_status='visible') AS groups`).first();
    return json({counts});
  }
  if(path==='/api/admin/users' && method==='GET'){
    const q=(url.searchParams.get('q')||'').slice(0,100),page=Math.min(1000,Math.max(1,Number(url.searchParams.get('page'))||1));
    const {results}=await db.prepare("SELECT id,email,name,role,account_status,status_reason,status_until,created_at FROM users WHERE password_hash IS NOT NULL AND (instr(lower(email),lower(?))>0 OR instr(lower(name),lower(?))>0) ORDER BY id DESC LIMIT 30 OFFSET ?").bind(q,q,(page-1)*30).all();
    return json({users:results});
  }
  if(path==='/api/admin/posts' && method==='GET'){
    const {results}=await db.prepare('SELECT p.id,p.title,substr(p.body,1,170) AS excerpt,p.moderation_status,p.created_at,u.name AS author FROM posts p JOIN users u ON u.id=p.author_id ORDER BY p.id DESC LIMIT 80').all();return json({posts:results});
  }
  if(path==='/api/admin/groups' && method==='GET'){
    const {results}=await db.prepare('SELECT g.id,g.name,g.description,g.moderation_status,u.name AS owner FROM community_groups g JOIN users u ON u.id=g.owner_id ORDER BY g.id DESC LIMIT 80').all();return json({groups:results});
  }
  if(path==='/api/admin/reports' && method==='GET'){
    const {results}=await db.prepare(`SELECT r.*,u.name AS reporter FROM moderation_reports r JOIN users u ON u.id=r.reporter_id ORDER BY CASE r.status WHEN 'open' THEN 0 WHEN 'reviewing' THEN 1 ELSE 2 END,r.id DESC LIMIT 100`).all();return json({reports:results});
  }
  if(path==='/api/admin/appeals' && method==='GET'){
    const {results}=await db.prepare('SELECT a.*,u.name AS appellant FROM moderation_appeals a JOIN users u ON u.id=a.appellant_id ORDER BY a.id DESC LIMIT 100').all();return json({appeals:results});
  }
  if(path==='/api/admin/audit' && method==='GET'){
    const {results}=await db.prepare('SELECT a.*,u.name AS actor FROM moderation_actions a JOIN users u ON u.id=a.actor_id ORDER BY a.id DESC LIMIT 100').all();return json({actions:results});
  }
  const member=path.match(/^\/api\/admin\/users\/(\d+)$/);
  if(member && method==='PATCH'){
    const id=readId(member[1]),target=await db.prepare('SELECT id,email,role,account_status FROM users WHERE id=?').bind(id).first();
    if(!target)throw new ApiError(404,'العضو غير موجود');
    const body=await parseBody(request), status=body.status;
    if(!['active','suspended','banned'].includes(status))throw new ApiError(400,'حالة الحساب غير صالحة');
    if(target.id===user.id || protectedEmails.has(target.email.toLowerCase()) || target.role==='admin')throw new ApiError(403,'لا يمكن تعديل حساب إداري بهذا الإجراء');
    const reason=textField(body.reason,8,500,'مبرر الإجراء');
    let until=null;
    if(status==='suspended'){
      const days=Number(body.days);
      if(!Number.isInteger(days)||days<1||days>365)throw new ApiError(400,'حدد فترة إيقاف بين يوم و365 يوماً');
      until=Math.floor(Date.now()/1000)+days*86400;
    }
    await db.batch([
      db.prepare('UPDATE users SET account_status=?,status_reason=?,status_until=? WHERE id=?').bind(status,reason,until,id),
      db.prepare('DELETE FROM sessions WHERE user_id=?').bind(id),
      db.prepare('INSERT INTO moderation_actions(actor_id,target_type,target_id,action,reason,details) VALUES(?,?,?,?,?,?)').bind(user.id,'user',id,status,reason,until?JSON.stringify({until}):'')
    ]);
    return json({ok:true});
  }
  const object=path.match(/^\/api\/admin\/(posts|comments|groups|group-notes)\/(\d+)$/);
  if(object && method==='PATCH'){
    const mapping={posts:'post',comments:'comment',groups:'group','group-notes':'group_note'};
    const type=mapping[object[1]],id=readId(object[2]),body=await parseBody(request);
    if(!allowedStates[type].includes(body.status))throw new ApiError(400,'حالة المحتوى غير صالحة');
    const reason=textField(body.reason,8,500,'مبرر الإجراء'),table=targetTables[type];
    const found=await db.prepare('SELECT id FROM '+table+' WHERE id=?').bind(id).first();
    if(!found)throw new ApiError(404,'العنصر غير موجود');
    await db.batch([
      db.prepare('UPDATE '+table+' SET moderation_status=? WHERE id=?').bind(body.status,id),
      db.prepare('INSERT INTO moderation_actions(actor_id,target_type,target_id,action,reason) VALUES(?,?,?,?,?)').bind(user.id,type,id,body.status,reason)
    ]);
    return json({ok:true});
  }
  const report=path.match(/^\/api\/admin\/reports\/(\d+)$/);
  if(report&&method==='PATCH'){
    const id=readId(report[1]),body=await parseBody(request),status=body.status;
    if(!['reviewing','resolved','dismissed'].includes(status))throw new ApiError(400,'حالة البلاغ غير صالحة');
    const reason=textField(body.reason,8,500,'سبب القرار');
    const result=await db.prepare('SELECT id FROM moderation_reports WHERE id=?').bind(id).first();
    if(!result)throw new ApiError(404,'البلاغ غير موجود');
    await db.batch([
      db.prepare("UPDATE moderation_reports SET status=?,assigned_to=?,resolution=?,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?").bind(status,user.id,reason,id),
      db.prepare('INSERT INTO moderation_actions(actor_id,target_type,target_id,action,reason) VALUES(?,?,?,?,?)').bind(user.id,'report',id,status,reason)
    ]);return json({ok:true});
  }
  const appeal=path.match(/^\/api\/admin\/appeals\/(\d+)$/);
  if(appeal&&method==='PATCH'){
    const id=readId(appeal[1]),body=await parseBody(request),status=body.status;
    if(!['reviewing','upheld','overturned'].includes(status))throw new ApiError(400,'حالة الاعتراض غير صالحة');
    const reason=textField(body.reason,8,500,'سبب القرار');
    const row=await db.prepare('SELECT a.*,m.actor_id,m.action,m.target_type,m.target_id FROM moderation_appeals a JOIN moderation_actions m ON m.id=a.action_id WHERE a.id=?').bind(id).first();
    if(!row)throw new ApiError(404,'الاعتراض غير موجود');
    if(row.actor_id===user.id && status!=='reviewing')throw new ApiError(403,'لا يجوز مراجعة القرار الذي اتخذته بنفسك');
    if(status==='overturned')throw new ApiError(400,'إلغاء الإجراء يتطلب معالجة مستقلة للقرار الأصلي؛ لا يمكن اعتماد الإلغاء دون تنفيذه');
    await db.batch([
      db.prepare('UPDATE moderation_appeals SET status=?,reviewer_id=?,decision_reason=? WHERE id=?').bind(status,user.id,reason,id),
      db.prepare('INSERT INTO moderation_actions(actor_id,target_type,target_id,action,reason) VALUES(?,?,?,?,?)').bind(user.id,'appeal',id,status,reason)
    ]);return json({ok:true});
  }
  throw new ApiError(404,'لم نعثر على إجراء إداري مطابق');
}

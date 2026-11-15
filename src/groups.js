export async function groupRoute(request, db, user, helpers) {
  const {json, parseBody, textField, requireUser, ApiError, enforceLimit} = helpers;
  const path = new URL(request.url).pathname;
  const method = request.method;
  const groupSelect = `SELECT g.*,u.name AS owner,
    CASE WHEN u.avatar_version IS NOT NULL THEN '/api/media/avatar/'||u.id||'?v='||u.avatar_version END AS owner_avatar,
    CASE WHEN u.cover_version IS NOT NULL THEN '/api/media/cover/'||u.id||'?v='||u.cover_version END AS owner_cover,
    1+(SELECT COUNT(*) FROM group_members m WHERE m.group_id=g.id AND m.status!='blocked') AS member_count,
    CASE WHEN g.owner_id=? THEN 'owner' ELSE
    (SELECT m.status FROM group_members m WHERE m.group_id=g.id AND m.user_id=?) END AS membership
    FROM community_groups g JOIN users u ON u.id=g.owner_id`;
  const viewer = user?.id ?? 0;
  if (path==='/api/groups') {
    if (method==='GET') {
      const {results}=await db.prepare(groupSelect+" WHERE (g.moderation_status='visible' OR ?=1) ORDER BY g.id DESC").bind(viewer,viewer,user?.role==='admin'?1:0).all();
      return json({groups:results});
    }
    if (method==='POST') {
      requireUser(user);
      const data=await parseBody(request);
      const name=textField(data.name,2,80,'اسم المجموعة');
      const description=textField(data.description,3,500,'تعريف المجموعة');
      await enforceLimit(db,'create-group',viewer,5,3600);
      const row=await db.prepare('INSERT INTO community_groups(name,description,owner_id) VALUES(?,?,?) RETURNING id').bind(name,description,viewer).first();
      return json({id:row.id},201);
    }
  }
  const match=path.match(/^\/api\/groups\/(\d+)(?:\/(join|leave|notes|members)(?:\/(\d+))?)?$/);
  if (!match) throw new ApiError(404,'المجموعة غير موجودة');
  const [,id,action,target]=match;
  const group=await db.prepare(groupSelect+' WHERE g.id=?').bind(viewer,viewer,id).first();
  if (!group || (group.moderation_status!=='visible' && user?.role!=='admin')) throw new ApiError(404,'المجموعة غير موجودة');
  const manager=group.membership==='owner'||group.membership==='moderator';
  const isMember=manager||group.membership==='member';
  if (!action && method==='GET') {
    const before=Number(new URL(request.url).searchParams.get('before') || Number.MAX_SAFE_INTEGER);
    if(!Number.isSafeInteger(before)||before<1)throw new ApiError(400,'مؤشر صفحة غير صالح');
    const {results:notes}=await db.prepare(`SELECT n.*,u.name AS author,
      CASE WHEN u.avatar_version IS NOT NULL THEN '/api/media/avatar/'||u.id||'?v='||u.avatar_version END AS author_avatar,
      CASE WHEN u.cover_version IS NOT NULL THEN '/api/media/cover/'||u.id||'?v='||u.cover_version END AS author_cover FROM group_notes n JOIN users u ON u.id=n.user_id
      WHERE n.group_id=? AND n.id<? AND (n.moderation_status='visible' OR ?=1) ORDER BY n.id DESC LIMIT 31`).bind(id,before,user?.role==='admin'?1:0).all();
    const members=manager?(await db.prepare(`SELECT m.user_id,u.name,m.status,
      CASE WHEN u.avatar_version IS NOT NULL THEN '/api/media/avatar/'||u.id||'?v='||u.avatar_version END AS avatar,
      CASE WHEN u.cover_version IS NOT NULL THEN '/api/media/cover/'||u.id||'?v='||u.cover_version END AS cover FROM group_members m
      JOIN users u ON u.id=m.user_id WHERE m.group_id=? ORDER BY u.name`).bind(id).all()).results:[];
    return json({group,notes:notes.slice(0,30),hasMore:notes.length>30,members});
  }
  requireUser(user);
  if(action==='join' && !target && method==='POST') {
    if(group.membership==='blocked')throw new ApiError(403,'الانضمام موقوف لهذا الحساب في المجموعة');
    if(!isMember)await db.prepare("INSERT INTO group_members VALUES(?,?,'member') ON CONFLICT DO NOTHING").bind(id,viewer).run();
  } else if(action==='leave' && !target && method==='POST') {
    if(group.membership==='owner')throw new ApiError(400,'يتولى منشئ المجموعة إدارة عضويتها');
    await db.prepare("DELETE FROM group_members WHERE group_id=? AND user_id=? AND status!='blocked'").bind(id,viewer).run();
  } else if(action==='notes' && !target && method==='POST') {
    if(!isMember) throw new ApiError(403,'انضم إلى المجموعة للمشاركة');
    const {body}=await parseBody(request);
    await enforceLimit(db,'group-note',viewer,60,3600);
    const result=await db.prepare(`INSERT INTO group_notes(group_id,user_id,body) SELECT ?,?,?
      WHERE EXISTS(SELECT 1 FROM community_groups WHERE id=? AND owner_id=?)
      OR EXISTS(SELECT 1 FROM group_members WHERE group_id=? AND user_id=? AND status!='blocked')`)
      .bind(id,viewer,textField(body,1,3000,'المشاركة'),id,viewer,id,viewer).run();
    if(!result.meta.changes) throw new ApiError(403,'تعذرت المشاركة بهذه العضوية');
  } else if(action==='notes' && target && method==='DELETE'){
    await db.prepare(`DELETE FROM group_notes WHERE id=? AND group_id=? AND (user_id=? OR EXISTS
      (SELECT 1 FROM community_groups WHERE id=? AND owner_id=?) OR EXISTS
      (SELECT 1 FROM group_members WHERE group_id=? AND user_id=? AND status='moderator'))`).bind(target,id,viewer,id,viewer,id,viewer).run();
  } else if(action==='members' && target && method==='PUT'){
    if(group.membership!=='owner')throw new ApiError(403,'هذه العملية لمالك المجموعة');
    const {status}=await parseBody(request);
    if(!['blocked','moderator','member'].includes(status))throw new ApiError(400,'صلاحية غير صالحة');
    const result=await db.prepare('UPDATE group_members SET status=? WHERE group_id=? AND user_id=?').bind(status,id,target).run();
    if(!result.meta.changes)throw new ApiError(404,'العضو غير موجود');
  } else throw new ApiError(405,'العملية غير متاحة');
  return json({ok:true});
}

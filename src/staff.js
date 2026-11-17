const PERMISSIONS=['needs_review','opportunities_review','organizations_review','outcomes_review','content_moderation'];
export const staffPermissionKeys=PERMISSIONS;
export async function staffCapabilities(db,user){
 if(!user)return [];
 if(user.role==='admin')return [...PERMISSIONS,'staff_manage'];
 const [rows,manager]=await Promise.all([
  db.prepare('SELECT permission FROM staff_permissions WHERE user_id=? ORDER BY permission').bind(user.id).all(),
  db.prepare('SELECT 1 AS allowed FROM staff_assignment_managers WHERE user_id=?').bind(user.id).first()
 ]);
 const permissions=rows.results.map(r=>r.permission).filter(p=>PERMISSIONS.includes(p));
 if(manager)permissions.push('staff_manage');
 return permissions;
}
export async function canReview(db,user,permission){
 if(!user||!PERMISSIONS.includes(permission))return false;
 if(user.role==='admin')return true;
 return Boolean(await db.prepare('SELECT 1 FROM staff_permissions WHERE user_id=? AND permission=?').bind(user.id,permission).first());
}
export async function staffRoute(request,db,user,{json,parseBody,ApiError,enforceLimit}){
 const url=new URL(request.url),path=url.pathname,method=request.method;
 if(!path.startsWith('/api/staff/'))return null;
 if(!user)throw new ApiError(401,'سجّل الدخول أولاً.');
 if(path==='/api/staff/me'&&method==='GET')return json({role:user.role,permissions:await staffCapabilities(db,user)});
 const isAdmin=user.role==='admin';
 const delegatedManager=!isAdmin&&Boolean(await db.prepare('SELECT 1 FROM staff_assignment_managers WHERE user_id=?').bind(user.id).first());
 if(!isAdmin&&!delegatedManager)throw new ApiError(403,'تعيين المشرفين متاح لمدير المنصة أو المفوض المعتمد فقط.');
 const isAssignmentManager=async(id)=>Boolean(await db.prepare('SELECT 1 FROM staff_assignment_managers WHERE user_id=?').bind(id).first());
 if(path==='/api/staff/managers'&&method==='GET'){
  if(!isAdmin)throw new ApiError(403,'إدارة تفويض مشرفي التوزيع للمدير العام فقط.');
  const {results}=await db.prepare('SELECT m.user_id,u.name,u.email,m.granted_at FROM staff_assignment_managers m JOIN users u ON u.id=m.user_id ORDER BY m.granted_at DESC').all();
  return json({managers:results});
 }
 const managerTarget=path.match(/^\/api\/staff\/managers\/(\d+)$/);
 if(managerTarget&&method==='PATCH'){
  if(!isAdmin)throw new ApiError(403,'منح صلاحية توزيع المهام للمدير العام فقط.');
  await enforceLimit(db,'staff-managers',user.id,25,3600);
  const id=Number(managerTarget[1]),body=await parseBody(request);
  if(typeof body.enabled!=='boolean')throw new ApiError(400,'حالة التفويض غير صحيحة.');
  const reason=typeof body.reason==='string'?body.reason.trim().slice(0,500):'';
  if(reason.length<12)throw new ApiError(400,'دوّن سبب منح أو سحب التفويض.');
  const target=await db.prepare('SELECT id,role,account_status FROM users WHERE id=? AND password_hash IS NOT NULL').bind(id).first();
  if(!target)throw new ApiError(404,'الحساب غير موجود.');
  if(target.role==='admin'||target.id===user.id||(body.enabled&&target.account_status!=='active'))throw new ApiError(403,'لا يمكن منح صلاحية إدارة التفويض لهذا الحساب.');
  const statements=[body.enabled
   ?db.prepare('INSERT INTO staff_assignment_managers(user_id,granted_by) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET granted_by=excluded.granted_by,granted_at=strftime(\'%Y-%m-%dT%H:%M:%fZ\',\'now\')').bind(id,user.id)
   :db.prepare('DELETE FROM staff_assignment_managers WHERE user_id=?').bind(id),
   db.prepare('INSERT INTO moderation_actions(actor_id,target_type,target_id,action,reason) VALUES(?,?,?,?,?)').bind(user.id,'user',id,body.enabled?'staff_manager_grant':'staff_manager_revoke',reason)];
  await db.batch(statements);
  return json({ok:true,enabled:body.enabled});
 }

 if(path==='/api/staff/users'&&method==='GET'){
  const q=(url.searchParams.get('q')||'').trim().slice(0,100);
  if(q.length<2)throw new ApiError(400,'أدخل حرفين على الأقل للبحث.');
  const {results}=await db.prepare(`SELECT id,name,email,role,account_status FROM users
   WHERE password_hash IS NOT NULL AND (instr(lower(name),lower(?))>0 OR instr(lower(email),lower(?))>0)
   ORDER BY id DESC LIMIT 20`).bind(q,q).all();
  const users=[];
  for(const u of results)users.push({...u,permissions:await staffCapabilities(db,u)});
  return json({users});
 }
 if(path==='/api/staff/overview'&&method==='GET'){
  const {results}=await db.prepare(`SELECT p.user_id,p.permission,u.name,u.email,u.account_status
   FROM staff_permissions p JOIN users u ON u.id=p.user_id
   WHERE u.role!='admin' ORDER BY p.permission,u.name,p.user_id LIMIT 2000`).all();
  const scopes=Object.fromEntries(PERMISSIONS.map(permission=>[permission,results.filter(r=>r.permission===permission).map(r=>({id:r.user_id,name:r.name,email:r.email,active:r.account_status==='active'}))]));
  return json({scopes,permission_count:PERMISSIONS.length});
 }
 if(path==='/api/staff/assignments'&&method==='PATCH'){
  await enforceLimit(db,'staff-reassign',user.id,30,3600);
  const d=await parseBody(request);
  if(!['replace_scope','consolidate','clear_all'].includes(d.mode))throw new ApiError(400,'اختر إجراءً معتمداً لتوزيع صلاحيات الإشراف.');
  const reason=typeof d.reason==='string'?d.reason.trim().slice(0,500):'';
  if(reason.length<12)throw new ApiError(400,'دوّن سبباً واضحاً للتوزيع أو سحب الصلاحيات.');
  let permission=null,targets=[];
  if(d.mode==='replace_scope'){
   permission=d.permission;
   if(!PERMISSIONS.includes(permission))throw new ApiError(400,'هذه الصلاحية غير معتمدة.');
   if(!Array.isArray(d.user_ids)||d.user_ids.length>150||new Set(d.user_ids).size!==d.user_ids.length||d.user_ids.some(id=>!Number.isSafeInteger(id)||id<1))throw new ApiError(400,'اختر قائمة مشرفين صالحة دون تكرار.');
   targets=d.user_ids;
  }else if(d.mode==='consolidate'){
   if(!Number.isSafeInteger(d.target_user_id)||d.target_user_id<1)throw new ApiError(400,'اختر مشرفاً واحداً لتجميع الصلاحيات.');
   targets=[d.target_user_id];
  }
  if(targets.length){
   if(delegatedManager){
    for(const targetId of targets)if(await isAssignmentManager(targetId))throw new ApiError(403,'لا يحق للمشرف المفوض تعديل صلاحيات مفوض آخر.');
   }
   const checked=await db.prepare(`SELECT id,role,account_status FROM users WHERE id IN (${targets.map(()=>'?').join(',')}) AND password_hash IS NOT NULL`).bind(...targets).all();
   if(checked.results.length!==targets.length||checked.results.some(t=>t.role==='admin'||t.account_status!=='active'||t.id===user.id))throw new ApiError(403,'لا يمكن إسناد المهمة إلا إلى حساب عضو نشط وغير إداري.');
  }
  if(delegatedManager){
   // Delegated supervisors may distribute work, but cannot alter peer delegation managers.
   const {results:peerAssignments}=await db.prepare(`SELECT p.user_id,p.permission FROM staff_permissions p
     JOIN staff_assignment_managers m ON m.user_id=p.user_id`).all();
   const changesPeer=peerAssignments.some(p=>d.mode!=='replace_scope'||p.permission===permission);
   if(changesPeer)throw new ApiError(403,'لا يحق للمشرف المفوض إعادة توزيع صلاحيات مشرف عام آخر؛ يلزم المدير العام.');
  }
  const previous=await db.prepare('SELECT user_id,permission FROM staff_permissions ORDER BY user_id,permission').all();
  const statements=[];
  if(d.mode==='replace_scope'){
   statements.push(db.prepare('DELETE FROM staff_permissions WHERE permission=?').bind(permission));
   for(const id of targets)statements.push(db.prepare('INSERT INTO staff_permissions(user_id,permission,granted_by) VALUES(?,?,?)').bind(id,permission,user.id));
  }else{
   statements.push(db.prepare('DELETE FROM staff_permissions'));
   if(d.mode==='consolidate')for(const p of PERMISSIONS)statements.push(db.prepare('INSERT INTO staff_permissions(user_id,permission,granted_by) VALUES(?,?,?)').bind(targets[0],p,user.id));
  }
  statements.push(db.prepare('INSERT INTO moderation_actions(actor_id,target_type,target_id,action,reason,details) VALUES(?,?,?,?,?,?)').bind(
   user.id,'user',targets[0]||user.id,'staff_assignment_'+d.mode,reason,JSON.stringify({permission,targets,previous:previous.results})
  ));
  await db.batch(statements);
  return json({ok:true,mode:d.mode,permission,assigned_users:targets});
 }
 const m=path.match(/^\/api\/staff\/users\/(\d+)\/permissions$/);
 if(m&&method==='PATCH'){
  await enforceLimit(db,'staff-permissions',user.id,45,3600);
  const id=Number(m[1]),d=await parseBody(request);
  const permissions=d.permissions;
  if(!Array.isArray(permissions)||permissions.length>PERMISSIONS.length||new Set(permissions).size!==permissions.length||permissions.some(p=>!PERMISSIONS.includes(p)))throw new ApiError(400,'اختر صلاحيات مراجعة معتمدة فقط.');
  const target=await db.prepare('SELECT id,role,account_status FROM users WHERE id=? AND password_hash IS NOT NULL').bind(id).first();
  if(!target)throw new ApiError(404,'العضو غير موجود.');
  if(delegatedManager&&await isAssignmentManager(id))throw new ApiError(403,'لا يحق للمشرف المفوض تعديل صلاحيات مفوض آخر.');
  if(target.role==='admin'||id===user.id)throw new ApiError(403,'لا يمكن تعديل صلاحيات المدير بهذا الإجراء.');
  if(target.account_status!=='active')throw new ApiError(403,'يجب تفعيل حساب العضو قبل منحه صلاحيات إشراف.');
  const before=await staffCapabilities(db,target);
  const next=new Set(permissions);
  const statements=[db.prepare('DELETE FROM staff_permissions WHERE user_id=?').bind(id)];
  for(const p of permissions)statements.push(db.prepare('INSERT INTO staff_permissions(user_id,permission,granted_by) VALUES(?,?,?)').bind(id,p,user.id));
  statements.push(db.prepare('INSERT INTO moderation_actions(actor_id,target_type,target_id,action,reason,details) VALUES(?,?,?,?,?,?)')
   .bind(user.id,'user',id,'staff_permissions',permissions.length?'تحديث صلاحيات الإشراف':'سحب صلاحيات الإشراف',JSON.stringify({before,after:permissions})));
  await db.batch(statements);
  return json({ok:true,permissions:[...next]});
 }
 return null;
}

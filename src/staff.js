const PERMISSIONS=['needs_review','opportunities_review','organizations_review','outcomes_review'];
export const staffPermissionKeys=PERMISSIONS;
export async function staffCapabilities(db,user){
 if(!user)return [];
 if(user.role==='admin')return [...PERMISSIONS];
 const rows=await db.prepare('SELECT permission FROM staff_permissions WHERE user_id=? ORDER BY permission').bind(user.id).all();
 return rows.results.map(r=>r.permission).filter(p=>PERMISSIONS.includes(p));
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
 if(user.role!=='admin')throw new ApiError(403,'تعيين المشرفين متاح لمدير المنصة فقط.');
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
 const m=path.match(/^\/api\/staff\/users\/(\d+)\/permissions$/);
 if(m&&method==='PATCH'){
  await enforceLimit(db,'staff-permissions',user.id,45,3600);
  const id=Number(m[1]),d=await parseBody(request);
  const permissions=d.permissions;
  if(!Array.isArray(permissions)||permissions.length>PERMISSIONS.length||new Set(permissions).size!==permissions.length||permissions.some(p=>!PERMISSIONS.includes(p)))throw new ApiError(400,'اختر صلاحيات مراجعة معتمدة فقط.');
  const target=await db.prepare('SELECT id,role,account_status FROM users WHERE id=? AND password_hash IS NOT NULL').bind(id).first();
  if(!target)throw new ApiError(404,'العضو غير موجود.');
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

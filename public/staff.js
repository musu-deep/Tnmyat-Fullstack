'use strict';
const STAFF_REVIEW_ITEMS=[
 {permission:'needs_review',title:'مراجعة الاحتياجات',description:'الاحتياجات المقدمة للنشر',href:'/needs-admin',icon:'◇'},
 {permission:'opportunities_review',title:'مراجعة الفرص',description:'الفرص والمشاركات الجديدة',href:'/work-admin',icon:'▦'},
 {permission:'organizations_review',title:'مراجعة الجهات',description:'الجهات التي تنتظر التحقق',href:'/work-admin',icon:'♧'},
 {permission:'outcomes_review',title:'مراجعة النتائج',description:'الأدلة والمؤشرات المسجلة',href:'/work-admin',icon:'◎'},
 {permission:'content_moderation',title:'إشراف المحتوى',description:'مراجعة المنشورات والمجموعات والبلاغات',href:'/admin',icon:'⚑'}
];
const staffAllowed=key=>Boolean(user&&(user.role==='admin'||(user.permissions||[]).includes(key)));
async function renderStaff(token){
 if(!user){go('/wall');return;}
 const permissions=Array.isArray(user.permissions)?user.permissions:[];
 if(user.role!=='admin'&&!permissions.length){go('/wall');return;}
 const isAdmin=user.role==='admin';
 const canAssign=isAdmin||permissions.includes('staff_manage');
 document.title='مركز الإشراف | تنميات';
 const sections=(isAdmin?[{title:'مركز إدارة المجتمع',description:'إدارة الأعضاء والمحتوى والبلاغات وسجل الإجراءات',href:'/admin',icon:'⚑'}]:[])
  .concat(STAFF_REVIEW_ITEMS.filter(item=>staffAllowed(item.permission)))
  .concat(isAdmin?[{title:'مراجعة الأثر',description:'نتائج العضوية والأدلة',href:'/impact-review',icon:'◎'},{title:'مؤشرات العلاقات',description:'مؤشرات التشابك المهني',href:'/network-admin',icon:'▤'}]:[]);
 const cards=sections.map(item=>'<a href="'+item.href+'" class="staffWorkCard"><span class="staffWorkIcon">'+item.icon+'</span><span><strong>'+item.title+'</strong><small>'+item.description+'</small></span><span aria-hidden="true">‹</span></a>').join('');
 main.innerHTML='<div class="staffWorkPage"><div class="staffWorkHeading"><span>مجتمع تنميات</span><h1>مركز الإشراف</h1><p>'+(isAdmin?'صلاحيات الإدارة العامة والمراجعة.':canAssign?'إدارة توزيع المهام وفق التفويض الممنوح.':'تظهر الأقسام التي مُنحت لك صلاحية مراجعتها فقط.')+'</p></div><div class="staffWorkGrid">'+cards+'</div>'+
 (canAssign?'<section class="staffGrants"><h2>صلاحيات المشرفين</h2><p>ابحث عن العضو بالاسم أو البريد، ثم اختر مهام المراجعة المسموحة له. يمكن تعديل الصلاحيات أو سحبها في أي وقت.</p>'+
 '<form id="staffSearchForm" class="staffSearch"><input name="q" minlength="2" required placeholder="اسم العضو أو البريد الإلكتروني" aria-label="البحث عن عضو للإشراف"><button class="btn primary" type="submit">بحث</button></form>'+
 '<div class="staffAssignTools"><h3>توزيع مهام الإشراف</h3><p>يمكن إسناد المهمة لأكثر من مشرف، أو حجبها عن الجميع وإبقاؤها مع المدير العام فقط.</p><div id="staffScopeOverview" aria-live="polite">جارٍ تحميل الصلاحيات…</div><button class="btn" type="button" data-act="staff-clear-all">سحب جميع الصلاحيات المفوضة</button></div>'+ '<div id="staffSearchResults" aria-live="polite"></div></section>':'')+'</div>';

 await staffReloadOverview();
}
async function staffReloadOverview(){
 const box=document.getElementById('staffScopeOverview');
 if(!box)return;
 try{
  const {scopes}=await api('staff/overview');
  box.innerHTML=STAFF_REVIEW_ITEMS.map(item=>{
   const current=scopes[item.permission]||[];
   return '<div class="staffScope"><div><strong>'+item.title+'</strong><small>'+
    (current.length?'مُسندة إلى '+current.length+' مشرف/مشرفين':'محفوظة للمدير العام فقط')+
    '</small></div><div class="staffScopeAssignees">'+
    (current.map(u=>'<span>'+esc(u.name)+(u.active?'':' (حساب غير نشط)')+'</span>').join('')||'<em>لا يوجد مشرف مفوض</em>')+
    '</div><button type="button" class="btn" data-act="staff-scope-clear" data-permission="'+item.permission+'" '+
    (current.length?'':'disabled')+'>حجبها عن جميع المشرفين</button></div>';
  }).join('');
 }catch(e){box.textContent=e.message;}
}
async function staffAction(form,data){
 if(form?.id==='staffSearchForm'){
  const box=document.getElementById('staffSearchResults');
  try{
   const res=await api('staff/users?q='+encodeURIComponent(data.q));
   box.innerHTML=res.users.length?res.users.map(member=>{
    const admin=member.role==='admin',active=member.account_status==='active',manager=member.permissions.includes('staff_manage'),fullAdmin=user.role==='admin';
    return '<article class="staffMember"><div><strong>'+esc(member.name)+'</strong><small>'+esc(member.email)+'</small></div>'+
     (admin?'<p>مدير عام — صلاحيات كاملة</p>':!active?'<p>حساب غير نشط — لا يمكن منح صلاحيات</p>':
      (manager&&!fullAdmin?'<p>مشرف مفوض بتوزيع المهام — تعديله للمدير العام فقط.</p>':'<form class="staffPermissionForm" data-staff-user="'+member.id+'">')+STAFF_REVIEW_ITEMS.map(item=>
      '<label><input type="checkbox" name="permissions" value="'+item.permission+'" '+(member.permissions.includes(item.permission)?'checked':'')+'><span>'+item.title+'</span></label>').join('')+
      (fullAdmin?'<button type="button" class="btn" data-act="staff-manager-flag" data-staff-id="'+member.id+'" data-enabled="'+(manager?'false':'true')+'">'+(manager?'سحب تفويض إدارة المهام':'تفويض إدارة المهام')+'</button>':'')+'<div class="staffQuickActions"><button type="button" class="btn" data-act="staff-select-all">اختيار جميع المهام</button><button type="button" class="btn" data-act="staff-select-none">إلغاء جميع المهام</button><button type="button" class="btn" data-act="staff-exclusive" data-staff-id="'+member.id+'">تجميع الإشراف حصرياً لهذا العضو</button></div>'+ '<button class="btn primary" type="submit">حفظ الصلاحيات</button><div class="error" role="alert"></div></form>')+'</article>';
   }).join(''):'<p>لم يُعثر على أعضاء مطابقين.</p>';
  }catch(e){box.textContent=e.message;}
  return true;
 }
 if(form?.classList?.contains('staffPermissionForm')){
  const id=Number(form.dataset.staffUser);
  const button=form.querySelector('button[type=submit]');
  const error=form.querySelector('.error');
  button.disabled=true;
  try{
   const permissions=[...form.querySelectorAll('input[name=permissions]:checked')].map(x=>x.value);
   await api('staff/users/'+id+'/permissions','PATCH',{permissions});
   notify('حُفظت صلاحيات الإشراف.');
   await staffReloadOverview();
   error.textContent='';
  }catch(e){error.textContent=e.message;}
  finally{button.disabled=false;}
  return true;
 }
 return false;
}

async function staffDelegationAction(action,el){
 if(!['staff-select-all','staff-select-none','staff-exclusive','staff-scope-clear','staff-clear-all','staff-manager-flag'].includes(action))return false;
 if(!user||(user.role!=='admin'&&!(user.permissions||[]).includes('staff_manage'))){notify('إدارة التفويض مخصصة للمخولين.');return true;}
 const form=el.closest('.staffPermissionForm');
 if(action==='staff-manager-flag'){
  if(user.role!=='admin'){notify('تفويض إدارة المهام للمدير العام فقط.');return true;}
  const id=Number(el.dataset.staffId),enabled=el.dataset.enabled==='true';
  if(!Number.isSafeInteger(id)||id<1)return true;
  if(!confirm(enabled?'تعيين هذا العضو لتوزيع مهام المشرفين؟':'سحب صلاحية إدارة توزيع المهام من هذا العضو؟'))return true;
  const reason=prompt('سبب منح أو سحب تفويض إدارة المهام (12 حرفاً على الأقل):');
  if(reason===null)return true;
  if(reason.trim().length<12){notify('اكتب سبباً واضحاً.');return true;}
  el.disabled=true;
  try{
   await api('staff/managers/'+id,'PATCH',{enabled,reason:reason.trim()});
   const search=document.getElementById('staffSearchForm');
   if(search?.elements?.q?.value)await staffAction(search,{q:search.elements.q.value});
   notify('تم تحديث تفويض إدارة المهام.');
  }catch(e){notify(e.message)}finally{if(el.isConnected)el.disabled=false;}
  return true;
 }
 if(action==='staff-select-all'||action==='staff-select-none'){
  if(form)form.querySelectorAll('input[name="permissions"]').forEach(input=>input.checked=action==='staff-select-all');
  return true;
 }
 let payload;
 if(action==='staff-exclusive'){
  const id=Number(el.dataset.staffId);
  if(!Number.isSafeInteger(id)||id<1)return true;
  if(!confirm('سيحصل هذا العضو على جميع صلاحيات الإشراف، وتُسحب من جميع المشرفين الآخرين. هل تؤكد؟'))return true;
  payload={mode:'consolidate',target_user_id:id};
 }else if(action==='staff-scope-clear'){
  const permission=el.dataset.permission;
  if(!STAFF_REVIEW_ITEMS.some(p=>p.permission===permission))return true;
  if(!confirm('هل تريد سحب هذا الاختصاص من جميع المشرفين؟ سيبقى متاحاً للمدير العام.'))return true;
  payload={mode:'replace_scope',permission,user_ids:[]};
 }else{
  if(!confirm('سيتم سحب كل الصلاحيات الإشرافية المفوضة عن جميع المشرفين، وتبقى للمدير العام فقط. هل تؤكد؟'))return true;
  payload={mode:'clear_all'};
 }
 const reason=prompt('اكتب سبب الإجراء في سجل الإدارة (12 حرفاً على الأقل):');
 if(reason===null)return true;
 if(reason.trim().length<12){notify('يجب توثيق سبب واضح من 12 حرفاً على الأقل.');return true;}
 el.disabled=true;
 try{
  await api('staff/assignments','PATCH',{...payload,reason:reason.trim()});
  await staffReloadOverview();
  const search=document.getElementById('staffSearchForm');
  if(search?.elements?.q?.value)await staffAction(search,{q:search.elements.q.value});
  notify('تم تعديل توزيع الصلاحيات وتوثيق الإجراء.');
 }catch(e){notify(e.message);}
 finally{if(el.isConnected)el.disabled=false;}
 return true;
}

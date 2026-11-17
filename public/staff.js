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
 document.title='مركز الإشراف | تنميات';
 const sections=(isAdmin?[{title:'مركز إدارة المجتمع',description:'إدارة الأعضاء والمحتوى والبلاغات وسجل الإجراءات',href:'/admin',icon:'⚑'}]:[])
  .concat(STAFF_REVIEW_ITEMS.filter(item=>staffAllowed(item.permission)))
  .concat(isAdmin?[{title:'مراجعة الأثر',description:'نتائج العضوية والأدلة',href:'/impact-review',icon:'◎'},{title:'مؤشرات العلاقات',description:'مؤشرات التشابك المهني',href:'/network-admin',icon:'▤'}]:[]);
 const cards=sections.map(item=>'<a href="'+item.href+'" class="staffWorkCard"><span class="staffWorkIcon">'+item.icon+'</span><span><strong>'+item.title+'</strong><small>'+item.description+'</small></span><span aria-hidden="true">‹</span></a>').join('');
 main.innerHTML='<div class="staffWorkPage"><div class="staffWorkHeading"><span>مجتمع تنميات</span><h1>مركز الإشراف</h1><p>'+(isAdmin?'صلاحيات الإدارة العامة والمراجعة.':'تظهر الأقسام التي مُنحت لك صلاحية مراجعتها فقط.')+'</p></div><div class="staffWorkGrid">'+cards+'</div>'+
 (isAdmin?'<section class="staffGrants"><h2>صلاحيات المشرفين</h2><p>ابحث عن العضو بالاسم أو البريد، ثم اختر مهام المراجعة المسموحة له. يمكن تعديل الصلاحيات أو سحبها في أي وقت.</p>'+
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
    const admin=member.role==='admin',active=member.account_status==='active';
    return '<article class="staffMember"><div><strong>'+esc(member.name)+'</strong><small>'+esc(member.email)+'</small></div>'+
     (admin?'<p>مدير عام — صلاحيات كاملة</p>':!active?'<p>حساب غير نشط — لا يمكن منح صلاحيات</p>':
      '<form class="staffPermissionForm" data-staff-user="'+member.id+'">'+STAFF_REVIEW_ITEMS.map(item=>
      '<label><input type="checkbox" name="permissions" value="'+item.permission+'" '+(member.permissions.includes(item.permission)?'checked':'')+'><span>'+item.title+'</span></label>').join('')+
      '<div class="staffQuickActions"><button type="button" class="btn" data-act="staff-select-all">اختيار جميع المهام</button><button type="button" class="btn" data-act="staff-select-none">إلغاء جميع المهام</button><button type="button" class="btn" data-act="staff-exclusive" data-staff-id="'+member.id+'">تجميع الإشراف حصرياً لهذا العضو</button></div>'+ '<button class="btn primary" type="submit">حفظ الصلاحيات</button><div class="error" role="alert"></div></form>')+'</article>';
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

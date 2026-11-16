'use strict';
// Publicly reviewed needs and opt-in group cooperation.
const ne=x=>esc(String(x??''));
const nbox=(head,body)=>'<article class="workCard"><h3>'+ne(head)+'</h3>'+body+'</article>';
const nbtn=(action,id,label,extra='')=>'<button type="button" class="btn" data-needs="'+action+'" data-id="'+id+'" '+extra+'>'+label+'</button>';
const nempty=s=>'<p class="journeyEmpty">'+ne(s)+'</p>';
async function renderNeeds(token){
 const path=location.pathname.replace(/\/$/,'');
 if(!['/needs','/my-needs','/group-partnerships','/needs-admin'].includes(path))return false;
 if(!user){go('/welcome');return true;}
 main.innerHTML='<div class="status">جارٍ تحميل الاحتياجات التنموية...</div>';
 if(path==='/needs'){
  const {needs}=await api('needs/list');if(token!==version)return true;
  jShell('الاحتياجات التنموية','احتياجات موثقة النشر يمكن تحويلها إلى فرص مشاركة ومشاريع.',
   '<section class="journeyPanel"><div class="workHeader"><h2>الاحتياجات المنشورة</h2>'+jlink('/my-needs','إضافة احتياج')+'</div><div class="workGrid">'+(needs.map(n=>nbox(n.title,
    '<small>'+ne(n.category)+' · '+ne(n.country||'غير محدد')+(n.deadline?' · حتى '+ne(n.deadline):'')+'</small><p>'+ne(n.description)+'</p><p><b>المهارات المطلوبة:</b> '+ne(n.required_skills||'غير محددة')+'</p><p><b>الأولوية:</b> '+(n.urgency==='high'?'مرتفعة':'اعتيادية')+'</p>'+jlink('/opportunities','استعرض فرص المشاركة'))).join('')||nempty('لا توجد احتياجات منشورة حالياً.'))+'</div></section>');return true;
 }
 if(path==='/my-needs'){
  const [mine,needs]=await Promise.all([api('work/mine'),api('needs/mine')]);if(token!==version)return true;
  const projects=mine.projects.filter(x=>x.status==='published');
  const myList=needs.needs.map(n=>nbox(n.title,'<p>'+ne(n.category)+' · '+({pending:'قيد المراجعة',published:'منشور',closed:'مغلق',rejected:'غير معتمد'}[n.status]||n.status)+'</p>'+(n.status==='published'?nbtn('close-need',n.id,'إغلاق الاحتياج')+' '+jlink('/my-opportunities?need='+n.id,'إنشاء فرصة مرتبطة'):'') )).join('');
  jShell('احتياجاتي','إضافة احتياج محدد، ومراجعته، وربطه بفرصة مشاركة عند النشر.',
   '<div class="journeyColumns"><section class="journeyPanel"><h2>احتياج تنموي جديد</h2><form id="needsForm" class="journeyForm"><label>عنوان الاحتياج<input name="title" required minlength="5" maxlength="150"></label><label>وصف الاحتياج وسبب أهميته<textarea name="description" required minlength="25" maxlength="8000"></textarea></label><div class="journeyFields"><label>المجال<select name="category">'+WORK_CATEGORIES.map(x=>'<option>'+x+'</option>').join('')+'</select></label><label>الأولوية<select name="urgency"><option value="normal">اعتيادية</option><option value="high">مرتفعة</option></select></label><label>الدولة<input name="country" maxlength="80"></label><label>المدينة<input name="city" maxlength="80"></label><label>الموعد النهائي<input name="deadline" type="date"></label><label>مشروع مرتبط (اختياري)<select name="project_id"><option value="">بدون مشروع</option>'+projects.map(p=>'<option value="'+p.id+'">'+ne(p.title)+'</option>').join('')+'</select></label></div><label>المهارات أو الموارد المطلوبة<textarea name="required_skills" maxlength="3500"></textarea></label><div class="error" role="alert"></div><button type="submit" class="btn primary">إرسال الاحتياج للمراجعة</button></form></section>'+
   '<section class="journeyPanel"><h2>احتياجاتي المسجلة</h2><div class="workGrid">'+(myList||nempty('لم تسجل احتياجات بعد.'))+'</div></section></div>');return true;
 }
 if(path==='/group-partnerships'){
  const [groups,links]=await Promise.all([api('partnerships/groups'),api('partnerships/mine')]);if(token!==version)return true;
  const choices=groups.groups.map(g=>'<option value="'+g.id+'">'+ne(g.name)+'</option>').join('');
  const ownChoices=groups.groups.filter(g=>g.owner_id===user.id).map(g=>'<option value="'+g.id+'">'+ne(g.name)+'</option>').join('');
  const existing=links.partnerships.map(x=>nbox(x.from_name+' · '+x.to_name,'<p>'+ne(x.purpose)+'</p><p>'+({pending:'قيد الموافقة',approved:'تعاون مقبول',rejected:'مرفوض',closed:'مغلق'}[x.status]||x.status)+'</p>'+(x.status==='pending'&&x.to_owner===user.id?nbtn('partnership-decision',x.id,'قبول','data-status="approved"')+' '+nbtn('partnership-decision',x.id,'رفض','data-status="rejected"'):'')+(x.status==='approved'?nbtn('partnership-decision',x.id,'إنهاء التعاون','data-status="closed"'):''))).join('');
  jShell('تعاون المجموعات','يتطلب الربط موافقة مسؤول المجموعة المدعوة، ولا يكشف محتوى المجموعات الخاصة.',
   '<div class="journeyColumns"><section class="journeyPanel"><h2>طلب تعاون بين مجموعتين</h2><form class="journeyForm" id="partnershipForm"><label>المجموعة التي تديرها<select name="from_group_id">'+ownChoices+'</select></label><label>المجموعة المدعوة<select name="to_group_id">'+choices+'</select></label><label>غرض التعاون<textarea name="purpose" required minlength="15" maxlength="2000" placeholder="مثلاً: تنظيم مبادرة مشتركة بين فريقين متخصصين"></textarea></label><div class="error" role="alert"></div><button type="submit" class="btn primary">إرسال طلب التعاون</button></form></section><section class="journeyPanel"><h2>طلبات التعاون</h2><div class="workGrid">'+(existing||nempty('لا توجد طلبات بين مجموعاتك.'))+'</div></section></div>');return true;
 }
 if(path==='/needs-admin'){
  if(user.role!=='admin'){go('/needs');return true;}
  const {needs}=await api('needs/admin/queue');if(token!==version)return true;
  jShell('مراجعة الاحتياجات','اعتماد الاحتياجات قبل نشرها، مع تسجيل مبرر القرار.',
   '<section class="journeyPanel"><h2>الاحتياجات قيد المراجعة</h2><div class="workGrid">'+(needs.map(n=>nbox(n.title,'<p>'+ne(n.description)+'</p><small>'+ne(n.owner)+' · '+ne(n.category)+'</small><div class="networkActions">'+nbtn('review-need',n.id,'نشر','data-status="published"')+nbtn('review-need',n.id,'رفض','data-status="rejected"')+'</div>')).join('')||nempty('لا توجد احتياجات معلقة.'))+'</div></section>');return true;
 }
 return false;
}
async function needsAction(el){
 if(!el?.hasAttribute('data-needs'))return false;
 const id=Number(el.dataset.id),action=el.dataset.needs;
 try{
  if(action==='close-need'){
   if(!confirm('إغلاق الاحتياج وإزالته من قائمة الاحتياجات المفتوحة؟'))return true;
   await api('needs/'+id+'/close','PATCH');notify('أُغلق الاحتياج');
  }else if(action==='partnership-decision'){
   await api('partnerships/'+id,'PATCH',{status:el.dataset.status});notify('تم حفظ قرار التعاون');
  }else if(action==='review-need'){
   const note=prompt('سبب القرار (12 حرفاً على الأقل):');if(note===null)return true;
   await api('needs/admin/'+id,'PATCH',{status:el.dataset.status,note:note.trim()});notify('تم توثيق قرار المراجعة');
  }
  await route();
 }catch(e){notify(e.message)}return true;
}
async function needsForm(form,data){
 if(!['needsForm','partnershipForm'].includes(form?.id))return false;
 const btn=form.querySelector('[type=submit]'),error=form.querySelector('.error');if(btn)btn.disabled=true;if(error)error.textContent='';
 try{
  if(form.id==='needsForm'){await api('needs/create','POST',data);notify('أُرسل الاحتياج للمراجعة');}
  else {await api('partnerships/create','POST',data);notify('أُرسل طلب التعاون لصاحب المجموعة المدعوة');}
  await route();
 }catch(e){if(error)error.textContent=e.message;else notify(e.message)}
 finally{if(btn)btn.disabled=false}return true;
}

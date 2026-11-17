'use strict';
// Development work area — opportunities, organizations, approved group links and measurable results.
const WORK_CATEGORIES=['التعليم','البيئة','المجتمع','الاقتصاد','الصحة','الإغاثة','البنية التحتية','المياه','الطاقة','التقنية','أخرى'];
const wesc=x=>esc(String(x??''));
const wtitle=(v)=>'<h2>'+v+'</h2>';
const wblank=x=>'<p class="journeyEmpty">'+wesc(x)+'</p>';
const wopt=(items,selected)=>items.map(v=>'<option value="'+wesc(v.id)+'" '+(String(v.id)===String(selected)?'selected':'')+'>'+wesc(v.title||v.name)+'</option>').join('');
const wbutton=(action,id,title,extra='')=>'<button type="button" class="btn" data-work="'+action+'" data-id="'+id+'" '+extra+'>'+title+'</button>';
function wcard(item,body){return '<article class="workCard"><h3>'+wesc(item.title||item.name)+'</h3>'+body+'</article>';}
const workStatus={pending:'قيد المراجعة',published:'منشورة',rejected:'غير معتمدة',closed:'مغلقة',unverified:'قيد التحقق',verified:'تم التحقق',accepted:'مقبول',completed:'مكتمل',withdrawn:'مسحوب',approved:'مقبول'};
const wlabel=s=>workStatus[s]||s;
async function renderDevelopmentWork(token){
 const path=location.pathname.replace(/\/$/,'');
 if(!['/opportunities','/my-opportunities','/project-results','/work-admin'].includes(path))return false;
 if(!user){go('/welcome');return true;}
 main.innerHTML='<div class="status">جارٍ تحميل الفرص والمشاريع...</div>';
 if(path==='/opportunities'){
  const {opportunities}=await api('work/opportunities');if(token!==version)return true;
  const cards=opportunities.map(o=>wcard(o,'<small>'+wesc(o.category)+' · '+wesc(o.country)+' · '+wesc(o.mode==='remote'?'عن بُعد':o.mode==='hybrid'?'هجين':'حضوري')+' · '+wesc(o.arrangement==='volunteer'?'تطوعي':'مدفوع')+'</small><p>'+wesc(o.description)+'</p><p><b>المتطلبات:</b> '+wesc(o.requirements||'لا توجد متطلبات إضافية')+'</p><p><b>عدد المشاركين:</b> '+o.capacity+' · <b>الوقت:</b> '+o.hours_estimate+' ساعة'+(o.deadline?' · <b>آخر موعد:</b> '+wesc(o.deadline):'')+'</p>'+wbutton('apply',o.id,'التقدم للفرصة'))).join('');
  jShell('الفرص التنموية','فرص منشورة بعد المراجعة، مع توضيح شروط المشاركة ومقابلها وموعدها.',
   '<section class="journeyPanel"><div class="workHeader">'+wtitle('الفرص المتاحة')+jlink('/my-opportunities','إدارة فرصي وطلباتي')+'</div><div class="workGrid">'+(cards||wblank('لا توجد فرص متاحة حالياً.'))+'</div></section>');
  return true;
 }
 if(path==='/my-opportunities'){
  const [mine,links,orgs,needs,groups]=await Promise.all([api('work/mine'),api('work/group-links'),api('work/organizations'),api('needs/mine'),api('partnerships/groups')]);if(token!==version)return true;
  const userOrgs=mine.organizations.filter(o=>o.status==='verified');
  const projectOptions=mine.projects.filter(p=>p.status==='published').map(p=>({id:p.id,title:p.title}));
  const myProjects=mine.projects.map(p=>({id:p.id,title:p.title}));
  const opps=mine.opportunities.map(o=>wcard(o,'<p>'+wesc(o.category)+' · '+wlabel(o.status)+'</p>'+wbutton('applications',o.id,'طلبات المشاركة'))).join('');
  const myApps=mine.applications.map(a=>wcard({title:a.title},'<p>'+wlabel(a.status)+(a.status==='accepted'?' · '+(a.applicant_confirmed?'أكدت الإنجاز':'بانتظار تأكيدك'):'')+'</p>'+(a.status==='accepted'&&!a.applicant_confirmed?wbutton('confirm-participation',a.opportunity_id,'تأكيد إكمال مشاركتي'):'')+(a.status==='pending'||a.status==='accepted'?wbutton('withdraw-participation',a.opportunity_id,'سحب طلبي'):'') )).join('');
  const ownGroupLinks=links.links.map(l=>wcard({title:l.project_title+' · '+l.group_name},'<p>'+wlabel(l.status)+'</p>'+(l.status==='pending'&&l.group_owner_id===user.id?wbutton('approve-group',l.project_id,'قبول ارتباط المجموعة','data-group="'+l.group_id+'"')+' '+wbutton('reject-group',l.project_id,'رفض الارتباط','data-group="'+l.group_id+'"'):'') )).join('');
  const verifiedList=userOrgs.length?userOrgs.map(o=>'<option value="'+o.id+'">'+wesc(o.name)+'</option>').join(''):'';
  jShell('فرصي وطلباتي','إنشاء الفرص، وتوثيق الجهات، ومتابعة الطلبات والتعاون.',
   '<div class="journeyColumns">'+
   '<section class="journeyPanel">'+wtitle('إضافة فرصة تنموية')+'<p>تُعرض الفرص بعد المراجعة الإدارية. حدّد صراحة هل المشاركة تطوعية أم مدفوعة.</p><form id="workOpportunityForm" class="journeyForm"><label>عنوان الفرصة<input name="title" required minlength="5" maxlength="150"></label><label>وصف المهام والهدف<textarea name="description" required minlength="25" maxlength="8000"></textarea></label><div class="journeyFields"><label>المجال<select name="category">'+WORK_CATEGORIES.map(s=>'<option>'+s+'</option>').join('')+'</select></label><label>المشاركة<select name="arrangement"><option value="volunteer">تطوعية</option><option value="paid">مدفوعة</option></select></label><label>طريقة المشاركة<select name="mode"><option value="remote">عن بُعد</option><option value="onsite">حضوري</option><option value="hybrid">هجين</option></select></label><label>المقاعد المتاحة<input name="capacity" type="number" min="1" max="100000" value="1" required></label><label>الساعات المتوقعة<input name="hours_estimate" type="number" min="0" max="10000" value="0"></label><label>آخر موعد للتقديم<input name="deadline" type="date"></label><label>الدولة<input name="country" maxlength="80"></label><label>المدينة<input name="city" maxlength="80"></label></div><label>المهارات والمتطلبات<textarea name="requirements" maxlength="3500"></textarea></label><label>ربط بمشروع منشور (اختياري)<select name="project_id"><option value="">بدون ربط</option>'+wopt(projectOptions)+'</select></label><label>احتياج مرتبط (اختياري)<select name="need_id"><option value="">بدون ربط</option>'+needs.needs.filter(x=>x.status==='published').map(n=>'<option value="'+n.id+'" '+(new URL(location.href).searchParams.get('need')===String(n.id)?'selected':'')+'>'+wesc(n.title)+'</option>').join('')+'</select></label><div class="error" role="alert"></div><button type="submit" class="btn primary">إرسال الفرصة للمراجعة</button></form></section>'+
   '<section class="journeyPanel">'+wtitle('إضافة جهة أو مؤسسة')+'<p>يتم اعتماد صفة الجهة بواسطة الإدارة قبل ظهورها بوصفها جهة متحققة.</p><form id="workOrganizationForm" class="journeyForm"><label>اسم الجهة<input name="name" required minlength="4" maxlength="140"></label><label>الدولة<input name="country" required maxlength="80"></label><label>وصف مختصر<textarea name="description" maxlength="3500"></textarea></label><label>الموقع الإلكتروني الرسمي (اختياري)<input name="website" type="url"></label><div class="error" role="alert"></div><button type="submit" class="btn primary">إرسال الجهة للمراجعة</button></form><h3>الجهات التي أضفتها</h3>'+(mine.organizations.map(o=>'<p>'+wesc(o.name)+' · '+wlabel(o.status)+'</p>').join('')||wblank('لا توجد جهات مسجلة.'))+'</section>'+
   '<section class="journeyPanel">'+wtitle('ربط مشروعي بجهة متحققة')+(verifiedList&&myProjects.length?'<form id="workLinkOrganizationForm" class="journeyForm"><label>المشروع<select name="project_id">'+wopt(myProjects)+'</select></label><label>الجهة المتحققة<select name="organization_id">'+verifiedList+'</select></label><div class="error"></div><button type="submit" class="btn primary">ربط المشروع بالجهة</button></form>':wblank('يلزم وجود مشروع تملكه وجهة متحققة تمثلها.'))+'</section>'+
   '<section class="journeyPanel">'+wtitle('طلب ربط مشروع بمجموعة')+(myProjects.length?'<form id="workLinkGroupForm" class="journeyForm"><label>المشروع<select name="project_id">'+wopt(myProjects)+'</select></label><label>المجموعة<select name="group_id" required>'+groups.groups.map(g=>'<option value="'+g.id+'">'+wesc(g.name)+'</option>').join('')+'</select></label><div class="error"></div><button type="submit" class="btn primary">إرسال طلب الربط لصاحب المجموعة</button></form>':wblank('أضف مشروعاً أولاً.'))+'<h3>طلبات ربط المجموعات</h3><div class="workGrid">'+(ownGroupLinks||wblank('لا توجد طلبات ربط.'))+'</div></section>'+
   '<section class="journeyPanel">'+wtitle('الفرص التي أضفتها')+'<div class="workGrid">'+(opps||wblank('لم تضف فرصاً بعد.'))+'</div></section>'+
   '<section class="journeyPanel">'+wtitle('طلبات مشاركتي')+'<div class="workGrid">'+(myApps||wblank('لم تتقدم إلى فرص بعد.'))+'</div></section></div>');
  return true;
 }
 if(path==='/project-results'){
  const mine=await api('work/mine');if(token!==version)return true;
  const selected=Number(new URL(location.href).searchParams.get('project')||mine.projects[0]?.id||0);
  const own=mine.projects.some(p=>p.id===selected);
  const [outcomes,links]=selected?await Promise.all([api('work/projects/'+selected+'/outcomes'),api('work/projects/'+selected+'/links')]):[{outcomes:[]},{organizations:[],groups:[]}];
  if(token!==version)return true;
  jShell('نتائج المشاريع','قياس النتائج بخط أساس وقيمة فعلية وتاريخ ودليل، مع فصل الإفصاح الذاتي عن المراجعة.',
   '<section class="journeyPanel">'+wtitle('اختيار المشروع')+'<form class="journeyForm" id="workSelectProjectForm"><label>المشروع<select name="project">'+wopt(mine.projects.map(p=>({id:p.id,title:p.title})),selected)+'</select></label><button type="submit" class="btn">عرض نتائج المشروع</button><div class="error"></div></form></section>'+
   (selected&&own?'<section class="journeyPanel">'+wtitle('تسجيل نتيجة قابلة للقياس')+'<form class="journeyForm" id="workOutcomeForm" data-project="'+selected+'"><label>المؤشر<input name="metric" required minlength="5" maxlength="140" placeholder="مثلاً: عدد المستفيدين الذين أكملوا التدريب"></label><div class="journeyFields"><label>وحدة القياس<input name="unit" required maxlength="60" placeholder="شخص أو نسبة"></label><label>خط الأساس<input name="baseline" type="number" step="any" required></label><label>القيمة المحققة<input name="observed" type="number" step="any" required></label><label>تاريخ القياس<input name="measured_on" type="date" required></label></div><label>ملاحظات وحدود النتيجة<textarea name="context" maxlength="5000"></textarea></label><label>رابط الدليل (اختياري)<input name="evidence_url" type="url"></label><div class="error" role="alert"></div><button type="submit" class="btn primary">تسجيل النتيجة</button></form></section>':'')+
   '<section class="journeyPanel">'+wtitle('النتائج المسجلة')+'<div class="workGrid">'+(outcomes.outcomes.map(o=>wcard({title:o.metric},'<p><b>خط الأساس:</b> '+o.baseline+' '+wesc(o.unit)+' · <b>القيمة:</b> '+o.observed+' '+wesc(o.unit)+'</p><p><b>التاريخ:</b> '+wesc(o.measured_on)+' · '+(o.verification==='reviewed'?'راجعت الإدارة الدليل':'إفصاح ذاتي')+'</p><p>'+wesc(o.context)+'</p>'+(o.evidence_url?'<a href="'+wesc(o.evidence_url)+'" rel="noopener noreferrer" target="_blank">رابط الدليل</a>':'' ))).join('')||wblank('لا توجد نتائج مسجلة.'))+'</div></section>'+
   '<section class="journeyPanel">'+wtitle('الجهات والمجموعات المرتبطة')+'<p><b>الجهات:</b> '+(links.organizations.map(o=>wesc(o.name)).join('، ')||'لا توجد جهات مرتبطة')+'</p><p><b>المجموعات:</b> '+(links.groups.map(g=>wesc(g.name)).join('، ')||'لا توجد مجموعات معتمدة')+'</p></section>');
  return true;
 }
 if(path==='/work-admin'){
  if(!['organizations_review','opportunities_review','outcomes_review'].some(staffAllowed)){go('/my-opportunities');return true;}
  const [queue,metrics]=await Promise.all([api('work/admin/queue'),api('work/metrics')]);if(token!==version)return true;
  const nums=[['الفرص المنشورة',metrics.opportunities],['الطلبات',metrics.applications],['طلبات مقبولة',metrics.accepted],['مشاركات مكتملة',metrics.completed],['الجهات المتحققة',metrics.verified_organizations],['نتائج مسجلة',metrics.outcomes],['نتائج روجعت أدلتها',metrics.reviewed_outcomes]];
  const review=(items,type,action)=>items.map(o=>{
   const source=o.website||o.evidence_url||'';
   const detail=(o.description?'<p>'+wesc(o.description)+'</p>':'')+
    (o.requirements?'<p><b>الشروط:</b> '+wesc(o.requirements)+'</p>':'')+
    (o.context?'<p><b>سياق القياس:</b> '+wesc(o.context)+'</p>':'')+
    (type==='outcomes'?'<p><b>القيم:</b> '+Number(o.baseline)+' ← '+Number(o.observed)+' '+wesc(o.unit)+' · '+wesc(o.measured_on)+'</p>':'')+
    (type==='opportunities'?'<p>'+wesc(o.category)+' · '+wesc(o.mode)+' · '+wesc(o.arrangement)+' · عدد المقاعد '+Number(o.capacity)+'</p>':'')+
    (source?'<p><a href="'+wesc(source)+'" rel="noopener noreferrer" target="_blank">فتح الرابط الداعم للمراجعة</a></p>':'<p class="journeyHint">لا يوجد رابط داعم مرفق؛ تأكد من وجود أدلة كافية قبل اتخاذ القرار.</p>');
   const buttons=(type!=='outcomes'||o.evidence_url?wbutton('admin-review',o.id,'اعتماد','data-kind="'+type+'" data-status="'+action+'"'):'')+
    ' '+(type!=='outcomes'?wbutton('admin-review',o.id,'رفض','data-kind="'+type+'" data-status="rejected"'):'');
   return wcard(o,'<p>'+wesc(o.country||o.project_title||o.category||'')+'</p>'+detail+buttons);
  }).join('');
  jShell('مراجعة الفرص والنتائج','قرارات بشرية موثقة للجهات والفرص وأدلة النتائج.',
   '<div class="journeyStats">'+nums.map(([l,n])=>'<div class="journeyStat"><strong>'+Number(n||0).toLocaleString('ar')+'</strong><span>'+l+'</span></div>').join('')+'</div>'+
   '<section class="journeyPanel" '+(staffAllowed('organizations_review')?'':'hidden')+'>'+wtitle('جهات تنتظر التحقق')+'<div class="workGrid">'+(review(queue.organizations,'organizations','verified')||wblank('لا توجد جهات معلقة.'))+'</div></section>'+
   '<section class="journeyPanel" '+(staffAllowed('opportunities_review')?'':'hidden')+'>'+wtitle('فرص تنتظر النشر')+'<div class="workGrid">'+(review(queue.opportunities,'opportunities','published')||wblank('لا توجد فرص معلقة.'))+'</div></section>'+
   '<section class="journeyPanel" '+(staffAllowed('outcomes_review')?'':'hidden')+'>'+wtitle('نتائج تنتظر مراجعة الدليل')+'<div class="workGrid">'+(review(queue.outcomes,'outcomes','reviewed')||wblank('لا توجد نتائج قيد المراجعة.'))+'</div></section>');
  return true;
 }
 return false;
}
async function workAction(el){
 if(!el?.hasAttribute('data-work'))return false;
 const action=el.dataset.work,id=Number(el.dataset.id);
 try{
  if(action==='apply'){
   const note=prompt('نبذة مختصرة عن رغبتك في المشاركة (اختياري):');
   if(note===null)return true;
   await api('work/opportunities/'+id+'/apply','POST',{note:note.trim()});notify('أُرسل طلب المشاركة.');
  }else if(action==='applications'){
   const {applications}=await api('work/opportunities/'+id+'/applications');
   const body=applications.map(a=>'<article class="workApplication"><strong>'+wesc(a.name)+'</strong><p>'+wesc(a.note)+'</p><p>'+wlabel(a.status)+(a.applicant_confirmed?' · أكد العضو إنجازه':'')+'</p>'+(a.status==='pending'?wbutton('decide-application',id,'قبول','data-applicant="'+a.applicant_id+'" data-status="accept"')+' '+wbutton('decide-application',id,'رفض','data-applicant="'+a.applicant_id+'" data-status="reject"'):'')+(a.status==='accepted'&&!a.owner_confirmed?wbutton('confirm-owner',id,'تأكيد إنجاز المشاركة','data-applicant="'+a.applicant_id+'"'):'')+'</article>').join('')||'<p>لا توجد طلبات.</p>';
   showModal('طلبات المشاركة',body);
   return true;
  }else if(action==='decide-application'||action==='confirm-owner'){
   await api('work/opportunities/'+id+'/applications/'+Number(el.dataset.applicant),'PATCH',{action:action==='confirm-owner'?'confirm':el.dataset.status});
   notify('تم حفظ القرار');
   const {applications}=await api('work/opportunities/'+id+'/applications');
   dialog.close();notify('يمكنك عرض الطلبات مجدداً للاطلاع على الحالة.');
  }else if(action==='confirm-participation'||action==='withdraw-participation'){
   await api('work/opportunities/'+id+'/applications/'+user.id,'PATCH',{action:action==='confirm-participation'?'confirm':'withdraw'});notify('تم تحديث مشاركتك');
  }else if(action==='approve-group'||action==='reject-group'){
   await api('work/group-links/'+id+'/'+Number(el.dataset.group),'PATCH',{status:action==='approve-group'?'approved':'rejected'});notify('تم حفظ قرار ربط المجموعة');
  }else if(action==='admin-review'){
   const note=prompt('سبب القرار أو وصف الأدلة التي راجعتها (12 حرفاً على الأقل):');
   if(note===null)return true;
   await api('work/admin/'+el.dataset.kind+'/'+id,'PATCH',{status:el.dataset.status,note:note.trim()});notify('تم توثيق قرار المراجعة');
  }
  await route();
 }catch(e){notify(e.message)}
 return true;
}
async function workForm(form,data){
 const id=form?.id;
 if(!['workOpportunityForm','workOrganizationForm','workLinkOrganizationForm','workLinkGroupForm','workOutcomeForm','workSelectProjectForm'].includes(id))return false;
 const btn=form.querySelector('[type="submit"]'),error=form.querySelector('.error');if(btn)btn.disabled=true;if(error)error.textContent='';
 try{
  if(id==='workSelectProjectForm'){go('/project-results?project='+encodeURIComponent(data.project));return true;}
  if(id==='workOpportunityForm'){await api('work/opportunities','POST',data);notify('أُرسلت الفرصة للمراجعة');}
  if(id==='workOrganizationForm'){await api('work/organizations','POST',data);notify('أُرسلت الجهة للمراجعة');}
  if(id==='workLinkOrganizationForm'){await api('work/projects/'+Number(data.project_id)+'/organizations','POST',{organization_id:Number(data.organization_id)});notify('ارتبط المشروع بالجهة المتحققة');}
  if(id==='workLinkGroupForm'){await api('work/projects/'+Number(data.project_id)+'/groups','POST',{group_id:Number(data.group_id)});notify('أُرسل طلب الربط لصاحب المجموعة');}
  if(id==='workOutcomeForm'){await api('work/projects/'+Number(form.dataset.project)+'/outcomes','POST',data);notify('تم تسجيل النتيجة بوصفها إفادة ذاتية');}
  await route();
 }catch(e){if(error)error.textContent=e.message;else notify(e.message)}
 finally{if(btn)btn.disabled=false}
 return true;
}

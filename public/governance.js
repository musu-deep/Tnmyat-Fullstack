'use strict';
const govEsc = s => esc(s);
let governanceTab='overview';
const govTabs=[['overview','المؤشرات'],['users','الأعضاء'],['posts','المحتوى'],['groups','المجموعات'],['reports','البلاغات'],['appeals','التظلمات'],['audit','سجل الإجراءات']];
async function renderGovernance(token){
  if(!user||user.role!=='admin'){go('/wall');return;}
  document.title='مركز إدارة تنميات';
  main.innerHTML='<section class="gov"><div class="gov-intro"><a href="/wall">← العودة إلى المجتمع</a><span>مركز القيادة والرقابة</span><h1>إدارة مجتمع تنميات</h1><p>الأعضاء، المحتوى، الشكاوى، التظلمات، وسجل القرارات الإدارية.</p></div><nav class="gov-tabs" aria-label="أقسام الإدارة">'+govTabs.map(([key,title])=>'<button data-act="gov-tab" data-tab="'+key+'" class="'+(key===governanceTab?'active':'')+'">'+title+'</button>').join('')+'</nav><div id="govContent" class="gov-content">جارٍ تحميل البيانات…</div></section>';
  try{await governanceLoad();}catch(error){if(token===version)document.querySelector('#govContent').textContent=error.message;}
}
function govTable(head,rows){return '<div class="gov-tablewrap"><table class="gov-table"><thead><tr>'+head.map(h=>'<th>'+h+'</th>').join('')+'</tr></thead><tbody>'+rows.join('')+'</tbody></table></div>';}
function govButton(kind,id,status,label){return '<button class="gov-small" data-act="gov-change" data-kind="'+kind+'" data-id="'+id+'" data-status="'+status+'">'+label+'</button>';}
async function governanceLoad(){
 const target=document.querySelector('#govContent');if(!target)return;
 target.textContent='جارٍ تحميل البيانات…';
 const key=governanceTab;
 const data=await api('admin/'+key);
 if(!target.isConnected||governanceTab!==key)return;
 if(key==='overview'){
  const labels={members:'الأعضاء',restricted:'الحسابات المقيدة',posts:'المنشورات الظاهرة',groups:'المجموعات الظاهرة',reports:'بلاغات مفتوحة',appeals:'تظلمات مفتوحة'};
  target.innerHTML='<div class="gov-metrics">'+Object.entries(labels).map(([field,title])=>'<div class="gov-metric"><span>'+title+'</span><strong>'+Number(data.counts[field]||0)+'</strong></div>').join('')+'</div><p class="gov-tip">تُسجل قرارات الإشراف وأسبابها في سجل رقابي. لا تتاح الرسائل الخاصة للإدارة من خلال هذه اللوحة.</p>';
 }else if(key==='users'){
  target.innerHTML='<form id="govSearch" class="gov-search"><input name="q" placeholder="ابحث باسم العضو أو البريد الإلكتروني" value="'+govEsc(window.govUserQuery||'')+'"><button>بحث</button></form>';
  const list=window.govUserQuery?await api('admin/users?q='+encodeURIComponent(window.govUserQuery)):data;
  target.insertAdjacentHTML('beforeend',govTable(['الاسم','البريد','الدور','الحالة','إجراء'],list.users.map(u=>'<tr><td>'+govEsc(u.name)+'</td><td dir="ltr">'+govEsc(u.email)+'</td><td>'+govEsc(u.role)+'</td><td>'+govEsc(u.account_status)+'</td><td>'+(u.role==='admin'?'حساب إداري محمي':govButton('users',u.id,u.account_status==='active'?'suspended':'active',u.account_status==='active'?'إيقاف مؤقت':'إعادة تفعيل')+' '+govButton('users',u.id,'banned','حظر'))+'</td></tr>')));
 }else if(key==='posts'){
  target.innerHTML=govTable(['الموضوع','الكاتب','الحالة','إجراء'],data.posts.map(p=>'<tr><td>'+govEsc(p.title||p.excerpt||'منشور')+'</td><td>'+govEsc(p.author)+'</td><td>'+govEsc(p.moderation_status)+'</td><td>'+govButton('posts',p.id,p.moderation_status==='visible'?'hidden':'visible',p.moderation_status==='visible'?'إخفاء':'استعادة')+'</td></tr>'));
 }else if(key==='groups'){
  target.innerHTML=govTable(['المجموعة','المالك','الحالة','إجراء'],data.groups.map(g=>'<tr><td>'+govEsc(g.name)+'</td><td>'+govEsc(g.owner)+'</td><td>'+govEsc(g.moderation_status)+'</td><td>'+govButton('groups',g.id,g.moderation_status==='visible'?'hidden':'visible',g.moderation_status==='visible'?'إيقاف ظهور':'استعادة')+'</td></tr>'));
 }else if(key==='reports'){
  target.innerHTML=govTable(['المبلّغ','الهدف','السبب','الحالة','إجراء'],data.reports.map(r=>'<tr><td>'+govEsc(r.reporter)+'</td><td>'+govEsc(r.target_type)+' #'+r.target_id+'</td><td>'+govEsc(r.reason)+'</td><td>'+govEsc(r.status)+'</td><td>'+govButton('reports',r.id,'reviewing','بدء المراجعة')+' '+govButton('reports',r.id,'resolved','معالجة')+' '+govButton('reports',r.id,'dismissed','رفض البلاغ')+'</td></tr>'));
 }else if(key==='appeals'){
  target.innerHTML=govTable(['العضو','القرار','الاعتراض','الحالة','إجراء'],data.appeals.map(a=>'<tr><td>'+govEsc(a.appellant)+'</td><td>#'+a.action_id+'</td><td>'+govEsc(a.statement)+'</td><td>'+govEsc(a.status)+'</td><td>'+govButton('appeals',a.id,'reviewing','قيد المراجعة')+' '+govButton('appeals',a.id,'upheld','تأييد القرار')+'</td></tr>'));
 }else if(key==='audit'){
  target.innerHTML=govTable(['التاريخ','المدير','الهدف','القرار','السبب'],data.actions.map(a=>'<tr><td>'+govEsc(a.created_at)+'</td><td>'+govEsc(a.actor)+'</td><td>'+govEsc(a.target_type)+' #'+a.target_id+'</td><td>'+govEsc(a.action)+'</td><td>'+govEsc(a.reason)+'</td></tr>'));
 }
}
async function governanceAction(action,el){
 if(action==='gov-tab'){
  governanceTab=el.dataset.tab;
  document.querySelectorAll('.gov-tabs button').forEach(b=>b.classList.toggle('active',b===el));
  await governanceLoad();return true;
 }
 if(action==='gov-change'){
  const {kind,id,status}=el.dataset;
  const reason=prompt('اكتب سبباً واضحاً للقرار الإداري (8 أحرف على الأقل):');
  if(reason===null)return true;
  if(reason.trim().length<8){notify('يجب توثيق سبب القرار بصورة واضحة');return true;}
  let days;
  if(kind==='users'&&status==='suspended'){
    const answer=prompt('مدة الإيقاف بالأيام (1–365):','7');if(answer===null)return true;days=Number(answer);
    if(!Number.isInteger(days)||days<1||days>365){notify('مدة الإيقاف غير صالحة');return true;}
  }
  if(!confirm('هل تؤكد تنفيذ الإجراء وتسجيله في سجل الرقابة؟'))return true;
  el.disabled=true;
  try{await api('admin/'+kind+'/'+id,'PATCH',{status,reason:reason.trim(),...(days?{days}:{})});notify('تم تسجيل الإجراء');await governanceLoad();}catch(e){notify(e.message);}finally{el.disabled=false;}
  return true;
 }
 return false;
}
async function governanceForm(form,data){
 if(form.id!=='govSearch')return false;
 window.govUserQuery=String(data.q||'').trim().slice(0,100);await governanceLoad();return true;
}

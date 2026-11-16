'use strict';
// Professional connections are voluntary. Members control discovery and every work commitment.
const networkEscape=x=>esc(String(x??''));
const networkEmpty=x=>'<p class="journeyEmpty">'+networkEscape(x)+'</p>';
const networkActionButton=(name,id,label)=>'<button type="button" class="btn" data-network="'+name+'" data-id="'+id+'">'+label+'</button>';
async function renderNetwork(token){
 const path=location.pathname.replace(/\/$/,'');
 if(!['/network','/network-admin'].includes(path))return false;
 if(!user){go('/welcome');return true;}
 const isAdmin=path==='/network-admin';
 if(isAdmin&&user.role!=='admin'){go('/network');return true;}
 main.innerHTML='<div class="status">جارٍ تحميل الشبكة المهنية...</div>';
 if(isAdmin){
  const data=await api('network/admin/overview');if(token!==version)return true;
  const stats=[['أعضاء فعّلوا الاكتشاف',data.members],['العلاقات المسجلة',data.relations.total],['طلبات معلقة',data.relations.pending],['علاقات مقبولة',data.relations.accepted],['علاقات لديها خطوة عمل',data.relations.working],['نتائج مبلغ عنها',data.relations.completed],['مشاريع منشورة',data.projects]];
  jShell('مؤشرات العلاقات','مؤشرات مجمعة للإدارة. لا تعرض المراسلات أو التفضيلات الخاصة.',
    '<div class="journeyStats">'+stats.map(([name,n])=>'<div class="journeyStat"><strong>'+Number(n||0).toLocaleString('ar')+'</strong><span>'+name+'</span></div>').join('')+'</div>'+
    '<section class="journeyPanel"><h2>متابعة التشابك</h2><p>قارن الطلبات المعلقة بالعلاقات المقبولة وخطوات العمل والنتائج. توثيق العضو للنتيجة لا يعني التحقق المستقل.</p>'+networkEmpty('تحتاج مؤشرات التحول إلى دفعات ونوافذ قياس ثابتة قبل اعتماد نسب نجاح مؤسسية.')+'</section>');
  return true;
 }
 const [settings,relations]=await Promise.all([api('network/settings'),api('network/relations')]);if(token!==version)return true;
 let matches={enabled:false,people:[],groups:[],projects:[]};
 if(settings.enabled)matches=await api('network/matches');if(token!==version)return true;
 const members=matches.people.map(m=>'<article class="networkCard"><h3><a href="/profile/'+m.id+'">'+networkEscape(m.name)+'</a></h3><small>'+networkEscape(m.professional_role||'عضو تنموي')+' · '+networkEscape(m.country||'')+'</small><p>'+networkEscape(m.reason)+'</p><button type="button" class="btn primary" data-network="invite" data-id="'+m.id+'" data-name="'+networkEscape(m.name)+'">طلب تعارف لغرض محدد</button></article>').join('');
 const suggestions=matches.enabled?'<section class="journeyPanel networkWide"><h2>أعضاء مقترحون</h2><p>الاقتراحات تعتمد على اهتمامات ومهارات معلنة. لا تُرسل رسائل أو طلبات تلقائياً.</p><div class="networkCards">'+(members||networkEmpty('لا توجد حالياً اقتراحات مطابقة؛ يمكنك تحديث اهتماماتك أو البحث في دليل الأعضاء.'))+'</div></section>'+
 '<section class="journeyPanel"><h2>مجموعات مناسبة</h2>'+(matches.groups.map(g=>'<p><a href="/groups/'+g.id+'">'+networkEscape(g.name)+'</a> <small>· '+networkEscape(g.reason)+'</small></p>').join('')||networkEmpty('لا توجد مجموعات متطابقة حالياً.'))+'</section>'+
 '<section class="journeyPanel"><h2>مشاريع مناسبة</h2>'+(matches.projects.map(p=>'<p><strong>'+networkEscape(p.title)+'</strong> · '+networkEscape(p.reason)+' <a href="/map">عرض الخارطة</a></p>').join('')||networkEmpty('لا توجد مشاريع منشورة مرتبطة باهتماماتك حالياً.'))+'</section>':'';
 const relationCards=relations.relations.map(r=>{
  const incoming=r.recipient_id===user.id,other=incoming?r.initiator:r.recipient;
  let buttons='';
  if(r.status==='pending'){
   buttons=incoming?networkActionButton('accept',r.id,'قبول')+' '+networkActionButton('reject',r.id,'رفض'):networkActionButton('close',r.id,'سحب الطلب');
  }else if(['accepted','working'].includes(r.status)){
   buttons=networkActionButton('plan',r.id,'تسجيل خطوة عمل')+' '+(r.status==='working'?networkActionButton('result',r.id,'تسجيل نتيجة')+' ':'')+networkActionButton('close',r.id,'إغلاق العلاقة');
  }
  const states={pending:'طلب قيد الانتظار',accepted:'تعارف مقبول',working:'خطوة عمل جارية',completed:'نتيجة مبلغ عنها',closed:'مغلقة',rejected:'مرفوضة'};
  return '<article class="networkRelation"><h3>'+networkEscape(other)+'</h3><small>'+networkEscape(states[r.status]||r.status)+'</small><p><b>الغرض:</b> '+networkEscape(r.purpose)+'</p>'+(r.next_step?'<p><b>الخطوة:</b> '+networkEscape(r.next_step)+(r.due_date?' · '+networkEscape(r.due_date):'')+'</p>':'')+(r.outcome?'<p><b>النتيجة المبلغ عنها:</b> '+networkEscape(r.outcome)+'</p>':'')+(r.evidence_url?'<a href="'+networkEscape(r.evidence_url)+'" target="_blank" rel="noopener noreferrer">رابط الدليل</a>':'')+'<div class="networkActions">'+buttons+'</div></article>';
 }).join('');
 jShell('علاقاتي المهنية','اقتراحات قابلة للتفسير، وقبول اختياري، ومتابعة التعاون والنتائج.',
 '<section class="journeyPanel networkWide"><h2>إعدادات التشابك</h2><p>تفعيل الاقتراحات اختياري. عند التفعيل يمكن للأعضاء الذين فعّلوا الاكتشاف رؤية ملفك المهني المتاح وإرسال طلب تعارف لغرض محدد. يمكنك إيقاف الاقتراحات لاحقاً.</p><label class="networkSwitch"><input id="networkDiscovery" type="checkbox" '+(settings.enabled?'checked':'')+'> السماح باقتراح ملفي المهني للأعضاء</label><p>'+jlink('/onboarding','تعديل الاهتمامات والخصوصية')+'</p></section>'+
 suggestions+
 '<section class="journeyPanel networkWide"><h2>طلبات التعارف وخطوات التعاون</h2><p>كل طلب يبدأ بغرض واضح، ولا يصبح علاقة مقبولة إلا بموافقة الطرف الآخر. تسجيل النتيجة هنا إفادة ذاتية، وليس اعتماداً للأثر.</p><div class="networkCards">'+(relationCards||networkEmpty('لم تُسجل طلبات تعارف بعد.'))+'</div></section>');
 return true;
}
async function networkAction(el){
 if(!el?.hasAttribute('data-network'))return false;
 const action=el.dataset.network,id=Number(el.dataset.id);
 try{
  if(action==='invite'){
   const purpose=prompt('ما الغرض من التعارف مع '+el.dataset.name+'؟ صف التعاون المقترح:');
   if(purpose===null)return true;
   await api('network/relations','POST',{recipient_id:id,purpose:purpose.trim()});notify('أُرسل طلب التعارف للعضو');
  }else if(action==='plan'){
   const next_step=prompt('ما خطوة العمل المتفق عليها؟');
   if(next_step===null)return true;
   await api('network/relations/'+id,'PATCH',{action:'plan',next_step:next_step.trim()});notify('تم تسجيل خطوة العمل');
  }else if(action==='result'){
   const outcome=prompt('صف النتيجة الفعلية وحدودها (إفادة ذاتية):');
   if(outcome===null)return true;
   const evidence_url=prompt('رابط دليل HTTPS، إن وجد (اختياري):')||'';
   await api('network/relations/'+id,'PATCH',{action:'result',outcome:outcome.trim(),evidence_url:evidence_url.trim()});notify('تم تسجيل نتيجة مبلغ عنها، دون اعتماد مستقل');
  }else{
   if(action==='reject'||action==='close'){
    if(!confirm(action==='reject'?'رفض طلب التعارف؟':'إغلاق العلاقة؟'))return true;
   }
   await api('network/relations/'+id,'PATCH',{action});notify('تم تحديث العلاقة');
  }
  await route();
 }catch(e){notify(e.message)}
 return true;
}
document.addEventListener('change',async e=>{
 if(e.target?.id!=='networkDiscovery')return;
 const el=e.target,enabled=el.checked;el.disabled=true;
 try{await api('network/settings','PATCH',{enabled});notify(enabled?'تم تفعيل الاكتشاف المهني':'تم إيقاف الاكتشاف المهني');await route()}
 catch(error){el.checked=!enabled;notify(error.message)}
 finally{el.disabled=false}
});

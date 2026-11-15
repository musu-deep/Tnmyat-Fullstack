'use strict';
// Member journey UI. Profiles, personal calendars and project selections are scoped to the signed-in member.
const JOURNEY_SECTORS=['التعليم','البيئة','المجتمع','الاقتصاد','الصحة','الإغاثة','البنية التحتية','المياه','الطاقة','التقنية'];
let journeyMapInstance=null;
const JOURNEY_MONTHS=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const journeyDate=s=>new Date(s+'T12:00:00Z').toLocaleDateString('ar',{year:'numeric',month:'long',day:'numeric'});
const jlink=(url,label)=>'<a class="journeyLink" href="'+url+'">'+label+'</a>';
const jempty=t=>'<p class="journeyEmpty">'+t+'</p>';
const jNav=()=>'<nav class="journeyNav" aria-label="مساحتي التنموية">'+[
 ['/my-space','لوحتي'],['/my-calendar','تقويمي'],['/my-map','خارطتي'],['/my-projects','مشاريعي'],['/my-news','أخباري'],['/my-impact','أهدافي وأثري'],['/onboarding','تفضيلاتي']
].map(([url,label])=>'<a href="'+url+'" class="'+(location.pathname===url?'active':'')+'">'+label+'</a>').join('')+'</nav>';
function jShell(title,subtitle,body){document.title=title+' | تنميات';main.innerHTML='<div class="journeyPage"><div class="journeyHeader"><span>مساحتي التنموية</span><h1>'+title+'</h1><p>'+subtitle+'</p></div>'+jNav()+body+'</div>';}
function jFields(p){
 const inputs=(key,label,max=100)=>'<label>'+label+'<input name="'+key+'" maxlength="'+max+'" value="'+esc(p[key]||'')+'"></label>';
 return '<form id="journeyPrefs" class="journeyForm">'+
 '<h2>لماذا انضممت إلى مجتمع تنميات؟</h2><p>خصص تجربتك بما يناسب مجالاتك واحتياجاتك. يمكنك تعديل هذه البيانات أو تجاوزها في أي وقت.</p>'+
 '<div class="journeyFields">'+inputs('professional_role','الصفة المهنية',80)+inputs('organization','الجهة أو المؤسسة',120)+inputs('country','الدولة',80)+inputs('city','المدينة',80)+'</div>'+
 '<label>هدفك من الانضمام<textarea name="goal" maxlength="400" placeholder="مثلاً: تطوير مبادرات تعليمية وبناء شراكات مهنية">'+esc(p.goal||'')+'</textarea></label>'+
 '<fieldset><legend>مجالات اهتمامك (اختر ما يناسبك)</legend><div class="journeySectors">'+JOURNEY_SECTORS.map(s=>'<label><input type="checkbox" name="sectors" value="'+s+'" '+(p.sectors.includes(s)?'checked':'')+'><span>'+s+'</span></label>').join('')+'</div></fieldset>'+
 '<label class="journeyCheck"><input type="checkbox" name="news_enabled" '+(p.news_enabled?'checked':'')+'> تفعيل شريط «أخباري» الشخصي</label>'+
 '<div class="error" role="alert"></div><div class="journeyFormActions"><button type="submit" class="btn primary">حفظ تفضيلاتي ومتابعة المجتمع</button><button type="button" class="btn" data-journey="skip-onboarding">تخطي الآن</button></div></form>';
}
async function renderJourney(token){
 const path=location.pathname.replace(/\/$/,'');
 const supported=['/onboarding','/my-space','/my-calendar','/my-map','/my-projects','/my-news','/my-impact'];
 if(!supported.includes(path))return false;
 if(!user){go('/welcome');return true;}
 main.innerHTML='<div class="status">جارٍ تحميل مساحتك التنموية...</div>';
 try{
 if(path==='/onboarding'){
  const {preferences}=await api('journey/preferences');if(token!==version)return true;
  jShell('ملفي المهني وتفضيلاتي','خدمات المجتمع تتكيف مع اهتماماتك المهنية.',jFields(preferences));
 }
 if(path==='/my-space'){
  const [dash,recs,alerts]=await Promise.all([api('journey/dashboard'),api('journey/recommendations'),api('journey/alerts')]);if(token!==version)return true;
  const v=dash.summary,p=dash.preferences,metrics=[['المنشورات',v.posts],['أتابع',v.following],['المواعيد',v.calendar],['مشاريع محفوظة',v.saved_projects],['الأهداف النشطة',v.goals],['تقارير الإنجاز',v.impact]];
  const cards=metrics.map(([title,n])=>'<div class="journeyStat"><strong>'+Number(n).toLocaleString('ar')+'</strong><span>'+title+'</span></div>').join('');
  jShell('لوحتي التنموية','نظرة موحدة على اهتماماتك ونشاطك وأهدافك ومشاريعك.',
   '<div class="journeyStats">'+cards+'</div><div class="journeyColumns"><section class="journeyPanel"><h2>اهتماماتي</h2><p>'+(p.sectors.length?p.sectors.map(esc).join(' · '):'لم تحدد اهتماماتك بعد')+'</p><p>'+esc(p.goal||'أضف هدفك حتى نقدم لك محتوى أكثر ملاءمة.')+'</p>'+jlink('/onboarding','تعديل الاهتمامات')+'</section>'+
   '<section class="journeyPanel"><h2>أبرز المنشورات المناسبة لك</h2>'+(recs.posts.length?recs.posts.map(x=>'<p><a href="/post/'+x.id+'">'+esc(x.title||x.topic)+'</a><small> · '+esc(x.topic)+'</small></p>').join(''):jempty('ستظهر توصيات المحتوى بعد تحديد اهتماماتك.'))+'</section>'+
   '<section class="journeyPanel"><h2>تنبيهات مواعيدي</h2>'+(alerts.alerts.length?alerts.alerts.map(a=>'<p><a href="'+a.url+'">'+esc(a.title)+'</a><small> · '+journeyDate(a.date)+'</small></p>').join(''):jempty('لا توجد مواعيد خلال الأسبوعين القادمين.'))+'</section>'+ '<section class="journeyPanel"><h2>مجموعات مقترحة</h2>'+(recs.groups.length?recs.groups.map(g=>'<p><a href="/groups/'+g.id+'">'+esc(g.name)+'</a></p>').join(''):jempty('لا توجد مجموعات متطابقة حالياً.'))+'</section>'+
   '<section class="journeyPanel"><h2>مؤشر الأثر المبلغ عنه</h2><strong class="journeyBigNumber">'+Number(v.beneficiaries).toLocaleString('ar')+'</strong><p>مستفيد ورد في تقارير الإنجاز الشخصية؛ لا يُعد رقماً معتمداً قبل التحقق.</p>'+jlink('/my-impact','إدارة الأهداف والإنجازات')+'</section></div>');
 }
 if(path==='/my-calendar'){
  const [cal,global]=await Promise.all([api('journey/calendar'),api('hub/events?year='+new Date().getFullYear())]);if(token!==version)return true;
  const params=new URL(location.href).searchParams;
  const calYear=Math.min(2100,Math.max(2020,Number(params.get('year'))||new Date().getFullYear()));
  const m=Number(params.get('month')),calMonth=Math.min(11,Math.max(0,Number.isInteger(m)&&params.has('month')?m:new Date().getMonth()));
  hubYearEvents=cal.items.map(x=>({...x,category:'program',description:x.note||'',source_url:''}));
  const prev=new Date(calYear,calMonth-1,1),next=new Date(calYear,calMonth+1,1);
  const monthNav='<div class="journeyCalNav"><a href="/my-calendar?year='+prev.getFullYear()+'&month='+prev.getMonth()+'">‹ السابق</a><strong>'+JOURNEY_MONTHS[calMonth]+' '+calYear+'</strong><a href="/my-calendar?year='+next.getFullYear()+'&month='+next.getMonth()+'">التالي ›</a></div>';
  const monthGrid=monthNav+hubMonthGrid(calYear,calMonth,hubYearEvents,'year')+'<div id="hubCalendarDetails" class="hubCalendarDetails">اختر اليوم لاستعراض مواعيده.</div>';
  const my=cal.items.map(x=>'<div class="journeyItem"><div><strong>'+esc(x.title)+'</strong><small>'+journeyDate(x.event_date)+'</small><p>'+esc(x.note)+'</p></div><button type="button" data-journey="delete-calendar" data-id="'+x.id+'">حذف</button></div>').join('');
  const {preferences}=await api('journey/preferences');
  const suggestions=global.events.filter(e=>!preferences.sectors.length||preferences.sectors.some(t=>(e.title+' '+e.description).includes(t))).filter(e=>e.event_date>=new Date().toISOString().slice(0,10)).slice(0,12);
  jShell('تقويمي','مواعيدك الخاصة ومناسبات التنمية الملائمة لك.',
   '<div class="journeyColumns"><section class="journeyPanel"><h2>إضافة موعد شخصي</h2><form id="journeyCalendarForm" class="journeyForm"><label>العنوان<input name="title" required minlength="3" maxlength="160"></label><label>التاريخ<input name="event_date" type="date" required></label><label>ملاحظات<textarea name="note" maxlength="500"></textarea></label><div class="error"></div><button class="btn primary" type="submit">إضافة إلى تقويمي</button></form></section>'+
   '<section class="journeyPanel"><h2>تقويمي الشهري</h2>'+monthGrid+'</section>'+
   '<section class="journeyPanel journeyWide"><h2>مواعيدي</h2>'+(my||jempty('لم تضف أي موعد بعد.'))+'</section>'+
   '<section class="journeyPanel journeyWide"><h2>فعاليات مقترحة من التقويم العام</h2>'+(suggestions.length?suggestions.map(e=>'<div class="journeyItem"><div><strong>'+esc(e.title)+'</strong><small>'+journeyDate(e.event_date)+'</small></div><button type="button" data-journey="save-event" data-id="'+e.id+'" data-title="'+esc(e.title)+'" data-date="'+e.event_date+'">أضف إلى تقويمي</button></div>').join(''):jempty('لا توجد فعاليات مطابقة في الفترة الحالية.'))+'</section></div>');
 }
 if(path==='/my-map'){
  const [saved,publicMap]=await Promise.all([api('journey/map'),api('hub/projects')]);if(token!==version)return true;
  const projects=saved.projects,publicProjects=publicMap.projects.filter(p=>!projects.some(x=>x.id===p.id)).slice(0,16);
  if(journeyMapInstance){try{journeyMapInstance.remove();}catch{}journeyMapInstance=null;}
  jShell('خارطتي','المشاريع والبرامج التنموية التي تتابعها، مع روابط إلى المواقع.',
    '<section class="journeyPanel"><h2>خارطة مشاريعي</h2><p>احفظ مشروعاً منشوراً لتتابعه هنا. لإضافة مشروع جديد إلى تنميات، أرسله للمراجعة أولاً.</p><button type="button" class="btn primary" data-hub="submit-project">＋ إضافة مشروعي إلى الخارطة العامة</button><div id="journeyMap"></div></section><section class="journeyPanel"><h2>مشاريع محفوظة</h2>'+(projects.length?projects.map(p=>'<div class="journeyItem"><div><strong>'+esc(p.title)+'</strong><small>'+esc(p.city+', '+p.country)+' · '+esc(p.category)+'</small></div><div><a href="https://www.google.com/maps/dir/?api=1&amp;destination='+encodeURIComponent(p.latitude+','+p.longitude)+'" target="_blank" rel="noopener noreferrer">الموقع</a> <button type="button" data-journey="toggle-project" data-id="'+p.id+'" data-saved="false">إزالة</button></div></div>').join(''):jempty('احفظ مشروعاً من الخارطة العامة ليظهر هنا.'))+jlink('/map','استعرض الخارطة العامة')+'</section><section class="journeyPanel journeyWide"><h2>مشاريع يمكنك حفظها</h2>'+(publicProjects.length?publicProjects.map(p=>'<div class="journeyItem"><div><strong>'+esc(p.title)+'</strong><small>'+esc(p.category)+' · '+esc(p.city||p.country)+'</small></div><button type="button" data-journey="save-project-from-map" data-id="'+p.id+'">＋ حفظ في خارطتي</button></div>').join(''):jempty('لا توجد مشاريع منشورة أخرى حالياً. يمكنك إضافة مشروع جديد وطلب اعتماده.'))+'</section>');
  if(typeof L!=='undefined'){
   if(journeyMapInstance){journeyMapInstance.remove();journeyMapInstance=null;}
   journeyMapInstance=L.map('journeyMap',{scrollWheelZoom:false}).setView([24,40],3);
   L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'© OpenStreetMap contributors'}).addTo(journeyMapInstance);
   const pins=projects.map(p=>L.marker([p.latitude,p.longitude]).bindPopup(esc(p.title)+' — '+esc(p.country)).addTo(journeyMapInstance));
   if(pins.length)journeyMapInstance.fitBounds(L.featureGroup(pins).getBounds(),{maxZoom:8,padding:[22,22]});
   setTimeout(()=>journeyMapInstance?.invalidateSize(),100);
  }else document.querySelector('#journeyMap').textContent='الخريطة غير متاحة؛ استعرض بيانات المشاريع وروابط مواقعها أدناه.';
 }
 if(path==='/my-projects'){
  const {projects}=await api('journey/collaboration');if(token!==version)return true;
  const selected=Number(new URL(location.href).searchParams.get('id')||projects[0]?.id||0);
  let details='';
  if(selected){
   const record=projects.find(p=>p.id===selected);
   if(record&&(record.owner||record.participation==='approved')){
    const work=await api('journey/projects/'+selected+'/work');if(token!==version)return true;
    const memberOptions='<option value="">بدون تكليف</option>'+'<option value="'+user.id+'">أنا</option>'+work.members.filter(m=>m.status==='approved').map(m=>'<option value="'+m.user_id+'">'+esc(m.name)+'</option>').join('');
    details='<section class="journeyPanel"><h2>فريق المشروع ومهامه — '+esc(work.project.title)+'</h2>'+
    (work.owner?'<h3>طلبات الانضمام</h3>'+(work.members.filter(m=>m.status==='pending').map(m=>'<div class="journeyItem"><strong>'+esc(m.name)+'</strong><div><button data-journey="review-member" data-project="'+selected+'" data-member="'+m.user_id+'" data-status="approved">قبول</button> <button data-journey="review-member" data-project="'+selected+'" data-member="'+m.user_id+'" data-status="rejected">رفض</button></div></div>').join('')||jempty('لا توجد طلبات قيد المراجعة.')):'')+
    '<h3>الفريق</h3>'+(work.members.filter(m=>m.status==='approved').map(m=>'<p>'+esc(m.name)+'</p>').join('')||jempty('لا يوجد متعاونون معتمدون بعد.'))+
    '<h3>المهام</h3>'+(work.tasks.map(t=>'<div class="journeyItem"><div><strong>'+esc(t.title)+'</strong><small>'+(t.status==='done'?'مكتملة':'قيد التنفيذ')+(t.due_date?' · '+journeyDate(t.due_date):'')+'</small></div>'+(t.status==='open'&&(work.owner||t.assigned_to===user.id)?'<button data-journey="complete-task" data-id="'+t.id+'">إنجاز</button>':'')+'</div>').join('')||jempty('لم تُضف مهام بعد.'))+
    (work.owner?'<form id="journeyTaskForm" data-project="'+selected+'" class="journeyForm"><label>مهمة جديدة<input name="title" required minlength="3" maxlength="160"></label><label>موعد الاستحقاق<input name="due_date" type="date"></label><label>التكليف<select name="assigned_to">'+memberOptions+'</select></label><div class="error"></div><button class="btn primary" type="submit">إضافة المهمة</button></form>':'')+'</section>';
   }
  }
  jShell('مشاريعي وتعاوني','إدارة مشاركتك وطلبات التعاون ومهام المشاريع التنموية.',
   '<section class="journeyPanel"><h2>إنشاء مشروع تنموي</h2><p>أضف بيانات مشروعك وموقعه. يظهر المشروع في «مشاريعي» فور إرساله، ويُنشر على الخارطة العامة بعد اعتماده.</p><button type="button" class="btn primary" data-hub="submit-project">＋ إنشاء مشروع جديد</button></section><section class="journeyPanel"><h2>المشاريع المرتبطة بي</h2>'+(projects.length?projects.map(p=>'<div class="journeyItem"><div><strong>'+esc(p.title)+'</strong><small>'+(p.owner?'مشروعي':p.participation==='approved'?'مشارك معتمد':'طلب انضمام: '+(p.participation==='pending'?'قيد المراجعة':'غير معتمد'))+'</small></div><a class="journeyLink" href="/my-projects?id='+p.id+'">التفاصيل</a></div>').join(''):jempty('لم تسجل مشاريع أو طلبات تعاون بعد.'))+'</section>'+details+jlink('/map','استكشف مشاريع المجتمع'));
 }
 if(path==='/my-news'){
  const [{preferences},news,links]=await Promise.all([api('journey/preferences'),api('journey/news'),api('journey/news-links')]);if(token!==version)return true;
  const options=JOURNEY_SECTORS.map(t=>'<option value="'+t+'">'+t+'</option>').join('');
  jShell('أخباري','الأخبار المناسبة لاهتماماتك، وروابط القراءة التي تحتفظ بها لنفسك.',
   '<div class="journeyColumns"><section class="journeyPanel"><h2>اهتمامات النشرة</h2><p>'+esc(preferences.sectors.join('، ')||'لم تختر مجالات بعد')+'</p><p>الأخبار العامة ينشرها فريق التحرير. أما الروابط التي تضيفها أدناه فهي محفوظة في حسابك فقط ولا تنشر للعموم.</p>'+jlink('/onboarding','تعديل مجالات اهتمامي')+'</section>'+
   '<section class="journeyPanel"><h2>أضف خبراً أو مرجعاً إلى مكتبتي</h2><form class="journeyForm" id="journeyNewsLinkForm"><label>عنوان الخبر أو المرجع<input name="headline" required minlength="5" maxlength="180"></label><label>الرابط الأصلي للمصدر<input name="source_url" type="url" required placeholder="https://example.org/news"></label><label>المجال<select name="category">'+options+'</select></label><label>ملاحظتي الخاصة<textarea name="note" maxlength="500"></textarea></label><div class="error" role="alert"></div><button type="submit" class="btn primary">حفظ في أخباري</button></form></section>'+
   '<section class="journeyPanel"><h2>أخبار التنمية المناسبة</h2>'+(news.fallback?'<p class="journeyHint">لا توجد أخبار تطابق المجالات المحددة حالياً؛ نعرض أحدث الأخبار العامة ريثما يتوفر محتوى ملائم.</p>':'')+(news.disabled?jempty('الأخبار الشخصية معطلة من تفضيلاتك.'):news.news.length?news.news.map(n=>'<div class="journeyItem"><div><a href="'+esc(n.source_url)+'" rel="noopener noreferrer" target="_blank">'+esc(n.headline)+'</a><small>'+esc(n.source_name)+' · '+esc(n.published_at)+'</small></div></div>').join(''):jempty('لا توجد أخبار منشورة تطابق اهتماماتك حتى الآن. يمكنك حفظ روابطك الخاصة أدناه.'))+'</section>'+
   '<section class="journeyPanel"><h2>الروابط التي حفظتها</h2>'+(links.links.length?links.links.map(n=>'<div class="journeyItem"><div><a href="'+esc(n.source_url)+'" target="_blank" rel="noopener noreferrer">'+esc(n.headline)+'</a><small>'+esc(n.category)+' · '+esc(n.note||'رابط شخصي محفوظ')+'</small></div><button data-journey="delete-news-link" data-id="'+n.id+'" type="button">إزالة</button></div>').join(''):jempty('لم تحفظ روابط شخصية بعد.'))+'</section></div>');
 }
 if(path==='/my-impact'){
  const [goals,impact]=await Promise.all([api('journey/goals'),api('journey/impact')]);if(token!==version)return true;
  jShell('أهدافي وأثري','توثيق أهدافك ونتائج المبادرات والأعمال التنموية.',
   '<div class="journeyColumns"><section class="journeyPanel"><h2>هدف جديد</h2><form id="journeyGoalForm" class="journeyForm"><label>عنوان الهدف<input name="title" minlength="3" maxlength="160" required></label><label>وصف الهدف<textarea name="description" maxlength="1000"></textarea></label><div class="error"></div><button class="btn primary" type="submit">إضافة الهدف</button></form></section>'+
   '<section class="journeyPanel"><h2>أهدافي</h2>'+(goals.goals.length?goals.goals.map(g=>'<div class="journeyItem"><div><strong>'+esc(g.title)+'</strong><small>'+(g.status==='completed'?'مكتمل':'نشط')+'</small></div>'+(g.status==='active'?'<button data-journey="complete-goal" data-id="'+g.id+'">إنجاز</button>':'')+'</div>').join(''):jempty('لم تضف أهدافاً بعد.'))+'</section>'+
   '<section class="journeyPanel"><h2>توثيق إنجاز</h2><form id="journeyImpactForm" class="journeyForm"><label>عنوان الإنجاز<input name="title" required minlength="4" maxlength="160"></label><label>وصف النتائج<textarea name="outcome" required minlength="15" maxlength="1600"></textarea></label><label>المستفيدون<input name="beneficiaries" type="number" min="0" value="0"></label><label>رابط الدليل (اختياري)<input name="evidence_url" type="url"></label><div class="error"></div><button class="btn primary" type="submit">حفظ تقرير الإنجاز</button></form></section>'+
   '<section class="journeyPanel"><h2>تقارير الإنجاز</h2>'+(impact.reports.length?impact.reports.map(r=>'<div class="journeyItem"><div><strong>'+esc(r.title)+'</strong><p>'+esc(r.outcome)+'</p><small>تقرير ذاتي غير متحقق · '+Number(r.beneficiaries)+' مستفيد</small></div></div>').join(''):jempty('لم تسجل إنجازات بعد.'))+'</section></div>');
 }
 }catch(e){if(token===version)main.innerHTML='<div class="status">'+esc(e.message)+' <a href="/wall">العودة للحائط</a></div>';}
 return true;
}
async function journeyAction(el){
 if(!el?.hasAttribute('data-journey'))return false;
 const kind=el.dataset.journey;
 if(kind==='skip-onboarding'){go('/wall');return true;}
 const id=Number(el.dataset.id);
 try{
 if(kind==='join-project'){await api('journey/projects/'+id+'/join','POST');notify('أُرسل طلب المشاركة لصاحب المشروع');}
 if(kind==='review-member'){await api('journey/projects/'+Number(el.dataset.project)+'/members/'+Number(el.dataset.member),'PATCH',{status:el.dataset.status});notify('تم توثيق القرار');}
 if(kind==='complete-task'){await api('journey/tasks/'+id,'PATCH',{status:'done'});notify('سُجل إنجاز المهمة');}
 if(kind==='delete-news-link'){await api('journey/news-links/'+id,'DELETE');notify('أُزيل الرابط من أخبارك');}
 if(kind==='delete-calendar'){await api('journey/calendar/'+id,'DELETE');notify('أُزيل الموعد');}
 if(kind==='save-event'){await api('journey/calendar','POST',{title:el.dataset.title,event_date:el.dataset.date,event_id:id});notify('أُضيفت الفعالية إلى تقويمك');}
 if(kind==='toggle-project'){await api('journey/map/'+id,'PUT',{saved:el.dataset.saved==='true'});notify(el.dataset.saved==='true'?'أُضيف المشروع إلى خارطتك':'أُزيل المشروع من خارطتك');}
 if(kind==='complete-goal'){await api('journey/goals/'+id,'PATCH',{status:'completed'});notify('تم تسجيل إنجاز الهدف');}
 if(kind==='save-project-from-map'){await api('journey/map/'+id,'PUT',{saved:true});notify('أُضيف المشروع إلى خارطتك');}
 await route();
 }catch(e){notify(e.message);}
 return true;
}
async function journeyForm(form,data){
 const id=form?.id;
 if(!['journeyPrefs','journeyCalendarForm','journeyGoalForm','journeyImpactForm','journeyTaskForm','journeyNewsLinkForm'].includes(id))return false;
 const btn=form.querySelector('button[type=submit],button:not([type])'),err=form.querySelector('.error');
 if(!btn)return true;
 if(btn.disabled)return true;btn.disabled=true;if(err)err.textContent='';
 try{
 if(id==='journeyNewsLinkForm'){await api('journey/news-links','POST',data);notify('حُفظ الرابط في أخبارك الخاصة');await route();}
 if(id==='journeyTaskForm'){await api('journey/projects/'+Number(form.dataset.project)+'/tasks','POST',{...data,assigned_to:data.assigned_to?Number(data.assigned_to):null});notify('أُضيفت المهمة');await route();}
 if(id==='journeyPrefs'){
  const payload={...data,sectors:[...form.querySelectorAll('[name=sectors]:checked')].map(x=>x.value),news_enabled:form.querySelector('[name=news_enabled]').checked,onboarding_complete:true};
  await api('journey/preferences','PATCH',payload);notify('حُفظت تفضيلاتك');go('/my-space');
 }
 if(id==='journeyCalendarForm'){await api('journey/calendar','POST',data);notify('تمت إضافة الموعد');await route();}
 if(id==='journeyGoalForm'){await api('journey/goals','POST',data);notify('تمت إضافة الهدف');await route();}
 if(id==='journeyImpactForm'){await api('journey/impact','POST',{...data,beneficiaries:Number(data.beneficiaries||0)});notify('تم تسجيل الإنجاز بوصفه تقريراً ذاتياً');await route();}
 }catch(e){if(err)err.textContent=e.message;else notify(e.message);}finally{btn.disabled=false;}
 return true;
}

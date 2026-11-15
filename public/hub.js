'use strict';
// Public development calendar and geospatial hub; all member submissions are reviewed.
const HUB_TOPICS=['التعليم','البيئة','المجتمع','الاقتصاد','الصحة','البنية التحتية','المياه','الطاقة','التقنية','أخرى'];
const HUB_MONTHS=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const HUB_KINDS={international_day:'يوم دولي',conference:'مؤتمر',local_event:'فعالية محلية',program:'برنامج'};
let hubMap=null, hubMapMarkers=[], hubProjects=[], hubCalendarYear=new Date().getFullYear(),hubYearEvents=[];
let hubSidebarMonth=new Date().getMonth(), hubSidebarYear=new Date().getFullYear(), hubSidebarEvents=[];
const hubWeekdays=['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
function hubLocalDate(d=new Date()){return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');}
function hubMonthEvents(events,year,month){const start=year+'-'+String(month+1).padStart(2,'0')+'-01',end=hubLocalDate(new Date(year,month+1,0));return events.filter(e=>e.event_date<=end&&(e.end_date||e.event_date)>=start);}
function hubDateEvents(events,date){return events.filter(e=>e.event_date<=date&&(e.end_date||e.event_date)>=date);}
function hubMonthGrid(year,month,events,scope){
 const first=new Date(year,month,1).getDay(),total=new Date(year,month+1,0).getDate(),today=hubLocalDate();
 const start=new Date(year,month,1-first), cells=[];
 for(let i=0;i<42;i++){const d=new Date(start.getFullYear(),start.getMonth(),start.getDate()+i),iso=hubLocalDate(d),inside=d.getMonth()===month,items=inside?hubDateEvents(events,iso):[];
  cells.push(inside?'<button type="button" class="hubDate'+(iso===today?' hubDateToday':'')+(items.length?' hubDateHasEvent':'')+'" data-hub="calendar-day" data-date="'+iso+'" data-scope="'+scope+'" aria-label="'+d.getDate()+' '+HUB_MONTHS[month]+'، '+items.length+' مناسبات" title="'+items.map(e=>hubEscape(e.title)).join('، ')+'"><span>'+d.getDate()+'</span>'+(items.length?'<i aria-hidden="true"></i>':'')+'</button>':'<span class="hubDateOutside" aria-hidden="true">'+d.getDate()+'</span>');
 }
 // A stable six-row grid avoids the widget jumping between months.
 return '<div class="hubCalendarGrid" role="group" aria-label="أيام '+HUB_MONTHS[month]+' '+year+'">'+hubWeekdays.map(day=>'<span class="hubWeekday">'+day.slice(0,1)+'</span>').join('')+cells.join('')+'</div>';
}
function hubDayDetails(events,date){const items=hubDateEvents(events,date);return '<div class="hubDayDetailTitle">'+hubEscape(hubDay(date))+' <span>'+items.length+' مناسبة</span></div>'+hubEventList(items,12);}
function hubUpdateDock(){
 const anchor=document.querySelector('#hubTickers'),bands=anchor?.querySelector('.hubTickers');
 if(!anchor||!bands||location.pathname!=='/wall'){document.body.classList.remove('hubTickerDocked');return;}
 // Anchor remains in normal document flow, even when bands are fixed.
 const topbar=document.querySelector('body > header')?.getBoundingClientRect().height||66;
 const dock=anchor.getBoundingClientRect().bottom<topbar;
 anchor.style.minHeight=bands.offsetHeight+'px';
 bands.classList.toggle('hubTickersDocked',dock);
 document.body.classList.toggle('hubTickerDocked',dock);
}
window.addEventListener('scroll',hubUpdateDock,{passive:true});
window.addEventListener('resize',hubUpdateDock,{passive:true});
const hubEscape=v=>esc(v);
function hubExternalLink(href,label){try{const u=new URL(href);if(u.protocol!=='https:')return '';return '<a href="'+hubEscape(u.href)+'" target="_blank" rel="noopener noreferrer">'+hubEscape(label)+'</a>';}catch{return '';}}
function hubDay(d){return new Intl.DateTimeFormat('ar',{day:'numeric',month:'short',year:'numeric'}).format(new Date(d+'T12:00:00Z'));}
function hubTickerMarkup(news,personalNews=[],showPersonal=false){
 const lanes=[1,2].map(lane=>{
   const items=news.filter(n=>n.lane===lane);
   const content=items.length?items.map(n=>'<span class="hubNewsItem"><span class="hubNewsTag">'+hubEscape(n.category)+'</span><a href="'+hubEscape(n.source_url)+'" target="_blank" rel="noopener noreferrer" title="'+hubEscape(n.source_name)+'">'+hubEscape(n.headline)+'</a><small>'+hubEscape(n.source_name)+' · '+hubEscape(hubDay(n.published_at))+'</small></span>').join(''):
   '<span class="hubNewsEmpty">'+(lane===1?'أخبار التنمية الموثقة — بانتظار تحديث التحرير':'المبادرات والفعاليات — تابع التقويم التنموي')+'</span>';
   return '<div class="hubTicker hubTicker-'+lane+'" aria-label="'+(lane===1?'أخبار التنمية':'المبادرات والفعاليات')+'"><span class="hubTickerLabel">'+(lane===1?'أخبار التنمية':'الفعاليات والمبادرات')+'</span><div class="hubTickerViewport"><div class="hubTickerTrack"'+(items.length?'':' data-empty="true"')+'>'+content+(items.length?content:'')+'</div></div></div>';
 });return '<section class="hubTickers" aria-label="أخبار التنمية والفعاليات">'+lanes.join('')+(showPersonal?'<div class="hubTicker hubTicker-3" aria-label="أخباري وفق اهتماماتي"><span class="hubTickerLabel">أخباري <a href="/my-news" title="عرض أخباري">✦</a></span><div class="hubTickerViewport"><div class="hubTickerTrack"'+(personalNews.length?'':' data-empty="true"')+'>'+(personalNews.length?personalNews.map(n=>'<span class="hubNewsItem"><span class="hubNewsTag">'+hubEscape(n.category)+'</span><a href="'+hubEscape(n.source_url)+'" '+(n.source_url.startsWith('/')?'':'target="_blank" rel="noopener noreferrer"')+'>'+hubEscape(n.headline)+'</a></span>').join(''):'<a href="/onboarding">حدد اهتماماتك لتخصيص الأخبار</a>')+'</div></div></div>':'')+'</section>';
}
async function hubRefreshTickers(token){const node=document.querySelector('#hubTickers');if(!node)return;try{const [r,p]=await Promise.all([api('hub/news'),user?api('journey/news').catch(()=>({news:[],disabled:true})):Promise.resolve({news:[],disabled:true})]);if(token===version&&node.isConnected){node.innerHTML=hubTickerMarkup(r.news,p.news||[],Boolean(user&&!p.disabled));hubUpdateDock();}}catch{node.textContent='تعذّر تحديث شريط الأخبار حالياً.';}}
function hubEventList(events,limit=8){return events.length?events.slice(0,limit).map(e=>'<article class="hubEventItem"><span class="hubEventDate">'+hubEscape(hubDay(e.event_date))+'</span><strong>'+hubEscape(e.title)+'</strong><small>'+hubEscape(HUB_KINDS[e.category]||e.category)+'</small>'+(e.source_url?hubExternalLink(e.source_url,'المصدر'):'')+(user?.role==='admin'?'<button type="button" data-hub="hide-event" data-id="'+e.id+'" class="hubUnpublish">سحب من التقويم</button>':'')+'</article>').join(''):'<p class="muted">لا توجد فعاليات منشورة لهذه الفترة.</p>';}
async function hubSidebar(token){
 const el=document.querySelector('#hubCalendarPreview');if(!el)return;
 try{
  const year=hubSidebarYear,{events}=await api('hub/events?year='+year);if(token!==version||!el.isConnected)return;
  hubSidebarEvents=events;
  const m=hubSidebarMonth,y=hubSidebarYear,monthItems=hubMonthEvents(events,y,m);
  el.innerHTML='<div class="hubSideTitle"><h2>التقويم التنموي</h2><a href="/calendar">التقويم السنوي</a></div>'+
   '<div class="hubCalendarToolbar"><button type="button" data-hub="calendar-prev" aria-label="الشهر السابق">‹</button><strong>'+HUB_MONTHS[m]+' '+y+'</strong><button type="button" data-hub="calendar-next" aria-label="الشهر التالي">›</button></div>'+
   hubMonthGrid(y,m,monthItems,'side')+'<div class="hubCalendarLegend"><span>● أيام الفعاليات</span><button type="button" data-hub="calendar-today">اليوم</button></div>'+
   '<div id="hubSideDayDetails" class="hubCalendarDetails">'+(y===new Date().getFullYear()&&m===new Date().getMonth()?hubDayDetails(events,hubLocalDate()):'<p class="muted">اختر يوماً لعرض مناسباته.</p>')+'</div>';
 }catch{if(el.isConnected)el.textContent='تعذر تحميل التقويم.';}
}
function hubCalendarGrid(year,events){
 return '<div class="hubYearGrid">'+HUB_MONTHS.map((label,m)=>{
 const items=hubMonthEvents(events,year,m);
 return '<section class="hubMonth" aria-label="'+label+' '+year+'"><div class="hubMonthHead"><h3>'+label+'</h3><b>'+items.length+' مناسبة</b></div>'+hubMonthGrid(year,m,items,'year')+'</section>';
 }).join('')+'</div>';
}
async function hubCalendar(token){
 hubCalendarYear=Number(new URL(location.href).searchParams.get('year'))||new Date().getFullYear();
 if(hubCalendarYear<2020||hubCalendarYear>2100)hubCalendarYear=new Date().getFullYear();
 main.innerHTML='<div class="hubPage"><div class="hubHead"><div><span class="hubKicker">الفعاليات والأيام الدولية</span><h1>التقويم التنموي السنوي</h1><p>استعرض الأيام الدولية والمؤتمرات والفعاليات بحسب اليوم والشهر والسنة.</p></div><div class="hubYearNav"><a href="/calendar?year='+(hubCalendarYear-1)+'" aria-label="العام السابق">‹</a><strong>'+hubCalendarYear+'</strong><a href="/calendar?year='+(hubCalendarYear+1)+'" aria-label="العام التالي">›</a></div></div><section class="hubCalendarSelection" id="hubCalendarDetails" aria-live="polite"><p class="muted">اختر يوماً في التقويم لعرض الفعاليات المرتبطة به.</p></section><div id="hubYearResults" class="hubLoading">جارٍ تحميل فعاليات العام...</div>'+(user?.role==='admin'?'<button data-hub="new-event" class="btn primary">+ إضافة فعالية موثقة</button>':'')+'</div>';
 const {events}=await api('hub/events?year='+hubCalendarYear);if(token!==version)return;hubYearEvents=events;
 document.querySelector('#hubYearResults').innerHTML=hubCalendarGrid(hubCalendarYear,events);
}
function hubProjectCard(p){return '<article class="hubProjectCard" data-project="'+p.id+'"><div class="hubProjectCardHead"><b>'+hubEscape(p.title)+'</b><span>'+hubEscape(p.category)+'</span></div><p>'+hubEscape(p.summary)+'</p><small>'+hubEscape([p.city,p.country].filter(Boolean).join('، '))+' · '+hubEscape(p.entity_name||p.owner)+'</small><div class="hubProjectMeta"><span>المستفيدون: '+Number(p.beneficiaries).toLocaleString('ar')+'</span><span>'+({planned:'مخطط',active:'جارٍ',completed:'مكتمل'}[p.stage]||'')+'</span></div>'+(p.source_url?hubExternalLink(p.source_url,'التفاصيل والمصدر'):'')+'<a target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/dir/?api=1&amp;destination='+encodeURIComponent(p.latitude+','+p.longitude)+'">الاتجاهات إلى الموقع ↗</a>'+(user?'<button class="btn" type="button" data-journey="save-project-from-map" data-id="'+p.id+'">＋ حفظ في خارطتي</button><button class="btn" type="button" data-journey="join-project" data-id="'+p.id+'">طلب المشاركة</button>':'')+'</article>';}
function hubMapSummary(data){return '<div class="hubMapKpis"><div><b>'+data.total.toLocaleString('ar')+'</b><span>مشروع</span></div><div><b>'+data.active.toLocaleString('ar')+'</b><span>جارٍ تنفيذه</span></div><div><b>'+data.countries.toLocaleString('ar')+'</b><span>دولة</span></div><div><b>'+data.beneficiaries.toLocaleString('ar')+'</b><span>مستفيد</span></div></div>';}
async function hubMapPage(token){
 main.innerHTML='<div class="hubPage"><div class="hubHead"><div><span class="hubKicker">خارطة البرامج والمشاريع</span><h1>الخارطة التنموية</h1><p>اكتشف المبادرات المعتمدة، وانتقل بين مواقعها، واستعرض بيانات المشاريع ومؤشراتها.</p></div>'+(user?'<button class="btn primary" data-hub="submit-project">+ أضف مشروعك</button>':'<button class="btn" data-act="login">سجّل الدخول لإضافة مشروع</button>')+'</div><div id="hubMapMetrics"></div><div class="hubMapLayout"><section><div class="hubMapControls"><label>المجال <select id="hubMapFilter"><option value="">كل المجالات</option>'+HUB_TOPICS.map(t=>'<option>'+hubEscape(t)+'</option>').join('')+'</select></label><button class="btn" data-hub="reset-map">إظهار الجميع</button></div><div id="hubMap" role="application" aria-label="خريطة تفاعلية للمشاريع التنموية"></div><p class="hubMapAttribution">الخرائط © OpenStreetMap contributors · يتم عرض المشاريع التي اعتمدتها الإدارة فقط</p></section><aside><h2>المشاريع والمبادرات</h2><div id="hubProjectList">جارٍ تحميل المشاريع...</div></aside></div>'+(user?'<section class="hubMine"><h2>طلباتي على الخارطة</h2><div id="hubMyProjects">جارٍ التحميل...</div></section>':'')+(user?.role==='admin'?'<section class="hubMine"><h2>مراجعة مشاريع الأعضاء</h2><div id="hubReviewQueue">جارٍ التحميل...</div></section>':'')+'</div>';
 const data=await api('hub/projects');if(token!==version)return;hubProjects=data.projects;
 document.querySelector('#hubMapMetrics').innerHTML=hubMapSummary(data.summary);hubDrawProjectList(hubProjects);
 if(user){api('hub/projects/mine').then(r=>{const el=document.querySelector('#hubMyProjects');if(el)el.innerHTML=r.projects.length?r.projects.map(p=>'<p><strong>'+hubEscape(p.title)+'</strong> · '+({pending:'قيد المراجعة',published:'منشور',rejected:'غير معتمد'}[p.status])+'</p>').join(''):'لم ترسل مشاريع بعد.';}).catch(()=>{});}
 if(user?.role==='admin')hubReviewQueue();hubInitMap();
}
function hubDrawProjectList(items){const el=document.querySelector('#hubProjectList');if(el)el.innerHTML=items.length?items.map(hubProjectCard).join(''):'لا توجد مشاريع منشورة بعد. أضف أول مشروع لتبدأ الخارطة.';}
function hubInitMap(){const el=document.querySelector('#hubMap');if(!el)return;
 // Embedded geographic view via Leaflet with OpenStreetMap attribution.
 if(typeof L==='undefined'){el.innerHTML='<div class="hubMapUnavailable">تعذر تحميل مزود الخرائط. تبقى قائمة المشاريع وبياناتها متاحة.</div>';return;}
 if(hubMap){hubMap.remove();hubMap=null;}
 hubMap=L.map(el,{scrollWheelZoom:false}).setView([24,40],3);
 L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'&copy; OpenStreetMap contributors'}).addTo(hubMap);
 hubMapMarkers=hubProjects.map(p=>{const marker=L.marker([p.latitude,p.longitude]).addTo(hubMap);marker.bindPopup('<strong>'+hubEscape(p.title)+'</strong><p>'+hubEscape(p.country)+' · '+hubEscape(p.category)+'</p>');marker.on('click',()=>document.querySelector('[data-project="'+p.id+'"]')?.scrollIntoView({behavior:'smooth',block:'nearest'}));return {marker,p};});
 hubFitVisibleMap();setTimeout(()=>hubMap?.invalidateSize(),100);
}
function hubFitVisibleMap(){if(!hubMap||!hubMapMarkers.length)return;const nodes=hubMapMarkers.filter(({marker})=>hubMap.hasLayer(marker)).map(({p})=>[p.latitude,p.longitude]);if(nodes.length)hubMap.fitBounds(nodes,{padding:[30,30],maxZoom:9});}
async function hubReviewQueue(){const el=document.querySelector('#hubReviewQueue');if(!el)return;try{const {projects}=await api('hub/admin/queue');el.innerHTML=projects.length?projects.map(p=>'<div class="hubReviewCard"><strong>'+hubEscape(p.title)+'</strong><p>'+hubEscape(p.summary)+'</p><small>'+hubEscape(p.owner)+' · '+hubEscape(p.country)+'</small><div><button class="btn primary" data-hub="review-project" data-status="published" data-id="'+p.id+'">اعتماد</button><button class="btn" data-hub="review-project" data-status="rejected" data-id="'+p.id+'">رفض</button></div></div>').join(''):'لا توجد مشاريع بانتظار المراجعة.';}catch{el.textContent='تعذر تحميل طلبات المراجعة.';}}
function hubField(name,label,more=''){return '<label>'+label+'<input name="'+name+'" '+more+' '+(more.includes('optional')?'':'required')+'></label>';}
function hubProjectForm(){return '<form id="hubProjectForm" class="fields hubForm">'+hubField('title','اسم المشروع','maxlength="110" minlength="4"')+'<label>وصف المشروع<textarea name="summary" required minlength="20" maxlength="1500"></textarea></label><label>المجال<select name="category">'+HUB_TOPICS.map(t=>'<option>'+t+'</option>').join('')+'</select></label>'+hubField('country','الدولة','maxlength="80"')+hubField('city','المدينة (اختياري)','maxlength="80" optional')+hubField('entity_name','اسم الجهة المنفذة (اختياري)','maxlength="120" optional')+'<div class="hubFormPair">'+hubField('latitude','خط العرض','type="number" min="-90" max="90" step="any"')+hubField('longitude','خط الطول','type="number" min="-180" max="180" step="any"')+'</div><p class="muted">يمكن تحديد إحداثيات الموقع من أي خدمة خرائط ولصقها هنا.</p><div class="hubFormPair">'+hubField('beneficiaries','عدد المستفيدين','type="number" min="0" value="0"')+hubField('budget','الميزانية التقديرية (اختياري)','type="number" min="0" value="0" optional')+'</div><label>مرحلة التنفيذ<select name="stage"><option value="planned">مخطط</option><option value="active">جارٍ</option><option value="completed">مكتمل</option></select></label><label>رابط مرجعي اختياري<input name="source_url" type="url" placeholder="https://..."></label><div role="alert" class="error"></div><button class="btn primary" type="submit">إرسال المشروع للمراجعة</button></form>';}
function hubAdminEventForm(){return '<form id="hubEventForm" class="fields hubForm">'+hubField('title','اسم الفعالية','maxlength="160"')+'<label>الفئة<select name="category"><option value="international_day">يوم دولي</option><option value="conference">مؤتمر</option><option value="local_event">فعالية محلية</option><option value="program">برنامج</option></select></label>'+hubField('event_date','تاريخ البداية','type="date"')+'<label>تاريخ النهاية (اختياري)<input name="end_date" type="date"></label><label><input type="checkbox" name="recurring" value="true"> تكرار سنوي</label><label>وصف<textarea name="description" maxlength="1000"></textarea></label><label>الموقع<input name="location" maxlength="150"></label><label>الدولة<input name="country" maxlength="80"></label><label>رابط المصدر الرسمي<input name="source_url" type="url" placeholder="https://..."></label><div class="error" role="alert"></div><button class="btn primary" type="submit">نشر في التقويم</button></form>';}
function hubAdminNewsForm(){return '<form id="hubNewsForm" class="fields hubForm">'+hubField('headline','عنوان الخبر','maxlength="180" minlength="8"')+hubField('source_name','الجهة المصدر','maxlength="90"')+'<label>رابط الخبر الأصلي<input type="url" name="source_url" placeholder="https://..." required></label>'+hubField('published_at','تاريخ النشر','type="date"')+'<label>التصنيف<input name="category" value="تنمية" maxlength="60"></label><label>الشريط<select name="lane"><option value="1">الشريط الأول — سريع</option><option value="2">الشريط الثاني — أبطأ</option></select></label><div class="error" role="alert"></div><button class="btn primary" type="submit">نشر الخبر</button></form>';}
async function hubAction(action,el){if(!el?.hasAttribute('data-hub'))return false;const which=el.dataset.hub;
 if(which==='calendar-prev'||which==='calendar-next'||which==='calendar-today'){
  if(which==='calendar-today'){hubSidebarMonth=new Date().getMonth();hubSidebarYear=new Date().getFullYear();}
  else {const step=which==='calendar-next'?1:-1, d=new Date(hubSidebarYear,hubSidebarMonth+step,1);hubSidebarMonth=d.getMonth();hubSidebarYear=d.getFullYear();}
  await hubSidebar(version);return true;
 }
 if(which==='calendar-day'){
  const d=el.dataset.date,scope=el.dataset.scope;
  if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(d))return true;
  const id=scope==='side'?'hubSideDayDetails':'hubCalendarDetails';
  const target=document.getElementById(id);
  if(target){target.innerHTML=hubDayDetails(scope==='side'?hubSidebarEvents:hubYearEvents,d);target.querySelector('.hubDayDetailTitle')?.scrollIntoView({behavior:'smooth',block:'nearest'});}
  const root=scope==='side'?document.querySelector('#hubCalendarPreview'):document.querySelector('#hubYearResults');
  root?.querySelectorAll('.hubDateSelected').forEach(e=>e.classList.remove('hubDateSelected'));
  el.classList.add('hubDateSelected');return true;
 }
 if(which==='submit-project'){if(!user){auth('login');return true;}showModal('إضافة مشروع إلى الخارطة',hubProjectForm());return true;}
 if(which==='new-event'){if(user?.role==='admin')showModal('إضافة فعالية موثقة',hubAdminEventForm());return true;}
 if(which==='new-news'){if(user?.role==='admin')showModal('إضافة خبر موثق المصدر',hubAdminNewsForm());return true;}
 if(which==='hide-event'&&user?.role==='admin'){const reason=prompt('سبب سحب الفعالية من التقويم (ثمانية أحرف على الأقل)');if(reason)try{await api('hub/admin/events/'+el.dataset.id,'PATCH',{reason});notify('سُحبت الفعالية');if(location.pathname==='/calendar')await hubCalendar(version);else await hubSidebar(version);}catch(e){notify(e.message);}return true;}
 if(which==='reset-map'){document.querySelector('#hubMapFilter').value='';hubFilterMap('');return true;}
 if(which==='review-project'&&user?.role==='admin'){const reason=prompt('اكتب مبرر القرار (ثمانية أحرف على الأقل)');if(!reason)return true;try{await api('hub/admin/projects/'+el.dataset.id,'PATCH',{status:el.dataset.status,reason});notify('تم توثيق القرار');await hubReviewQueue();await hubMapPage(version);}catch(e){notify(e.message);}return true;}
 return false;
}
function hubFilterMap(value){const subset=hubProjects.filter(p=>!value||p.category===value);hubDrawProjectList(subset);if(hubMap)for(const {marker,p} of hubMapMarkers){if(subset.includes(p))marker.addTo(hubMap);else hubMap.removeLayer(marker);}hubFitVisibleMap();}
async function hubForm(form,data){if(!['hubProjectForm','hubEventForm','hubNewsForm'].includes(form.id))return false;
 const error=form.querySelector('.error'),btn=form.querySelector('button[type=submit]');btn.disabled=true;error.textContent='';
 try{
  let result;
  if(form.id==='hubProjectForm')result=await api('hub/projects','POST',{...data,latitude:Number(data.latitude),longitude:Number(data.longitude),beneficiaries:Number(data.beneficiaries),budget:Number(data.budget)});
  if(form.id==='hubEventForm')result=await api('hub/admin/events','POST',{...data,recurring:Boolean(data.recurring)});
  if(form.id==='hubNewsForm')result=await api('hub/admin/news','POST',{...data,lane:Number(data.lane)});
  dialog.close();notify(result?.message||'تم حفظ البيانات');if(location.pathname==='/map')await hubMapPage(version);if(location.pathname==='/calendar')await hubCalendar(version);if(form.id==='hubNewsForm')await hubRefreshTickers(version);
 }catch(e){error.textContent=e.message;}finally{btn.disabled=false;}return true;
}
async function hubRoute(token){const path=location.pathname.replace(/\/$/,'');if(!['/calendar','/map'].includes(path))return false;document.body.classList.remove('wallCoverView');main.innerHTML='<div class="status">جارٍ التحميل...</div>';if(path==='/calendar')await hubCalendar(token);else await hubMapPage(token);return true;}
document.addEventListener('change',e=>{if(e.target.id==='hubMapFilter')hubFilterMap(e.target.value);});

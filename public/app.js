'use strict';
const main = document.querySelector('#main'), dialog = document.querySelector('#dialog'), modal = document.querySelector('#modal');
const topics = ['التعليم','البيئة','المجتمع','الاقتصاد'];
const shapes = {
 search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/>',
 plus:'<path d="M12 5v14M5 12h14"/>', heart:'<path d="M12 20S3 14.2 3 8.5C3 3.5 9 2.5 12 7c3-4.5 9-3.5 9 1.5C21 14.2 12 20 12 20Z"/>',
 chat:'<path d="M20 4H4v13h4v4l5-4h7z"/>',share:'<path d="m10 8 4-4 4 4M14 4v11M9 8H5v12h14v-7"/>',
 book:'<path d="M12 7C9 5 6 5 3 5v13c3 0 6 0 9 2 3-2 6-2 9-2V5c-3 0-6 0-9 2zm0 0v13"/>',
 leaf:'<path d="M4 16C2 7 11 5 20 4c0 10-3 17-13 14m-3 3 11-11"/>',
 people:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6m1 3a5 5 0 0 1 4 5"/>',
 chart:'<path d="M4 3v17h17M8 15v-4m5 4V8m5 7V5"/>',left:'<path d="m14 6-6 6 6 6"/>'
};
const icon = key => '<svg aria-hidden="true" class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+shapes[key]+'</svg>';
const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let user = null, feed = [], hasMore = false, currentPage = 1, version = 0, toastTimer, afterAuth = null, topic = '', query = '', wallView = 'latest', wallKind = '', wallTag = '';
async function api(path, method='GET', data) {
 const options={method,headers:{'Accept':'application/json'}};
 if(method!=='GET'){options.headers['Content-Type']='application/json';options.body=JSON.stringify(data||{});}
 const resp=await fetch('/api/'+path,options);
 const json=await resp.json().catch(()=>({}));
 if(!resp.ok){const error=new Error(json.error||'تعذّر إتمام الطلب. حاول مرة أخرى.');error.status=resp.status;throw error;}
 return json;
}
function notify(message){const el=document.querySelector('#toast');el.textContent=message;clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.textContent='',3000);}
function account(){
 document.querySelector('#account').innerHTML=user
 ? signedAccountMenu()
 : '<button class="plain" data-act="login">دخول</button><button class="btn primary" data-act="register">إنشاء حساب</button>';
 const isStaff=Boolean(user&&(user.role==='admin'||(Array.isArray(user.permissions)&&user.permissions.length)));
 for(const id of ['staffNavEntry','staffMobileEntry']){
  const item=document.getElementById(id);
  if(item)item.hidden=!isStaff;
 }
}
function showModal(title,body){modal.innerHTML='<div class="modalhead"><h2 id="dialogTitle">'+esc(title)+'</h2><button class="iconbtn" data-act="close" aria-label="إغلاق">×</button></div>'+body;if(!dialog.open)dialog.showModal();}
function auth(mode){const reg=mode==='register';showModal(reg?'إنشاء حساب':'تسجيل الدخول',
 '<form id="auth" class="fields" data-mode="'+mode+'">'+(reg?'<label>الاسم<input name="name" required minlength="2" maxlength="60" autocomplete="name"></label>':'')+
 '<label>البريد الإلكتروني<input name="email" type="email" autocomplete="email" required maxlength="254"></label><label>كلمة المرور<input name="password" type="password" required '+(reg?'minlength="8" maxlength="256" placeholder="حروف مع أرقام أو رموز، 8 أحرف على الأقل" autocomplete="new-password"':'autocomplete="current-password"')+'></label><div role="alert" class="error"></div><button class="btn primary">'+(reg?'إنشاء حساب':'دخول')+'</button></form><p class="switch">'+(reg?'لديك حساب؟ <button class="plain" data-act="login">سجّل الدخول</button>':'عضو جديد؟ <button class="plain" data-act="register">أنشئ حسابًا</button>')+'</p>');}
function requireUser(next){if(user){next();return;}afterAuth=next;auth('login');}
function date(value){const raw=String(value||'');const dt=new Date(/^\d{4}-\d\d-\d\d /.test(raw)?raw.replace(' ','T')+'Z':raw);return Number.isNaN(+dt)?'':new Intl.DateTimeFormat('ar',{day:'numeric',month:'short',year:'numeric'}).format(dt);}
function homeShell(){
 const keys=['book','leaf','people','chart'];
 const name=user?user.name:'زائر تنميات';
 const avatar=face(user||{name});
 const links=topics.map((t,i)=>'<button class="topic" data-act="filter" data-topic="'+t+'"><span class="symbol tone'+i+'">'+icon(keys[i])+'</span>'+t+'</button>').join('');
 main.innerHTML='<div id="wallIdentity" class="wallBannerSlot" aria-label="غلاف وهوية العضو"></div><div id="hubTickers"></div><div class="wallGrid"><aside class="rail"><div id="myCard">'+(user?profileMini(user):'<div class="railUser">'+avatar+'<strong>'+esc(name)+'</strong></div>')+'</div><a class="railHome" href="/wall">⌂ &nbsp; الرئيسية</a><button class="topic" data-act="compose">'+icon('plus')+' مشاركة جديدة</button><a class="topic" href="/people">دليل الأعضاء</a><a class="topic" href="/people?filter=friends">الأصدقاء</a><a class="topic" href="/people?filter=followers">المتابعون</a><a class="topic" href="/groups">المجموعات</a><a class="topic" href="/messages">الرسائل الخاصة</a><a class="topic" href="/map">◉ الخارطة التنموية</a><a class="topic" href="/calendar">▦ التقويم السنوي</a>'+(user?'<a class="topic" href="/my-space">◈ مساحتي التنموية</a><a class="topic" href="/my-people">♧ شبكتي المهنية</a><a class="topic" href="/network">◇ علاقاتي المهنية</a><a class="topic" href="/my-alerts">◉ تنبيهاتي</a><a class="topic" href="/my-calendar">▦ تقويمي</a><a class="topic" href="/my-map">◉ خارطتي</a><a class="topic" href="/my-projects">▣ مشاريعي</a><a class="topic" href="/my-news">✦ أخباري</a><a class="topic" href="/my-impact">◈ أهدافي وأثري</a><a class="topic" href="/my-submissions">▤ متابعة مشاركاتي</a><h2>الخدمات التنموية</h2><a class="topic" href="/needs">◈ الاحتياجات</a><a class="topic" href="/opportunities">▣ الفرص التنموية</a><a class="topic" href="/my-opportunities">▤ إدارة فرصي</a><a class="topic" href="/group-partnerships">♧ تعاون المجموعات</a><a class="topic" href="/project-results">◉ نتائج المشاريع</a>'+(user?.role==='admin'?'<a class="topic" href="/admin">⚑ مركز الإدارة</a>':''):'')+'<a class="topic" href="/wall?view=saved">◇ المنشورات المحفوظة</a><h2>مجالات المجتمع</h2>'+links+'</aside>'+
 '<section class="wall" aria-label="الحائط التفاعلي"><div id="mobileCard"></div><div class="composeBox"><div class="composeRow">'+avatar+'<button data-act="compose">شارك فكرة أو تجربة أو مبادرة...</button></div><div class="composeShortcuts"><button type="button" data-act="compose">✍ منشور</button><button type="button" data-act="compose">▣ صورة أو ملف</button><button type="button" data-act="compose">✦ مبادرة أو سؤال</button></div></div>'+
 '<div class="wallHead"><div class="feedHeading"><div><h1>حائط تنميات</h1><p>أفكار وخبرات ومبادرات المجتمع</p></div><button class="btn primary" data-act="compose">＋ مشاركة</button></div><div class="feedViews">'+[['latest','الأحدث'],['following','أتابعهم'],['trending','الأكثر تفاعلاً'],['saved','المحفوظات']].map(([key,label])=>'<button class="feedView '+(wallView===key?'active':'')+'" data-act="feedview" data-view="'+key+'" aria-pressed="'+(wallView===key)+'">'+label+'</button>').join('')+'</div><div class="kindFilters">'+[['','كل الأنواع'],...Object.entries(kindNames)].map(([key,label])=>'<button class="kindFilter '+(wallKind===key?'active':'')+'" data-act="feedkind" data-kind="'+key+'">'+label+'</button>').join('')+'</div>'+(wallTag?'<div class="activeTag">الوسم: #'+esc(wallTag)+' <button data-act="cleartag">× إزالة</button></div>':'')+'<div class="filters">'+['',...topics].map(t=>'<button class="pill '+(t===topic?'active':'')+'" aria-pressed="'+(t===topic)+'" data-act="filter" data-topic="'+t+'">'+(t||'الكل')+'</button>').join('')+'</div></div><div id="list"></div></section>'+
 '<aside class="latest"><section id="presence"></section><section class="latestBox"><h2>آخر الموضوعات</h2><div id="recent"></div></section><section class="hubSideCalendar" id="hubCalendarPreview"></section><section id="trends" class="trendsBox"></section><section id="discovery" class="discoveryBox"></section></aside></div>';
}
function recentPosts(posts){
 const recent=document.querySelector('#recent');
 if(recent)recent.innerHTML=posts.length?posts.slice(0,6).map(p=>'<a class="recentPost" href="/post/'+encodeURIComponent(p.id)+'"><span class="recentThumb">'+postThumbnail(p)+'</span><span class="recentCopy"><small>'+esc(p.topic)+' · '+esc(date(p.created_at))+'</small><strong>'+esc(postLabel(p))+'</strong><em>'+esc(p.author||'تنميات')+'</em></span></a>').join(''):'<p>لا توجد منشورات بعد.</p>';
}
function listRender(){const list=document.querySelector('#list');if(!list)return;
 list.innerHTML=feed.length?feed.map(p=>card(p)).join('')+(hasMore?'<button class="btn load" data-act="more">عرض المزيد</button>':''):
 '<div class="status"><h3>لا توجد منشورات'+(query||topic?' مطابقة':' حتى الآن')+'</h3><p>'+(query||topic?'يمكنك تغيير البحث أو استعراض جميع المجالات.':'أضف أول مشاركة في المجتمع.')+'</p><button class="btn" data-act="'+(query||topic?'clear':'compose')+'">'+(query||topic?'عرض جميع المنشورات':'اكتب مشاركة')+'</button></div>';}
async function loadPage(page,token){const result=await api('posts?'+new URLSearchParams({q:query,topic,page:String(page),view:wallView,kind:wallKind,tag:wallTag}));if(token!==version)return;currentPage=page;feed=page===1?result.posts:feed.concat(result.posts);hasMore=result.hasMore;listRender();if(page===1){if(!query&&!topic&&wallView==='latest'&&!wallKind&&!wallTag)recentPosts(result.posts);else {const latest=await api("posts?page=1");if(token===version)recentPosts(latest.posts);}}}
function homeUrl(t='',q=''){const url=new URL('/wall',location.origin);if(t)url.searchParams.set('topic',t);if(q)url.searchParams.set('q',q);if(wallView!=='latest')url.searchParams.set('view',wallView);if(wallKind)url.searchParams.set('kind',wallKind);if(wallTag)url.searchParams.set('tag',wallTag);return url.pathname+url.search;}
function wallChange(name,value){const u=new URL(location.href);if(value)u.searchParams.set(name,value);else u.searchParams.delete(name);go('/wall'+u.search);}
async function wallTrends(token){const el=document.getElementById('trends');if(!el)return;try{
 const data=await api('trends');if(token!==version)return;
 el.innerHTML=data.tags.length?'<h2>وسوم متداولة</h2><div class="trendingTags">'+data.tags.map(t=>'<a href="/wall?tag='+encodeURIComponent(t.tag.slice(1))+'">'+esc(t.tag)+' <small>'+Number(t.count)+'</small></a>').join('')+'</div>':'';
 }catch{el.innerHTML='';}}
async function wallDiscover(token){const el=document.getElementById('discovery');if(!el)return;try{
 const data=await api('discover');if(token!==version)return;
 el.innerHTML='<h2>اكتشف مجتمعك</h2>'+(data.members.length?'<h3>أعضاء مقترحون</h3>'+data.members.slice(0,3).map(p=>'<div class="discoverMember">'+memberSignature(p,'regular')+'</div>').join(''):'')+
 (data.groups.length?'<h3>مجموعات نشطة</h3>'+data.groups.slice(0,3).map(g=>'<a href="/groups/'+encodeURIComponent(g.id)+'" class="discoverGroup"><strong>'+esc(g.name)+'</strong><small>'+Number(g.members)+' عضو</small></a>').join(''):'');
 }catch{el.innerHTML='';}}

function updateWallNavState(){
 const enabled=['/wall','/wall/'].includes(location.pathname);
 const y=window.scrollY||0;
 document.body.classList.toggle('wallNavScrolled',enabled && y>55);
 const banner=document.querySelector('#wallIdentity');
 const bottom=banner?.getBoundingClientRect().bottom ?? 0;
 document.body.classList.toggle('wallNavBeyond',enabled && bottom>0 && bottom<72);
 if(typeof hubUpdateDock==='function')hubUpdateDock();
}
window.addEventListener('scroll',updateWallNavState,{passive:true});
function go(url){history.pushState(null,'',url);route();window.scrollTo(0,0);}
async function route(){const token=++version;let target=main;
 try{
 closeAccountMenu();
 const isLanding=['/','/welcome','/welcome/'].includes(location.pathname);
 document.body.classList.toggle('landingView',isLanding);
 document.body.classList.toggle('wallCoverView', ['/wall','/wall/'].includes(location.pathname));
 updateWallNavState();
 if(isLanding){if(user){history.replaceState(null,'','/wall');await route();return;}renderWelcome();return;}
 if(location.pathname==='/staff'){await renderStaff(token);return;}
 if(location.pathname==='/admin'){await renderGovernance(token);return;}
 if(/^\/groups(?:\/\d+)?\/?$/.test(location.pathname)){await renderGroups(token);return;}
 if(await renderMySubmissions(token))return;
 if(await renderNeeds(token))return;
 if(await renderDevelopmentWork(token))return;
 if(await renderNetwork(token))return;
 if(await renderJourney(token))return;
 if(await hubRoute(token))return;
 if(await socialRoute(token))return;
 const post=location.pathname.match(/^\/post\/(\d+)\/?$/);if(post){
  main.innerHTML='<div class="status">جارٍ تحميل المنشور…</div>';const data=await api('posts/'+post[1]);if(token!==version)return;
  const p=data.post;document.title=postLabel(p)+' | تنميات';
  main.innerHTML='<div class="detail"><a class="back plain" href="/wall">← الحائط التفاعلي</a>'+card(p,true)+
  '<section class="panel" id="comments"><h2>التعليقات</h2>'+data.comments.map(c=>'<div class="comment">'+meta(c)+'<p>'+esc(c.body)+'</p></div>').join('')+(data.comments.length?'':'<p>كن أول من يعلّق على هذه المشاركة.</p>')+
  (user?'<form class="fields" id="comment" data-id="'+post[1]+'"><label>تعليقك<textarea name="body" required maxlength="8000"></textarea></label><div role="alert" class="error"></div><button class="btn primary">نشر التعليق</button></form>':'<button class="btn" data-act="login">سجّل الدخول للتعليق</button>')+'</section></div>';
  if(location.hash==='#comments')document.querySelector('#comments').scrollIntoView();
 }else if(location.pathname==='/reports'){
  if(!user||user.role!=='admin'){go('/wall');return;}main.innerHTML='<div class="status">جارٍ تحميل البلاغات…</div>';const data=await api('reports');if(token!==version)return;
  document.title='البلاغات | تنميات';main.innerHTML='<div class="detail"><a href="/wall" class="plain back">← المجتمع</a><h1>بلاغات المنشورات</h1>'+
  (data.reports.length?data.reports.map(r=>'<div class="panel report"><a href="/post/'+encodeURIComponent(r.post_id)+'">'+esc(r.title)+'</a><button class="btn" data-act="dismiss" data-id="'+encodeURIComponent(r.id)+'">إغلاق البلاغ</button></div>').join(''):'<div class="status">لا توجد بلاغات مفتوحة.</div>')+'</div>';
 }else if(['/wall','/wall/'].includes(location.pathname)){
  const params=new URLSearchParams(location.search);query=params.get('q')||'';topic=topics.includes(params.get('topic'))?params.get('topic'):'';wallView=['latest','following','saved','trending'].includes(params.get('view'))?params.get('view'):'latest';wallKind=Object.hasOwn(kindNames,params.get('kind'))?params.get('kind'):'';wallTag=(params.get('tag')||'').slice(0,40);
  document.querySelector('#search input').value=query;document.title='تنميات | مجتمع التنمية';homeShell();refreshWallSide(token);wallDiscover(token);wallTrends(token);hubSidebar(token);hubRefreshTickers(token);target=document.querySelector('#list');target.innerHTML='<div class="status">جارٍ تحميل المنشورات…</div>';await loadPage(1,token);
 }else{main.innerHTML='<div class="status"><h2>الصفحة غير موجودة</h2><a class="btn" href="/wall">زيارة المجتمع</a></div>';}
 }catch(e){if(token===version)target.innerHTML='<div class="status"><p>'+esc(e.message)+'</p><button class="btn" data-act="retry">إعادة المحاولة</button> <a class="btn" href="/wall">المجتمع</a></div>';}
}
function confirmAction(title,label,action,id){showModal(title,'<form id="confirm" class="fields" data-action="'+action+'" data-id="'+id+'"><div role="alert" class="error"></div><div class="minirow"><button class="btn primary">'+label+'</button><button class="btn" type="button" data-act="close">تراجع</button></div></form>');}
document.addEventListener('click',async event=>{
 const el=event.target.closest('[data-needs],[data-work],[data-network],[data-hub],[data-journey],[data-act],a');if(!el)return;
 if(el.tagName==='A'){if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||el.target||el.hasAttribute('download')||el.getAttribute('href').startsWith('#'))return;const url=new URL(el.href);if(url.origin===location.origin){event.preventDefault();go(url.pathname+url.search+url.hash);}return;}
 const action=el.dataset.act,id=el.dataset.id;
 try{
 if(await hubAction(action,el))return;
 if(await needsAction(el))return;
 if(await workAction(el))return;
 if(await networkAction(el))return;
 if(await journeyAction(el))return;
 if(await reviewCenterAction(action,el))return;
 if(await governanceAction(action,el))return;
 if(await socialAction(action,el))return;
 switch(action){
 case 'accountmenu':{
   const panel=document.getElementById('accountPanel');panel.hidden=!panel.hidden;
   el.setAttribute('aria-expanded',String(!panel.hidden));return;
 }
 case 'night':setNight(document.documentElement.dataset.theme!=='dark');account();document.getElementById('accountSwitch')?.focus();return;
 case 'shortcuts':return showModal('اختصارات لوحة المفاتيح','<p><kbd>Alt + N</kbd> &nbsp; كتابة مشاركة</p><p><kbd>Alt + M</kbd> &nbsp; فتح الرسائل</p><p><kbd>Esc</kbd> &nbsp; إغلاق القائمة أو النافذة</p>');
 case 'myprofile':return requireUser(()=>go('/profile/'+user.id));
 case 'mysettings':if(dialog.open)dialog.close();return requireUser(()=>go('/onboarding'));
 case 'close':afterAuth=null;dialog.close();return;
 case 'retry':return route();
 case 'register':case 'login':return auth(action);
 case 'logout':await api('logout','POST');user=null;afterAuth=null;account();history.replaceState(null,'','/welcome');await route();return notify('تم تسجيل الخروج');
 case 'compose':return requireUser(composer);
 case 'reports':return go('/reports');
 case 'clear':return go('/wall');
 case 'filter':return go(homeUrl(el.dataset.topic,query));
 case 'feedview':if(!user&&['following','saved'].includes(el.dataset.view)){auth('login');return;}return wallChange('view',el.dataset.view==='latest'?'':el.dataset.view);
 case 'feedkind':return wallChange('kind',el.dataset.kind);
 case 'cleartag':return wallChange('tag','');
 case 'bookmark':if(!user){auth('login');return;}el.disabled=true;try{await api('posts/'+id+'/bookmark','PUT',{saved:el.dataset.on!=='true'});notify(el.dataset.on==='true'?'أُزيل من المحفوظات':'حُفظ المنشور');await route();}finally{el.disabled=false;}return;
 case 'pinpost':if(user?.role!=='admin')return;el.disabled=true;try{await api('posts/'+id+'/pin','PUT',{pinned:el.dataset.on!=='true'});notify('تم تحديث تثبيت المنشور');await route();}finally{el.disabled=false;}return;
 case 'more':el.disabled=true;try{await loadPage(currentPage+1,version);}finally{el.disabled=false;}return;
 case 'like':if(!user){auth('login');return;}el.disabled=true;try{const liked=el.dataset.liked!=='true';await api('posts/'+id+'/like','PUT',{liked});el.dataset.liked=String(liked);el.setAttribute('aria-pressed',String(liked));el.innerHTML=icon('heart')+' '+Math.max(0,Number(el.textContent.trim())+(liked?1:-1));const p=feed.find(x=>String(x.id)===id);if(p){p.liked=liked;p.likes=Number(el.textContent.trim());}}finally{el.disabled=false;}return;
 case 'share':{const url=new URL('/post/'+id,location.origin).href;try{await navigator.clipboard.writeText(url);notify('تم نسخ رابط المنشور');}catch{showModal('رابط المنشور','<label class="fields">انسخ الرابط<input readonly dir="ltr" value="'+esc(url)+'"></label>');modal.querySelector('input').select();}return;}
 case 'delete':return confirmAction('حذف المنشور وتعليقاته؟','حذف المنشور','delete',id);
 case 'report':return confirmAction('إبلاغ الإدارة عن المنشور؟','إرسال البلاغ','report',id);
 case 'dismiss':el.disabled=true;try{await api('reports/'+id,'DELETE');await route();}finally{el.disabled=false;}return;
 }
 }catch(e){notify(e.message);}
});
dialog.addEventListener('cancel',()=>{afterAuth=null;});
document.addEventListener('submit',async e=>{
 const form=e.target;if(form.hasAttribute('data-group-form'))return;e.preventDefault();const data=Object.fromEntries(new FormData(form));
 if(await staffAction(form,data))return;
 if(await hubForm(form,data))return;
 if(await needsForm(form,data))return;
 if(await workForm(form,data))return;
 if(await journeyForm(form,data))return;
 if(await governanceForm(form,data))return;
 if(await socialForm(form,data))return;
 if(form.id==='search'){go(homeUrl(location.pathname==='/wall'?topic:'',data.q.trim()));return;}
 const button=form.querySelector('button');if(button.disabled)return;button.disabled=true;const error=form.querySelector('.error');error.textContent='';
 try{
 if(form.id==='auth'){
  const isNew=form.dataset.mode==='register';
  await api(form.dataset.mode,'POST',data);
  user=(await api('me')).user;account();if(dialog.open)dialog.close();
  const next=afterAuth;afterAuth=null;await pulse();
  if(isNew){go('/onboarding');}
  else {
   let pendingSetup=false;
   try{const r=await api('journey/preferences');pendingSetup=!r.preferences.onboarding_complete;}catch(e){notify('تعذّر التحقق من التفضيلات: '+e.message);}
   if(pendingSetup)go('/onboarding');
   else if(next&&user){await route();next();}
   else go('/wall');
  }
 }
 else if(form.id==='compose'){const res=await api('posts','POST',data);dialog.close();go('/post/'+encodeURIComponent(res.post.id));notify('نُشرت مشاركتك');}
 else if(form.id==='comment'){await api('posts/'+form.dataset.id+'/comments','POST',data);await route();notify('نُشر تعليقك');}
 else if(form.id==='confirm'){const removing=form.dataset.action==='delete';await api('posts/'+form.dataset.id+(removing?'':'/report'),removing?'DELETE':'POST');dialog.close();if(removing)go('/wall');notify(removing?'حُذف المنشور':'أُرسل البلاغ إلى الإدارة');}
 }catch(ex){error.textContent=ex.message;}finally{button.disabled=false;}
});
window.addEventListener('popstate',route);
(async()=>{
 const startVersion=version;
 try{user=(await api('me')).user;}catch(e){notify(e.message);}
 account();await pulse();
 // A first-time member must be able to finish the professional setup after a refresh or a fresh login.
 // Only inspect the initial route; deliberate navigation after choosing "skip" remains possible.
 if(user&&version===startVersion&&['/','/welcome','/welcome/','/wall','/wall/'].includes(location.pathname)){
  try{
   const {preferences}=await api('journey/preferences');
   if(version===startVersion&&!preferences.onboarding_complete){
    history.replaceState(null,'','/onboarding');
   }
  }catch(e){notify('تعذّر فحص تهيئة العضوية: '+e.message);}
 }
 if(version===startVersion)await route();
})();

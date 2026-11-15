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
let user = null, feed = [], hasMore = false, currentPage = 1, version = 0, toastTimer, afterAuth = null, topic = '', query = '';
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
}
function showModal(title,body){modal.innerHTML='<div class="modalhead"><h2 id="dialogTitle">'+esc(title)+'</h2><button class="iconbtn" data-act="close" aria-label="إغلاق">×</button></div>'+body;if(!dialog.open)dialog.showModal();}
function auth(mode){const reg=mode==='register';showModal(reg?'إنشاء حساب':'تسجيل الدخول',
 '<form id="auth" class="fields" data-mode="'+mode+'">'+(reg?'<label>الاسم<input name="name" required minlength="2" maxlength="60" autocomplete="name"></label>':'')+
 '<label>البريد الإلكتروني<input name="email" type="email" autocomplete="email" required maxlength="254"></label><label>كلمة المرور<input name="password" type="password" required '+(reg?'minlength="10" maxlength="128" placeholder="10 أحرف على الأقل" autocomplete="new-password"':'autocomplete="current-password"')+'></label><div role="alert" class="error"></div><button class="btn primary">'+(reg?'إنشاء حساب':'دخول')+'</button></form><p class="switch">'+(reg?'لديك حساب؟ <button class="plain" data-act="login">سجّل الدخول</button>':'عضو جديد؟ <button class="plain" data-act="register">أنشئ حسابًا</button>')+'</p>');}
function requireUser(next){if(user){next();return;}afterAuth=next;auth('login');}
function date(value){const raw=String(value||'');const dt=new Date(/^\d{4}-\d\d-\d\d /.test(raw)?raw.replace(' ','T')+'Z':raw);return Number.isNaN(+dt)?'':new Intl.DateTimeFormat('ar',{day:'numeric',month:'short',year:'numeric'}).format(dt);}
function homeShell(){
 const keys=['book','leaf','people','chart'];
 const name=user?user.name:'زائر تنميات';
 const avatar=face(user||{name});
 const links=topics.map((t,i)=>'<button class="topic" data-act="filter" data-topic="'+t+'"><span class="symbol tone'+i+'">'+icon(keys[i])+'</span>'+t+'</button>').join('');
 main.innerHTML='<div class="wallGrid"><aside class="rail"><div id="myCard">'+(user?profileMini(user):'<div class="railUser">'+avatar+'<strong>'+esc(name)+'</strong></div>')+'</div><a class="railHome" href="/wall">⌂ &nbsp; الرئيسية</a><button class="topic" data-act="compose">'+icon('plus')+' مشاركة جديدة</button><a class="topic" href="/people">دليل الأعضاء</a><a class="topic" href="/people?filter=friends">الأصدقاء</a><a class="topic" href="/people?filter=followers">المتابعون</a><a class="topic" href="/groups">المجموعات</a><a class="topic" href="/messages">الرسائل الخاصة</a><h2>مجالات المجتمع</h2>'+links+'</aside>'+
 '<section class="wall" aria-label="الحائط التفاعلي"><div id="mobileCard"></div><div class="composeBox"><div class="composeRow">'+avatar+'<button data-act="compose">ما الفكرة التي تودّ مشاركتها؟</button></div><button class="plain" data-act="compose">'+icon('plus')+' كتابة مشاركة</button></div>'+
 '<div class="wallHead"><h1>الحائط التفاعلي</h1><div class="filters">'+['',...topics].map(t=>'<button class="pill '+(t===topic?'active':'')+'" aria-pressed="'+(t===topic)+'" data-act="filter" data-topic="'+t+'">'+(t||'الكل')+'</button>').join('')+'</div></div><div id="list"></div></section>'+
 '<aside class="latest"><section id="presence"></section><h2>آخر الموضوعات</h2><div id="recent"></div></aside></div>';
}
function recentPosts(posts){
 const recent=document.querySelector('#recent');
 if(recent)recent.innerHTML=posts.length?posts.slice(0,5).map(p=>'<a href="/post/'+encodeURIComponent(p.id)+'"><small>'+esc(p.topic)+'</small><strong>'+esc(postLabel(p))+'</strong></a>').join(''):'<p>لا توجد منشورات بعد.</p>';
}
function listRender(){const list=document.querySelector('#list');if(!list)return;
 list.innerHTML=feed.length?feed.map(p=>card(p)).join('')+(hasMore?'<button class="btn load" data-act="more">عرض المزيد</button>':''):
 '<div class="status"><h3>لا توجد منشورات'+(query||topic?' مطابقة':' حتى الآن')+'</h3><p>'+(query||topic?'يمكنك تغيير البحث أو استعراض جميع المجالات.':'أضف أول مشاركة في المجتمع.')+'</p><button class="btn" data-act="'+(query||topic?'clear':'compose')+'">'+(query||topic?'عرض جميع المنشورات':'اكتب مشاركة')+'</button></div>';}
async function loadPage(page,token){const result=await api('posts?'+new URLSearchParams({q:query,topic,page:String(page)}));if(token!==version)return;currentPage=page;feed=page===1?result.posts:feed.concat(result.posts);hasMore=result.hasMore;listRender();if(page===1){if(!query&&!topic)recentPosts(result.posts);else {const latest=await api("posts?page=1");if(token===version)recentPosts(latest.posts);}}}
function homeUrl(t='',q=''){const url=new URL('/wall',location.origin);if(t)url.searchParams.set('topic',t);if(q)url.searchParams.set('q',q);return url.pathname+url.search;}
function go(url){history.pushState(null,'',url);route();window.scrollTo(0,0);}
async function route(){const token=++version;let target=main;
 try{
 closeAccountMenu();
 const isLanding=['/','/welcome','/welcome/'].includes(location.pathname);
 document.body.classList.toggle('landingView',isLanding);
 if(isLanding){if(user){history.replaceState(null,'','/wall');await route();return;}renderWelcome();return;}
 if(location.pathname==='/admin'){await renderGovernance(token);return;}
 if(/^\/groups(?:\/\d+)?\/?$/.test(location.pathname)){await renderGroups(token);return;}
 if(await socialRoute(token))return;
 const post=location.pathname.match(/^\/post\/(\d+)\/?$/);if(post){
  main.innerHTML='<div class="status">جارٍ تحميل المنشور…</div>';const data=await api('posts/'+post[1]);if(token!==version)return;
  const p=data.post;document.title=postLabel(p)+' | تنميات';
  main.innerHTML='<div class="detail"><a class="back plain" href="/wall">← الحائط التفاعلي</a>'+card(p,true)+
  '<section class="panel" id="comments"><h2>التعليقات</h2>'+data.comments.map(c=>'<div class="comment">'+meta(c)+'<p>'+esc(c.body)+'</p></div>').join('')+(data.comments.length?'':'<p>كن أول من يعلّق على هذه المشاركة.</p>')+
  (user?'<form class="fields" id="comment" data-id="'+post[1]+'"><label>تعليقك<textarea name="body" required maxlength="1500"></textarea></label><div role="alert" class="error"></div><button class="btn primary">نشر التعليق</button></form>':'<button class="btn" data-act="login">سجّل الدخول للتعليق</button>')+'</section></div>';
  if(location.hash==='#comments')document.querySelector('#comments').scrollIntoView();
 }else if(location.pathname==='/reports'){
  if(!user||user.role!=='admin'){go('/wall');return;}main.innerHTML='<div class="status">جارٍ تحميل البلاغات…</div>';const data=await api('reports');if(token!==version)return;
  document.title='البلاغات | تنميات';main.innerHTML='<div class="detail"><a href="/wall" class="plain back">← المجتمع</a><h1>بلاغات المنشورات</h1>'+
  (data.reports.length?data.reports.map(r=>'<div class="panel report"><a href="/post/'+encodeURIComponent(r.post_id)+'">'+esc(r.title)+'</a><button class="btn" data-act="dismiss" data-id="'+encodeURIComponent(r.id)+'">إغلاق البلاغ</button></div>').join(''):'<div class="status">لا توجد بلاغات مفتوحة.</div>')+'</div>';
 }else if(['/wall','/wall/'].includes(location.pathname)){
  const params=new URLSearchParams(location.search);query=params.get('q')||'';topic=topics.includes(params.get('topic'))?params.get('topic'):'';
  document.querySelector('#search input').value=query;document.title='تنميات | مجتمع التنمية';homeShell();refreshWallSide(token);target=document.querySelector('#list');target.innerHTML='<div class="status">جارٍ تحميل المنشورات…</div>';await loadPage(1,token);
 }else{main.innerHTML='<div class="status"><h2>الصفحة غير موجودة</h2><a class="btn" href="/wall">زيارة المجتمع</a></div>';}
 }catch(e){if(token===version)target.innerHTML='<div class="status"><p>'+esc(e.message)+'</p><button class="btn" data-act="retry">إعادة المحاولة</button> <a class="btn" href="/wall">المجتمع</a></div>';}
}
function confirmAction(title,label,action,id){showModal(title,'<form id="confirm" class="fields" data-action="'+action+'" data-id="'+id+'"><div role="alert" class="error"></div><div class="minirow"><button class="btn primary">'+label+'</button><button class="btn" type="button" data-act="close">تراجع</button></div></form>');}
document.addEventListener('click',async event=>{
 const el=event.target.closest('[data-act],a');if(!el)return;
 if(el.tagName==='A'){if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||el.target||el.hasAttribute('download')||el.getAttribute('href').startsWith('#'))return;const url=new URL(el.href);if(url.origin===location.origin){event.preventDefault();go(url.pathname+url.search+url.hash);}return;}
 const action=el.dataset.act,id=el.dataset.id;
 try{
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
 case 'close':afterAuth=null;dialog.close();return;
 case 'retry':return route();
 case 'register':case 'login':return auth(action);
 case 'logout':await api('logout','POST');user=null;afterAuth=null;account();history.replaceState(null,'','/welcome');await route();return notify('تم تسجيل الخروج');
 case 'compose':return requireUser(composer);
 case 'reports':return go('/reports');
 case 'clear':return go('/wall');
 case 'filter':return go(homeUrl(el.dataset.topic,query));
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
 if(await governanceForm(form,data))return;
 if(await socialForm(form,data))return;
 if(form.id==='search'){go(homeUrl(location.pathname==='/wall'?topic:'',data.q.trim()));return;}
 const button=form.querySelector('button');if(button.disabled)return;button.disabled=true;const error=form.querySelector('.error');error.textContent='';
 try{
 if(form.id==='auth'){await api(form.dataset.mode,'POST',data);user=(await api('me')).user;account();if(dialog.open)dialog.close();const next=afterAuth;afterAuth=null;await pulse();if(next&&user){await route();next();}else{go('/wall');}}
 else if(form.id==='compose'){const res=await api('posts','POST',data);dialog.close();go('/post/'+encodeURIComponent(res.post.id));notify('نُشرت مشاركتك');}
 else if(form.id==='comment'){await api('posts/'+form.dataset.id+'/comments','POST',data);await route();notify('نُشر تعليقك');}
 else if(form.id==='confirm'){const removing=form.dataset.action==='delete';await api('posts/'+form.dataset.id+(removing?'':'/report'),removing?'DELETE':'POST');dialog.close();if(removing)go('/wall');notify(removing?'حُذف المنشور':'أُرسل البلاغ إلى الإدارة');}
 }catch(ex){error.textContent=ex.message;}finally{button.disabled=false;}
});
window.addEventListener('popstate',route);
(async()=>{try{user=(await api('me')).user;}catch(e){notify(e.message);}account();await pulse();await route();})();

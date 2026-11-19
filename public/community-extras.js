'use strict';
// Progressive community enhancements: previews are sourced from published posts.
// Stories expire from this strip after 24h; source posts remain in the wall.
const TN_STORY_TAG='#قصة_تنميات';
function tnMediaList(post){
 if(Array.isArray(post?.attachments))return post.attachments;
 return post?.image?[{mime:'image/jpeg',url:post.image}]:[];
}
function tnPlayableMedia(post,mime){
 return tnMediaList(post).find(f=>f?.mime?.startsWith(mime)&&typeof f.url==='string'&&f.url.startsWith('/')&&!f.url.startsWith('//'));
}
function tnWallExtraMarkup(){
 return '<section class="tnStorySection" aria-label="قصص تنميات الحديثة">'+
 '<div class="tnExtrasHeading"><h2>قصص تنميات</h2><span>آخر 24 ساعة</span></div>'+
 '<div class="tnStoryRail" id="tnStories"><button type="button" class="tnStoryCreate" data-act="tn-create-story"><span class="tnStoryAdd">＋</span><strong>أنشئ قصتك</strong><small>صورة أو مقطع</small></button><span class="tnStoryLoading">جارٍ تحميل القصص…</span></div>'+
 '</section><section class="tnReelSection"><div class="tnExtrasHeading"><h2>مقاطع تنميات</h2><span>فيديوهات الأعضاء</span></div><div class="tnReelRail" id="tnReels">جارٍ تحميل المقاطع…</div></section>';
}
function tnFriendMarkup(){
 return '<section class="tnRequestsPanel latestBox" aria-label="طلبات الصداقة الواردة"><div class="tnExtrasHeading"><h2>طلبات الصداقة</h2><a href="/people?filter=requests">عرض الكل</a></div><div id="tnFriendRequests" class="tnFriendRequests">جارٍ التحقق…</div></section>'+
 '<section class="tnAlertsPanel latestBox" aria-label="إشعارات العضوية"><div class="tnExtrasHeading"><h2>التنبيهات</h2><a href="/my-alerts">تنبيهاتي</a></div><div id="tnNotificationSummary"></div></section>';
}
async function tnRefreshExtras(){
 const stories=document.getElementById('tnStories'),reels=document.getElementById('tnReels');
 if(stories&&reels){
  try{
   const response=await api('posts?page=1');const posts=Array.isArray(response.posts)?response.posts:[];
   const now=Date.now();
   const recent=posts.filter(p=>{
    const when=Date.parse(String(p.created_at||'').replace(' ','T').replace(/Z?$/,'Z'));
    return Number.isFinite(when)&&now-when>=0&&now-when<=86400000
      &&String(p.body||'').includes(TN_STORY_TAG)&&Boolean(tnPlayableMedia(p,'image/')||tnPlayableMedia(p,'video/'));
   });
   const cards=recent.slice(0,12).map(p=>{
    const item=tnPlayableMedia(p,'image/')||tnPlayableMedia(p,'video/');
    const src=asset(item?.url);
    return '<a class="tnStoryCard" href="/post/'+encodeURIComponent(p.id)+'" aria-label="قصة: '+esc(postLabel(p))+'">'+
     (item.mime.startsWith('image/')?'<img src="'+src+'" alt="" loading="lazy">':'<video src="'+src+'" muted playsinline preload="metadata"></video>')+
     '<span>'+esc(p.author||'عضو تنميات')+'</span></a>';
   }).join('');
   stories.innerHTML='<button type="button" class="tnStoryCreate" data-act="tn-create-story"><span class="tnStoryAdd">＋</span><strong>أنشئ قصتك</strong><small>صورة أو مقطع</small></button>'+
    (cards||'<span class="tnStoryLoading">لا توجد قصص منشورة خلال آخر 24 ساعة.</span>');
   const videos=posts.map(p=>({post:p,file:tnPlayableMedia(p,'video/')})).filter(x=>x.file).slice(0,8);
   reels.innerHTML=videos.length?videos.map(({post,file})=>
    '<a class="tnReelCard" href="/post/'+encodeURIComponent(post.id)+'" aria-label="مشاهدة مقطع: '+esc(postLabel(post))+'">'+
    '<video src="'+asset(file.url)+'" muted playsinline preload="metadata"></video><span class="tnReelPlay" aria-hidden="true">▶</span>'+
    '<strong>'+esc(postLabel(post))+'</strong></a>').join(''):'<p class="tnEmptyReels">تظهر هنا المقاطع التي ينشرها أعضاء المجتمع بصيغة MP4.</p>';
  }catch(e){stories.innerHTML='<p>تعذر تحميل القصص.</p>';reels.textContent='تعذر تحميل المقاطع.';}
 }
 if(user){
  const list=document.getElementById('tnFriendRequests'),notifications=document.getElementById('tnNotificationSummary');
  if(list){
   try{
    const r=await api('people?filter=requests');
    const pending=Array.isArray(r.people)?r.people:[];
    list.innerHTML=pending.length?pending.slice(0,4).map(p=>
      '<div class="tnRequestItem">'+memberSignature(p,'tiny')+
      '<div class="tnRequestActions"><button type="button" class="btn compact" data-act="tn-accept-friend" data-id="'+Number(p.id)+'">قبول</button>'+
      '<button type="button" class="btn compact" data-act="tn-decline-friend" data-id="'+Number(p.id)+'">رفض</button></div></div>').join(''):
      '<p>لا توجد طلبات صداقة جديدة.</p>';
    if(notifications)notifications.innerHTML='<p>'+(pending.length?'لديك '+pending.length+' طلب صداقة بانتظار الرد.':'لا توجد طلبات صداقة معلقة.')+'</p><a href="/my-alerts">استعراض التنبيهات الشخصية</a>';
   }catch(e){list.textContent='تعذر تحميل طلبات الصداقة.';if(notifications)notifications.textContent='يمكنك متابعة تنبيهاتك من مساحتك.';}
  }
 }
}
async function tnExtraAction(action,element){
 if(action==='tn-create-story'){
  if(!user){auth('login');return true;}
  composer();
  const f=document.querySelector('#composeSocial');
  const area=f?.querySelector('textarea[name=body]');
  if(area){area.value=TN_STORY_TAG+'\n';area.focus();}
  f?.querySelector('input[name=mediaFiles]')?.click();
  return true;
 }
 if(action==='tn-compose-image'||action==='tn-compose-video'){
  if(!user){auth('login');return true;}
  composer();
  const input=document.querySelector('#composeSocial input[name=mediaFiles]');
  if(input){input.accept=action==='tn-compose-video'?'video/mp4':'image/jpeg,image/png,image/webp';input.click();}
  return true;
 }
 if(action==='tn-live-info'){showModal('البث المباشر','<p>البث المباشر يحتاج مزود بث وربطاً آمناً وتحكماً في الصلاحيات والإشراف. لم تُفعّل خدمة البث بعد؛ ويمكنك نشر مقطع فيديو مسجل حالياً.</p><button type="button" class="btn primary" data-act="tn-compose-video">إضافة فيديو</button>');return true;}
 if(action==='tn-ai-info'){showModal('تنميات AI','<p>المساعد التوليدي يحتاج ربط مزود ذكاء اصطناعي وضوابط خصوصية وتحقق من الإجابات. يمكنك حالياً البحث داخل موسوعة تنميات واستكشاف مقالاتها.</p><a class="btn primary" href="/wiki">موسوعة تنميات</a>');return true;}
 if(action==='tn-accept-friend'||action==='tn-decline-friend'){
  try{
   const id=Number(element.dataset.id);
   await api('people/'+id+'/friend','PUT',{action:action==='tn-accept-friend'?'accept':'remove'});
   notify(action==='tn-accept-friend'?'تم قبول الصداقة.':'تم رفض الطلب.');
   await tnRefreshExtras();
  }catch(e){notify(e.message);}
  return true;
 }
 return false;
}

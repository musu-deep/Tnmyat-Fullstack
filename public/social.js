'use strict';
const personFilters={all:'الجميع',online:'المتصلون الآن',friends:'الأصدقاء',followers:'المتابعون',following:'أتابعهم',requests:'طلبات الصداقة'};
let directoryPage=1, profilePage=1,threadPeer=null, threadEntries=[], profileRecord=null, pollBusy=false;
function asset(url){return typeof url==='string'&&url.startsWith('/')&&!url.startsWith('//')?esc(url):'';}
function face(person={},size=''){
 const photo=asset(person.avatar)||(String(person.id)==='1'?'/favicon.png':'');
 return '<span class="avatar '+size+'" aria-hidden="true">'+(photo?'<img src="'+photo+'" alt="" loading="lazy">':esc((person.name||'ت').trim().charAt(0)))+(person.online?'<i class="onlineDot"></i>':'')+'</span>';
}
// One member identity across the wall, comments, people, groups and messages.
// The cover is a slim visual signature in compact locations; full image in profile/wall hero.
function coverStyle(member) {
 const src=asset(member?.cover);
 const position=Math.max(0,Math.min(100,Number(member?.cover_position??member?.author_cover_position??50)||50));
 return ' style="background-image:linear-gradient(0deg,rgba(6,28,50,.32),transparent),url(\''+(src||'/welcome-valley.webp')+'\');background-position:center '+position+'%"';
}
function impactDistinction(member){
 if(member?.impact_score===null||member?.impact_score===undefined||!member?.impact_category)return '';
 const score=Math.max(0,Math.min(100,Number(member.impact_score)||0));
 const stars=score>=80?5:score>=60?4:score>=40?3:2;
 return '<span class="impactDistinction" title="تميّز الأثر: تقييم معتمد من إدارة تنميات، منفصل عن النشاط والصلاحيات" aria-label="تميّز الأثر: '+esc(member.impact_category)+'"><span aria-hidden="true">'+('★'.repeat(stars))+'</span>'+esc(member.impact_category)+'</span>';
}
function memberSignature(member,mode='regular') {
 const id=encodeURIComponent(member.id);
 return '<a class="identityLink identity-'+mode+'" href="/profile/'+id+'" aria-label="الملف الشخصي: '+esc(member.name)+'">'+
  '<span class="identityCover"'+coverStyle(member)+' aria-hidden="true"></span>'+face(member,mode==='regular'?'medium':'')+
  '<span class="identityCopy"><strong>'+esc(member.name)+'</strong>'+
  (mode==='regular'?'<small>'+esc(member.bio||'عضو في مجتمع تنميات')+'</small>':'')+impactDistinction(member)+'</span></a>';
}
function memberRank(p) {
 const posts=Math.max(0,Number(p?.posts_count)||0);
 const comments=Math.max(0,Number(p?.comments_count)||0);
 const likes=Math.max(0,Number(p?.received_likes_count)||0);
 const followers=Math.max(0,Number(p?.followers_count)||0);
 const verifiedImpact=(p?.impact_score!==null&&p?.impact_score!==undefined)?Math.max(0,Math.min(100,Number(p.impact_score)||0)):0;
 const points=posts*5+comments*2+likes*3+followers*2+verifiedImpact*2;
 const levels=[
  {min:0,name:'عضو جديد'},
  {min:20,name:'عضو مشارك'},
  {min:70,name:'عضو نشط'},
  {min:180,name:'عضو مؤثر'},
  {min:400,name:'رائد تنميات'}
 ];
 const index=levels.reduce((value,item,i)=>points>=item.min?i:value,0);
 return {points,stars:index+1,name:levels[index].name};
}
function rankBadge(p) {
 const rank=memberRank(p);
 return '<span class="memberRank" title="رتبة تشجيعية محسوبة من النشاط والتفاعلات والأثر المعتمد؛ لا تمنح صلاحيات إدارية"><span class="rankStars" aria-hidden="true">'+('★'.repeat(rank.stars))+'</span><span>'+rank.name+'</span><small>'+rank.points.toLocaleString('ar')+' نقطة</small></span>';
}
function wallIdentityHero(p){
 const id=encodeURIComponent(p.id);
 const stats=[
  {label:'منشورات',value:Number(p.posts_count||0),href:'/profile/'+id,icon:'▤'},
  {label:'متابعون',value:Number(p.followers_count||0),href:'/people?filter=followers',icon:'♧'},
  {label:'أصدقاء',value:Number(p.friends_count||0),href:'/people?filter=friends',icon:'✧'},
  {label:'تفاعلات',value:Number(p.received_likes_count||0)+Number(p.comments_count||0),href:'/profile/'+id,icon:'♡'}
 ];
 return '<section class="wallIdentityHero"><div class="wallIdentityCover"'+coverStyle(p)+'>'+ 
 '<span class="wallCoverCaption">مساحتك في مجتمع تنميات</span><button type="button" data-act="editprofile" class="wallCoverEdit">✎ تخصيص الغلاف</button>'+ 
 '<div class="wallIdentityStats" aria-label="مؤشرات نشاط العضو">'+stats.map(st=>'<a class="glassStat" href="'+st.href+'" title="'+st.label+'"><span class="statIcon" aria-hidden="true">'+st.icon+'</span><b>'+st.value.toLocaleString('ar')+'</b><span>'+st.label+'</span></a>').join('')+'</div></div>'+ 
 '<div class="wallIdentityMain"><a href="/profile/'+id+'" class="wallIdentityPortrait">'+face(p,'large')+'</a><div class="wallIdentityInfo"><h2>'+esc(p.name)+'</h2><p>'+esc(p.bio||'تواصل، وشارك خبراتك ومبادراتك مع مجتمعك.')+'</p>'+rankBadge(p)+impactDistinction(p)+'</div><a class="wallIdentityLink" href="/profile/'+id+'">عرض الملف الشخصي ←</a></div></section>';
}
const kindNames={post:'منشور',article:'مقال',initiative:'مبادرة',question:'سؤال',announcement:'إعلان مجموعة'};
const kindIcons={post:'✍',article:'▤',initiative:'✦',question:'؟',announcement:'♧'};
const topicIcons={'التعليم':'▤','البيئة':'❧','المجتمع':'♧','الاقتصاد':'▥'};
function postThumbnail(p){
  const img=attachmentsOf(p).find(f=>f.mime?.startsWith('image/') && asset(f.url));
  return img?'<img loading="lazy" src="'+asset(img.url)+'" alt="">':
    '<span class="topicThumb topicThumb-'+topics.indexOf(p.topic)+'" aria-hidden="true">'+(topicIcons[p.topic]||'✦')+'</span>';
}
function postTags(p){
 const tags=[...new Set((String(p.title||'')+' '+String(p.body||'')).match(/#[\p{L}\p{N}_]{2,40}/gu)||[])].slice(0,8);
 return tags.length?'<div class="postHashtags">'+tags.map(t=>'<a href="/wall?tag='+encodeURIComponent(t.slice(1))+'">'+esc(t)+'</a>').join('')+'</div>':'';
}
function postLabel(p){return p.title||String(p.body||'').slice(0,65)||'منشور مصوّر';}
function meta(p){
 const author={id:p.author_id,name:p.author,avatar:p.author_avatar,cover:p.author_cover,cover_position:p.author_cover_position};
 const identity=author.id?memberSignature(author,'tiny'):face(author)+'<strong>'+esc(author.name)+'</strong>';
 return '<div class="meta">'+identity+'<span>·</span><time>'+esc(date(p.created_at))+'</time>'+(p.topic?'<span class="tag">'+esc(p.topic)+'</span>':'')+'</div>';
}
function card(p,detail=false){
 const id=encodeURIComponent(p.id),href='/post/'+id,own=user&&(String(user.id)===String(p.author_id)||user.role==='admin');
 const repost=p.repost_by?'<div class="originNote">↻ أعاد <a href="/profile/'+encodeURIComponent(p.repost_by.id)+'">'+esc(p.repost_by.name)+'</a> نشر هذه المشاركة</div>':'';
 const kind=kindNames[p.post_kind]||'منشور';
 const heading=p.title?(detail?'<h1>'+esc(p.title)+'</h1>':'<h3><a href="'+href+'">'+esc(p.title)+'</a></h3>'):'';
 return '<article class="card feedCard">'+repost+meta(p)+'<div class="feedBadges"><span class="kindBadge">'+esc(kindIcons[p.post_kind]||'✍')+' '+esc(kind)+'</span>'+(p.gold_featured?'<span class="goldFeatureBadge" title="إشادة تحريرية من إدارة تنميات">★ إشادة ذهبية</span>':'')+(p.pinned?'<span class="pinnedBadge">⌁ مثبّت</span>':'')+'</div>'+heading+(p.body?(detail?'<p class="bodycopy">'+esc(p.body)+'</p>':'<p class="snippet"><a class="postTextPreview" href="'+href+'" aria-label="قراءة المنشور كاملاً">'+esc(p.body)+'</a></p>'):'')+
 postMedia(p,detail)+postTags(p)+
 '<div class="actions"><button class="action" data-act="like" data-id="'+id+'" data-liked="'+Boolean(p.liked)+'" aria-pressed="'+Boolean(p.liked)+'" aria-label="إعجاب">'+icon('heart')+' '+esc(p.likes||0)+'</button><a class="action" href="'+href+'#comments" aria-label="التعليقات">'+icon('chat')+' '+esc(p.comments_count||0)+'</a>'+
 '<button class="action" data-act="repost" '+(user&&p.author_id===user.id?'disabled title="منشورك الأصلي"':'')+' data-id="'+id+'" data-on="'+Boolean(p.reposted)+'" aria-pressed="'+Boolean(p.reposted)+'">↻ '+(p.reposted?'أُعيد نشره':'إعادة نشر')+' '+Number(p.reposts_count||0)+'</button>'+
 (user&&String(user.id)===String(p.author_id)?'<button class="action editPost" data-act="editpost" data-id="'+id+'">تعديل</button>':'')+
 '<button class="action" data-act="bookmark" data-id="'+id+'" data-on="'+Boolean(p.saved)+'" aria-pressed="'+Boolean(p.saved)+'">'+(p.saved?'◆ محفوظ':'◇ حفظ')+'</button>'+
 '<button class="action" data-act="share" data-id="'+id+'">'+icon('share')+' مشاركة</button>'+
 (user?.role==='admin'?'<button class="action" data-act="pinpost" data-id="'+id+'" data-on="'+Boolean(p.pinned)+'">'+(p.pinned?'إلغاء التثبيت':'تثبيت')+'</button>':'')+
 (detail?(own?'<button class="action link" data-act="delete" data-id="'+id+'">حذف</button>':user?'<button class="action link" data-act="report" data-id="'+id+'">إبلاغ</button>':''):'<a class="action link" href="'+href+'">فتح المنشور '+icon('left')+'</a>')+'</div></article>';
}
function fieldUpload(label){return '<label>'+label+'<input type="file" name="picture" accept="image/jpeg,image/png,image/webp"></label><img class="uploadPreview" alt="معاينة الصورة" hidden>';}
const postMimeTypes = new Set(['image/jpeg','image/png','image/webp','video/mp4','audio/mpeg','application/pdf']);
const postAccept = [...postMimeTypes].join(',');
const attachmentLimit = 4;
const megabyte = 1024 * 1024;
const drafts = new WeakMap();

function attachmentsOf(post) {
  if (Array.isArray(post?.attachments)) return post.attachments;
  return post?.image ? [{id:'legacy',name:'صورة المنشور',mime:'image/jpeg',url:post.image,size:0}] : [];
}
function mediaMarkup(item, src, preview=false) {
  if (!src) return '';
  const name=esc(item.name || 'مرفق');
  if (item.mime.startsWith('image/')) {
    const picture='<img src="'+src+'" alt="'+name+'" loading="lazy">';
    return preview ? picture : '<a target="_blank" rel="noopener" href="'+src+'" aria-label="عرض الصورة كاملة">'+picture+'</a>';
  }
  if (item.mime==='audio/mpeg') return '<audio controls preload="none" aria-label="'+name+'" src="'+src+'"></audio>';
  if (item.mime==='video/mp4') return '<video controls playsinline preload="'+(preview?'metadata':'none')+'" aria-label="'+name+'" src="'+src+'"></video>';
  return '<a class="fileLink" target="_blank" rel="noopener" href="'+src+'"><b>PDF</b><span>'+name+'</span></a>';
}
function postMedia(post,detail=false) {
  const attachments=attachmentsOf(post);
  if (!attachments.length) return '';
  const href='/post/'+encodeURIComponent(post.id);
  return '<div class="publishedMedia'+(detail?' publishedMediaDetail':' publishedMediaPreview')+'">'+attachments.map(item => {
    const src=asset(item.url);
    if(!src)return '';
    if(!detail&&item.mime?.startsWith('image/')){
      return '<figure><a class="postImagePreview" href="'+href+'" aria-label="فتح المنشور والتفاصيل: '+esc(postLabel(post))+'"><img src="'+src+'" alt="'+esc(item.name||'صورة المنشور')+'" loading="lazy"></a></figure>';
    }
    return '<figure>'+mediaMarkup(item,src)+'</figure>';
  }).join('')+'</div>';
}

function composer(post) {
  const existing=post?.id ? post : null;
  const selectedTopic=existing?.topic || 'المجتمع';
  const kindOptions=Object.entries(kindNames).map(([key,label])=>'<option value="'+key+'" '+((existing?.post_kind||'post')===key?'selected':'')+'>'+label+'</option>').join('');
  const options=topics.map(t=>'<option '+(t===selectedTopic?'selected':'')+'>'+esc(t)+'</option>').join('');
  showModal(existing?'تعديل المنشور':'مشاركة جديدة',
    '<form id="composeSocial" class="fields mediaEditor">'+
    '<label>نوع المشاركة<select name="post_kind">'+kindOptions+'</select></label>'+
    '<p class="composerHelp">يمكن إضافة وسوم داخل النص مثل #التعليم أو #المبادرات للبحث والوصول.</p>'+
    '<label>نص المشاركة<textarea name="body" maxlength="24000" rows="4" placeholder="ما الذي تودّ مشاركته؟">'+esc(existing?.body||'')+'</textarea></label>'+
    '<fieldset class="mediaField"><legend>المرفقات</legend><div class="draftMedia"></div>'+
    '<label class="mediaPicker">إضافة مرفقات<input type="file" name="mediaFiles" accept="'+postAccept+'" multiple></label>'+
    '<small>صور JPG وPNG وWebP، وفيديو MP4، وصوت MP3، وملفات PDF. حتى ٤ مرفقات، بحدّ ٦ ميغابايت للملف و١٠ ميغابايت للمجموع.</small></fieldset>'+
    '<label>المجال<select name="topic">'+options+'</select></label><details '+(existing?.title?'open':'')+'><summary>عنوان المنشور</summary>'+
    '<label>العنوان<input name="title" maxlength="160" value="'+esc(existing?.title||'')+'"></label></details>'+
    '<div class="error" role="alert"></div><button class="btn primary" type="submit">'+(existing?'حفظ التعديلات':'نشر')+'</button></form>');
  const form=document.querySelector('#composeSocial');
  const draft={post:existing,items:attachmentsOf(existing).map(item=>({...item})),busy:false};
  drafts.set(form,draft);
  function releaseDraft(){
    for(const item of draft.items) if(item.file) URL.revokeObjectURL(item.url);
    drafts.delete(form);
  }
  draft.release=releaseDraft;
  dialog.addEventListener('close',releaseDraft,{once:true});
  renderDraft(form);
}
function renderDraft(form) {
  const {items}=drafts.get(form);
  form.querySelector('.draftMedia').innerHTML=items.map((item,index)=>{
    const src=item.file?esc(item.url):asset(item.url);
    return '<div class="draftItem"><div class="draftPreview">'+mediaMarkup(item,src,true)+'</div>'+
      '<div class="draftMeta"><strong>'+esc(item.name)+'</strong><div class="draftTools">'+
      '<label class="mediaPicker">استبدال<input type="file" data-replace="'+index+'" accept="'+postAccept+'" aria-label="استبدال '+esc(item.name)+'"></label>'+
      '<button type="button" class="plain" data-remove="'+index+'" aria-label="إزالة '+esc(item.name)+'">إزالة</button></div></div></div>';
  }).join('');
  form.querySelector('input[name=mediaFiles]').disabled=items.length>=attachmentLimit;
}
function canonicalMime(file) {
  const extensions={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',mp4:'video/mp4',mp3:'audio/mpeg',pdf:'application/pdf'};
  const ext=file.name.split('.').pop().toLowerCase();
  return file.type==='audio/mp3'?'audio/mpeg':file.type==='image/jpg'?'image/jpeg':
    (!file.type || file.type==='application/octet-stream' ? extensions[ext] : file.type);
}
function addFiles(form,files,replaceIndex) {
  const draft=drafts.get(form);
  if(!draft || draft.busy || !files.length)return;
  if(draft.items.length+files.length-(replaceIndex===null?0:1)>attachmentLimit)throw Error('يمكن إرفاق أربعة ملفات كحد أقصى.');
  let bytes=draft.items.reduce((sum,item,index)=>sum+(index===replaceIndex?0:item.size||0),0);
  const selected=files.map(file=>{
    const mime=canonicalMime(file);
    if(!postMimeTypes.has(mime))throw Error('نوع الملف غير مدعوم: '+file.name);
    if(!file.size || file.size>6*megabyte)throw Error('اختر ملفًا غير فارغ بحجم أقصاه ٦ ميغابايت.');
    bytes+=file.size;
    return {name:file.name,mime,size:file.size,file};
  });
  if(bytes>10*megabyte)throw Error('يتجاوز مجموع المرفقات ١٠ ميغابايت.');
  for(const item of selected)item.url=URL.createObjectURL(item.file);
  if(replaceIndex===null)draft.items.push(...selected);
  else{
    const [removed]=draft.items.splice(replaceIndex,1,...selected);
    if(removed.file)URL.revokeObjectURL(removed.url);
  }
  renderDraft(form);
}
document.addEventListener('change',event=>{
  const input=event.target,form=input.form;
  if(form?.id!=='composeSocial'||input.type!=='file')return;
  const error=form.querySelector('.error');
  error.textContent='';
  try{addFiles(form,Array.from(input.files),input.hasAttribute('data-replace')?Number(input.dataset.replace):null);}
  catch(e){error.textContent=e.message;}
  input.value='';
});
document.addEventListener('click',event=>{
  const remove=event.target.closest('button[data-remove]');
  if(!remove||remove.form?.id!=='composeSocial')return;
  const draft=drafts.get(remove.form);
  if(draft.busy)return;
  const [item]=draft.items.splice(Number(remove.dataset.remove),1);
  if(item.file)URL.revokeObjectURL(item.url);
  remove.form.querySelector('.error').textContent='';
  renderDraft(remove.form);
});
function encodeFile(item) {
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onerror=()=>reject(Error('تعذرت قراءة الملف '+item.name));
    reader.onload=()=>resolve({name:item.name,data:'data:'+item.mime+';base64,'+reader.result.split(',')[1]});
    reader.readAsDataURL(item.file);
  });
}
async function savePostDraft(form,data) {
  const draft=drafts.get(form);
  if(!data.body.trim()&&!draft.items.length)throw Error('اكتب نصًا أو أرفق ملفًا.');
  const payload={title:data.title.trim(),body:data.body.trim(),topic:data.topic,post_kind:data.post_kind};
  draft.busy=true;
  try{
    payload.attachments=await Promise.all(draft.items.filter(i=>i.file).map(encodeFile));
    if(draft.post){
      payload.version=draft.post.version;
      payload.keep=draft.items.filter(i=>!i.file).map(i=>i.id);
    }
    const {post}=await api(draft.post?'posts/'+draft.post.id:'posts',draft.post?'PATCH':'POST',payload);
    if(form.isConnected&&dialog.open)dialog.close();
    if(draft.post)await route();
    else go('/post/'+post.id);
    notify(draft.post?'حُفظت تعديلات المنشور':'نُشرت مشاركتك');
  }catch(error){
    if(error.status===409 && draft.post){
      const existing=form.querySelector('[data-editor-reload]');
      if(!existing){
        const reload=document.createElement('button');
        reload.type='button';reload.className='plain';reload.dataset.editorReload='true';
        reload.textContent='ترك المسودة وفتح النسخة الأحدث';
        reload.addEventListener('click',async()=>{
          reload.disabled=true;
          try{
            const latest=await api('posts/'+draft.post.id);
            dialog.removeEventListener('close',draft.release);
            draft.release();
            composer(latest.post);
          }catch(e){form.querySelector('.error').textContent=e.message;reload.disabled=false;}
        });
        form.querySelector('.error').after(reload);
      }
    }
    throw error;
  }finally{draft.busy=false;}
}
const coverEditors=new WeakMap();
function editProfile(p){
 showModal('تخصيص الملف الشخصي','<form id="profileEdit" class="fields profileEditForm"><label>الاسم<input name="name" minlength="2" maxlength="60" required value="'+esc(p.name)+'"></label><label>نبذة شخصية<textarea name="bio" maxlength="3000">'+esc(p.bio)+'</textarea></label><label>الصورة الشخصية<input type="file" name="picture" accept="image/jpeg,image/png,image/webp"></label><img class="uploadPreview" alt="معاينة الصورة الشخصية" hidden>'+(p.avatar?'<label class="check"><input type="checkbox" name="removeAvatar"> حذف الصورة الحالية</label>':'')+'<fieldset class="profileCoverSettings"><legend>صورة الغلاف</legend><p class="muted">اختر الصورة، ثم اسحبها داخل إطار المعاينة وحدد الجزء الذي تريد ظهوره. يمكن أيضاً ضبط التكبير والموضع بدقة.</p><label>تحميل غلاف<input type="file" name="coverPicture" accept="image/jpeg,image/png,image/webp"></label><div class="coverCropEditor" hidden><canvas width="1000" height="320" aria-label="معاينة الجزء الذي سيظهر من الغلاف"></canvas><small class="coverCropHint">اسحب الصورة لتحديد الجزء الظاهر في البانر</small><div class="coverCropControls"><label>تكبير الصورة <output data-crop-out="zoom">100%</output><input type="range" name="coverZoom" min="100" max="300" value="100" step="5"></label><label>الموضع الأفقي <output data-crop-out="x">50%</output><input type="range" name="coverX" min="0" max="100" value="50"></label><label>الموضع العمودي <output data-crop-out="y">50%</output><input type="range" name="coverY" min="0" max="100" value="50"></label></div><button type="button" class="coverCropReset" data-act="resetcovercrop">إعادة ضبط المعايرة</button></div><label>موضع الغلاف في العرض <output id="coverPositionValue">'+Number(p.cover_position??50)+'%</output><input type="range" name="cover_position" min="0" max="100" step="1" value="'+Number(p.cover_position??50)+'"></label>'+(p.cover?'<label class="check"><input type="checkbox" name="removeCover"> إزالة الغلاف الحالي</label>':'')+'</fieldset><div class="error" role="alert"></div><button class="btn primary" type="submit">حفظ الملف والغلاف</button><button class="btn" type="button" data-act="mysettings">الإعدادات والتفضيلات المهنية</button></form>');
 const form=modal.querySelector('#profileEdit');
 if(p.cover)loadCoverCrop(form,asset(p.cover)).catch(e=>{if(form.isConnected)form.querySelector('.error').textContent=e.message;});
}
function renderCoverCrop(form){
 const state=coverEditors.get(form);if(!state||!form.isConnected)return;
 const canvas=form.querySelector('.coverCropEditor canvas'),ctx=canvas.getContext('2d');
 const W=canvas.width,H=canvas.height,im=state.image;
 const scale=Math.max(W/im.naturalWidth,H/im.naturalHeight)*state.zoom/100;
 const dw=im.naturalWidth*scale,dh=im.naturalHeight*scale;
 const ox=-(dw-W)*state.x/100,oy=-(dh-H)*state.y/100;
 ctx.clearRect(0,0,W,H);ctx.drawImage(im,ox,oy,dw,dh);
 for(const key of ['zoom','x','y']){
  const input=form.querySelector('[name=cover'+key[0].toUpperCase()+key.slice(1)+']');
  if(input)input.value=state[key];
  const output=form.querySelector('[data-crop-out="'+key+'"]');if(output)output.textContent=state[key]+'%';
 }
}
async function loadCoverCrop(form,source){
 const img=new Image();let revoke=false;
 if(source instanceof File){
  if(!['image/jpeg','image/png','image/webp'].includes(source.type)||source.size>15*1024*1024)throw Error('اختر صورة JPG أو PNG أو WebP بحجم لا يتجاوز 15 ميغابايت.');
  img.src=URL.createObjectURL(source);revoke=true;
 }else{img.src=source;}
 try{await img.decode();if(!img.naturalWidth||!img.naturalHeight||img.naturalWidth*img.naturalHeight>64e6)throw Error('أبعاد الصورة غير مدعومة.');}
 finally{if(revoke)URL.revokeObjectURL(img.src);}
 if(!form.isConnected)return;
 const x=50,y=50,zoom=100;
 coverEditors.set(form,{image:img,x,y,zoom,dirty:source instanceof File,sourceIsFile:source instanceof File});
 form.querySelector('.coverCropEditor').hidden=false;
 renderCoverCrop(form);
}
function exportCoverCrop(form){
 const state=coverEditors.get(form);if(!state||!state.dirty)return null;
 const original=form.querySelector('.coverCropEditor canvas');
 const target=document.createElement('canvas');
 for(const scale of [1,.85,.7,.55]){
  target.width=Math.round(original.width*scale);target.height=Math.round(original.height*scale);
  target.getContext('2d').drawImage(original,0,0,target.width,target.height);
  for(const quality of [.9,.8,.68,.55]){
   const encoded=target.toDataURL('image/jpeg',quality);
   if(encoded.length<460000)return encoded;
  }
 }
 throw Error('تعذّر ضغط الغلاف بعد معايرته. اختر صورة أبسط.');
}

async function imageData(file,edge){
 if(!file||!file.size)return null;
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>15*1024*1024)throw Error('اختر صورة JPEG أو PNG أو WebP بحجم أقصاه 15 ميغابايت.');
 const url=URL.createObjectURL(file),img=new Image();img.src=url;
 try{
 await img.decode();if(!img.naturalWidth||!img.naturalHeight||img.naturalWidth*img.naturalHeight>64e6)throw Error();
 let scale=Math.min(1,edge/Math.max(img.naturalWidth,img.naturalHeight));const canvas=document.createElement('canvas');
 for(let pass=0;pass<6;pass++){
  canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
  const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
  for(const quality of [.88,.74,.58]){const data=canvas.toDataURL('image/jpeg',quality);if(data.length<330000)return data;}
  scale*=.75;
 }
 }catch{throw Error('تعذرت قراءة الصورة. جرّب صورة أخرى.');}finally{URL.revokeObjectURL(url);}
 throw Error('تعذّر ضغط الصورة. اختر صورة أصغر.');
}
document.addEventListener('change',async event=>{
 const input=event.target;if(!['picture','coverPicture'].includes(input.name)||input.form?.id!=='profileEdit')return;
 const form=input.form,field=form.querySelector('.error'),file=input.files[0];field.textContent='';
 if(input.name==='coverPicture'){
  if(!file)return;
  try{await loadCoverCrop(form,file);form.querySelector('[name=cover_position]').value='50';form.querySelector('#coverPositionValue').textContent='50%';}
  catch(e){field.textContent=e.message;input.value='';}
  return;
 }
 const preview=form.querySelector('.uploadPreview');preview.hidden=true;
 try{const data=await imageData(file,420);if(file!==input.files[0]||!data)return;preview.src=data;preview.hidden=false;}
 catch(e){if(file===input.files[0]){field.textContent=e.message;input.value='';}}
});
document.addEventListener('input',event=>{
 const input=event.target,form=input.form;if(form?.id!=='profileEdit')return;
 if(input.name==='cover_position')form.querySelector('#coverPositionValue').textContent=input.value+'%';
 const map={coverZoom:'zoom',coverX:'x',coverY:'y'};
 if(map[input.name]){
  const state=coverEditors.get(form);if(!state)return;
  state[map[input.name]]=Number(input.value);state.dirty=true;renderCoverCrop(form);
 }
});
document.addEventListener('pointerdown',event=>{
 const canvas=event.target;if(!canvas.matches('.coverCropEditor canvas'))return;
 const form=canvas.closest('form'),state=coverEditors.get(form);if(!state)return;
 const start={x:event.clientX,y:event.clientY,px:state.x,py:state.y};
 canvas.setPointerCapture(event.pointerId);
 const move=e=>{
  const W=canvas.width,H=canvas.height,im=state.image;
  const scale=Math.max(W/im.naturalWidth,H/im.naturalHeight)*state.zoom/100;
  const extraX=im.naturalWidth*scale-W,extraY=im.naturalHeight*scale-H;
  if(extraX>0.1)state.x=Math.max(0,Math.min(100,Math.round(start.px-((e.clientX-start.x)*W/canvas.getBoundingClientRect().width)/extraX*100)));
  if(extraY>0.1)state.y=Math.max(0,Math.min(100,Math.round(start.py-((e.clientY-start.y)*H/canvas.getBoundingClientRect().height)/extraY*100)));
  state.dirty=true;renderCoverCrop(form);
 };
 const stop=()=>{canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',stop);canvas.removeEventListener('pointercancel',stop);};
 canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',stop);canvas.addEventListener('pointercancel',stop);
});
document.addEventListener('click',event=>{
 if(event.target.dataset.act!=='resetcovercrop')return;
 const form=event.target.closest('#profileEdit'),state=coverEditors.get(form);if(!state)return;
 state.x=50;state.y=50;state.zoom=100;state.dirty=true;renderCoverCrop(form);
});

function counts(p,full=false){
 const values=[['posts_count','منشورات'],['friends_count','أصدقاء'],['followers_count','متابعون']];
 if(full)values.push(['following_count','يتابعهم'],['reposts_count','إعادات نشر']);
 return '<div class="statGrid">'+values.map(([key,label])=>'<span><b>'+Number(p[key]||0)+'</b><small>'+label+'</small></span>').join('')+'</div>';
}
function profileMini(p,latest){
 const summary=p.bio?'<p class="memberIntro">'+esc(p.bio)+'</p>':'';
 const activity=latest?'<a class="memberLatest" href="/post/'+latest.id+'"><small>آخر مشاركة</small><strong>'+esc(postLabel(latest))+'</strong></a>':'';
 const metricItems=[['posts_count','منشورات'],['followers_count','متابعون'],['friends_count','أصدقاء'],['received_likes_count','إعجابات']];
 return '<section class="memberPass memberPassCompact"><div class="memberPassIdentity">'+memberSignature(p,'regular')+'</div>'+ 
 rankBadge(p)+impactDistinction(p)+summary+'<div class="sideMemberMetrics">'+metricItems.map(([key,label])=>'<div><b>'+Number(p[key]||0).toLocaleString('ar')+'</b><span>'+label+'</span></div>').join('')+'</div>'+activity+'</section>';
}
function peopleButtons(p){
 if(!user)return '<button class="btn" data-act="login">دخول للتواصل</button>';
 if(String(p.id)===String(user.id))return '<button class="btn" data-act="editprofile">تعديل الملف</button>';
 const id=encodeURIComponent(p.id),stat=p.friend_status;
 const btn=(label,action,mode='')=>'<button class="btn compact" data-act="'+action+'" data-id="'+id+'" data-mode="'+mode+'">'+label+'</button>';
 return btn(p.following?'إلغاء المتابعة':'متابعة','follow',p.following?'off':'on')+(p.can_message===false?'':(stat==='incoming'?btn('قبول الصداقة','friend','accept')+btn('رفض','friend','remove'):btn(stat==='friends'?'إزالة الصداقة':stat==='outgoing'?'إلغاء الطلب':'طلب صداقة','friend',stat==='friends'||stat==='outgoing'?'remove':'request'))+'<a class="btn compact" href="/messages/'+id+'">رسالة</a>');
}
function personCard(p){return '<article class="personCard personIdentityCard">'+memberSignature(p,'regular')+(p.bio?'<p class="memberBio">'+esc(p.bio)+'</p>':'')+'<div class="minirow">'+peopleButtons(p)+'</div></article>';}
function pathTitle(name){document.title=name+' | تنميات';return '<a class="plain back" href="/wall">← الحائط التفاعلي</a>';}
async function pulse(){if(user&&document.visibilityState!=='hidden')try{await api('heartbeat','POST');}catch{/* The next heartbeat retries. */}}
async function wallPresence(token){
 const data=await api('people?filter=online');if(token!==version)return;
 const node=document.querySelector('#presence');if(!node)return;
 node.innerHTML='<div class="onlineHeading"><h2>متصلون الآن</h2><a href="/people?filter=online">عرض الكل</a></div>'+
 (data.people.length?data.people.slice(0,6).map(p=>'<div class="onlineLink">'+memberSignature(p,'tiny')+'</div>').join(''):'<p class="muted">لا يوجد أعضاء متصلون حاليًا.</p>');
}
async function refreshWallSide(token){
 const presence=wallPresence(token).catch(()=>{});
 if(user)try{const [{profile},activity]=await Promise.all([api('profiles/'+user.id),api('posts?user='+user.id)]);if(token===version){const hero=document.getElementById('wallIdentity');if(hero){hero.innerHTML=wallIdentityHero(profile);updateWallNavState();}for(const key of ['myCard','mobileCard']){const node=document.getElementById(key);if(node)node.innerHTML=profileMini(profile,activity.posts[0]);}}}catch{/* Profile remains reachable via the initial card. */}
 await presence;
}
async function directory(token){
 const url=new URL(location.href),filter=Object.hasOwn(personFilters,url.searchParams.get('filter'))?url.searchParams.get('filter'):'all',q=url.searchParams.get('q')||'';
 const restricted=['friends','followers','following','requests'].includes(filter)&&!user;
 const markup='<div class="socialPage">'+pathTitle('دليل الأعضاء')+'<div class="socialHeading"><h1>دليل الأعضاء</h1><form id="peopleSearch" class="search"><input name="q" aria-label="بحث باسم العضو" maxlength="160" placeholder="بحث باسم العضو" value="'+esc(q)+'"><button aria-label="بحث">'+icon('search')+'</button></form></div><div class="filters">'+Object.entries(personFilters).map(([key,name])=>'<a class="pill '+(filter===key?'active':'')+'" href="/people?'+esc(new URLSearchParams({filter:key,q}).toString())+'">'+name+'</a>').join('')+'</div><div id="peopleGrid" class="peopleGrid"></div><div id="morePeople"></div></div>';
 main.innerHTML=markup;directoryPage=1;
 if(restricted){document.querySelector('#peopleGrid').innerHTML='<div class="status">سجّل الدخول لعرض علاقاتك. <button class="plain" data-act="login">تسجيل الدخول</button></div>';return;}
 await peoplePage(1,token);
}
async function peoplePage(page,token){
 const url=new URL(location.href),params=new URLSearchParams({filter:url.searchParams.get('filter')||'all',q:url.searchParams.get('q')||'',page});
 const data=await api('people?'+params);if(token!==version)return;
 document.querySelector('#peopleGrid').insertAdjacentHTML('beforeend',data.people.length?data.people.map(personCard).join(''):page===1?'<p class="panel">لا يوجد أعضاء ضمن هذه القائمة.</p>':'');
 directoryPage=page;document.querySelector('#morePeople').innerHTML=data.hasMore?'<button class="btn load" data-act="morepeople">عرض المزيد</button>':'';
}
async function profile(token,id){
 const {profile:p}=await api('profiles/'+id);if(token!==version)return;profileRecord=p;profilePage=1;
 const own=Boolean(user&&String(user.id)===String(p.id));
 const cover=asset(p.cover),position=Math.max(0,Math.min(100,Number(p.cover_position??50)));
 const metrics=[['posts_count','المنشورات'],['comments_count','التعليقات'],['received_likes_count','الإعجابات المستلمة'],['followers_count','المتابعون'],['following_count','يتابع'],['friends_count','الأصدقاء']];
 const metricsHtml=metrics.map(([field,label])=>'<button type="button" class="profileStat" data-act="profilemetric" data-key="'+field+'" aria-label="عرض تفاصيل '+label+'"><b>'+Number(p[field]||0).toLocaleString('ar')+'</b><span>'+label+'</span></button>').join('');
 main.innerHTML='<div class="socialPage profilePage">'+pathTitle(p.name)+'<section class="profileHero profileHeroV2"><div class="profileCover profileCoverV2"'+' style="background-image:linear-gradient(0deg,rgba(4,22,44,.35),transparent 65%),url(\''+(cover||'/welcome-valley.webp')+'\');background-position:center '+position+'%"'+'><span class="coverBrand">مجتمع تنميات</span>'+(own?'<button type="button" class="coverEditBtn" data-act="editprofile">✎ تخصيص الغلاف</button>':'')+'</div><div class="profileIdentity"><div class="profilePortrait">'+face(p,'large')+(own?'<button type="button" data-act="editprofile" class="portraitEditBtn" aria-label="تعديل الصورة الشخصية">✎</button>':'')+'</div><div class="profileIdentityText"><h1>'+esc(p.name)+'</h1>'+rankBadge(p) +impactDistinction(p)+'<small>'+(p.online?'● متصل الآن':'عضو في تنميات')+'</small>'+(p.bio?'<p class="bodycopy">'+esc(p.bio)+'</p>':'')+'</div><div class="profileBtns">'+peopleButtons(p)+'</div></div><div class="profileMetrics" aria-label="إحصاءات نشاط العضو">'+metricsHtml+'</div></section><div id="professionalDetails"></div><div class="socialHeading"><h2>منشورات العضو</h2>'+(own?'<button class="btn primary" data-act="compose">＋ مشاركة</button>':'')+'</div><div id="profilePosts"></div><div id="profileMore"></div></div>';
 if(user){
  try{
   const {profile:professional}=await api('journey/professional?id='+encodeURIComponent(id));
   if(token===version&&professional){
    const node=document.getElementById('professionalDetails');
    if(node)node.innerHTML='<section class="panel professionalDetails"><h2>الملف المهني</h2><p><strong>'+esc(professional.professional_role||'عضو تنموي')+'</strong>'+(professional.organization?' · '+esc(professional.organization):'')+'</p><p>'+esc([professional.city,professional.country].filter(Boolean).join('، '))+'</p>'+(professional.skills.length?'<p>المهارات: '+professional.skills.map(esc).join(' · ')+'</p>':'')+(professional.participation.length?'<p>مجالات المشاركة: '+professional.participation.map(esc).join(' · ')+'</p>':'')+(own?'<a href="/onboarding" class="btn">تعديل ملفي المهني</a>':'')+'</section>';
   }
  }catch{/* Optional professional details should not block social profile. */}
 }
 await profilePosts(id,1,token);
}
async function profilePosts(id,page,token){
 const data=await api('posts?'+new URLSearchParams({user:id,page}));if(token!==version)return;
 document.querySelector('#profilePosts').insertAdjacentHTML('beforeend',data.posts.length?data.posts.map(p=>card(p)).join(''):page===1?'<p class="panel">لا توجد منشورات لهذا العضو حتى الآن.</p>':'');
 profilePage=page;document.querySelector('#profileMore').innerHTML=data.hasMore?'<button class="btn load" data-act="profilemore" data-id="'+id+'">عرض المزيد</button>':'';
}
function conversationList(list,id){
 return list.length?list.map(c=>'<a class="conversation '+(String(c.peer.id)===id?'active':'')+'" href="/messages/'+encodeURIComponent(c.peer.id)+'"><span class="conversationMember"><span class="identityCover"'+coverStyle(c.peer)+'></span>'+face(c.peer)+'<span><strong>'+esc(c.peer.name)+'</strong><small>'+esc(c.last_body)+'</small></span></span>'+(c.unread?'<b>'+Number(c.unread)+'</b>':'')+'</a>').join(''):'<p class="muted">لا توجد محادثات بعد.</p>';
}
function bubbles(messages){return messages.map(m=>'<div class="bubble '+(String(user.id)===String(m.sender_id)?'mine':'theirs')+'"><p>'+esc(m.body)+'</p><time>'+esc(new Intl.DateTimeFormat('ar',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(m.created_at)))+'</time></div>').join('');}
async function refreshInbox(id,token){
 const {conversations}=await api('messages');if(token===version){const node=document.querySelector('#conversationList');if(node)node.innerHTML=conversationList(conversations,id);}
}
async function inbox(token,id){
 if(!user){main.innerHTML='<div class="socialPage">'+pathTitle('الرسائل')+'<div class="status"><h2>الرسائل الخاصة</h2><p>سجّل الدخول لعرض محادثاتك.</p><button class="btn primary" data-act="login">تسجيل الدخول</button></div></div>';return;}
 threadEntries=[];threadPeer=null;
 main.innerHTML='<div class="socialPage">'+pathTitle('الرسائل الخاصة')+'<div class="socialHeading"><h1>الرسائل الخاصة</h1><a href="/people" class="btn">محادثة جديدة</a></div><div class="inboxLayout '+(id?'selected':'')+'"><aside class="threadList"><h2>المحادثات</h2><div id="conversationList"></div></aside><section id="threadView" class="threadView">'+(id?'جارٍ تحميل المحادثة…':'<div class="status"><h2>اختر محادثة</h2><p>أو افتح ملف عضو لبدء مراسلته.</p></div>')+'</section></div></div>';
 if(id){
  const data=await api('messages/'+id);if(token!==version)return;threadPeer=data.peer;threadEntries=data.messages;
  document.querySelector('#threadView').innerHTML='<div class="threadHead">'+memberSignature(threadPeer,'tiny')+'<a class="plain" href="/messages">كل المحادثات</a></div><div id="stream" class="stream"><div id="earlier">'+(data.hasMore?'<button class="plain" data-act="older" data-id="'+id+'">الرسائل السابقة</button>':'')+'</div><div id="bubbles">'+(data.messages.length?bubbles(data.messages):'<p class="muted emptyThread">اكتب أول رسالة.</p>')+'</div></div><form class="fields messageForm" id="sendMessage" data-id="'+id+'"><label class="sr" for="dmBody">نص الرسالة</label><textarea id="dmBody" name="body" maxlength="8000" required placeholder="اكتب رسالة…"></textarea><button class="btn primary">إرسال</button><div class="error" role="alert"></div></form>';
  const stream=document.querySelector('#stream');stream.scrollTop=stream.scrollHeight;
 }
 await refreshInbox(id,token);
}
async function fetchMessages(id,token){
 const data=await api('messages/'+id);if(token!==version)return;
 const unseen=data.messages.filter(m=>!threadEntries.some(old=>old.id===m.id));if(!unseen.length)return;
 const dst=document.querySelector('#bubbles'),stream=document.querySelector('#stream');if(!dst||!stream)return;
 const bottom=stream.scrollHeight-stream.scrollTop-stream.clientHeight<65;
 // A long pause may leave a gap before the most recent page. Rebuild the
 // loaded segment so older pages remain reachable through the history button.
 if(threadEntries.length&&data.hasMore&&!data.messages.some(m=>threadEntries.some(old=>old.id===m.id))){
  threadEntries=data.messages;dst.innerHTML=bubbles(threadEntries);document.querySelector('#earlier').innerHTML='<button class="plain" data-act="older" data-id="'+id+'">الرسائل السابقة</button>';
 }else{threadEntries.push(...unseen);dst.querySelector('.emptyThread')?.remove();dst.insertAdjacentHTML('beforeend',bubbles(unseen));}
 if(bottom)stream.scrollTop=stream.scrollHeight;
}
async function socialRoute(token){
 const path=location.pathname.replace(/\/$/,'');
 if(!/^\/(?:people|profile\/\d+|messages(?:\/\d+)?)$/.test(path))return false;
 main.innerHTML='<div class="status">جارٍ التحميل…</div>';
 if(path==='/people')await directory(token);
 else if(path.startsWith('/profile/'))await profile(token,path.split('/')[2]);
 else await inbox(token,path.split('/')[2]||'');
 return true;
}
async function socialAction(action,el){
 const id=el.dataset.id,mode=el.dataset.mode;
 if(!['editpost','editprofile','profilemetric','follow','friend','repost','morepeople','profilemore','older'].includes(action))return false;
 el.disabled=true;
 try{
 if(action==='profilemetric'){const p=profileRecord;if(!p)return true;const field=el.dataset.key;const map={posts_count:['المنشورات','إجمالي منشورات العضو المنشورة في المجتمع.'],comments_count:['التعليقات','التعليقات التي كتبها العضو على منشورات المجتمع.'],received_likes_count:['الإعجابات المستلمة','إجمالي الإعجابات التي حصلت عليها منشورات العضو.'],followers_count:['المتابعون','عدد الأعضاء الذين يتابعون هذا الحساب.'],following_count:['يتابع','عدد الحسابات التي يتابعها العضو.'],friends_count:['الأصدقاء','عدد علاقات الصداقة المؤكدة.']};if(!Object.hasOwn(map,field))return true;const [name,desc]=map[field];showModal(name,'<div class="profileMetricDetails"><strong>'+Number(p[field]||0).toLocaleString('ar')+'</strong><p>'+desc+'</p>'+(field==='posts_count'?'<a class="btn primary" href="#profilePosts" data-act="close">عرض المنشورات</a>':'')+'</div>');return true;}
 if(action==='editpost'){const {post}=await api('posts/'+id);composer(post);}
 else if(action==='editprofile'){const {profile}=await api('profiles/'+user.id);editProfile(profile);}
 else if(action==='repost'){if(!user){auth('login');return true;}await api('posts/'+id+'/repost','PUT',{reposted:el.dataset.on!=='true'});await route();}
 else if(action==='friend'||action==='follow'){await api('people/'+id+'/'+action,'PUT',action==='follow'?{following:mode==='on'}:{action:mode});await route();}
 else if(action==='morepeople')await peoplePage(directoryPage+1,version);
 else if(action==='profilemore')await profilePosts(id,profilePage+1,version);
 else if(action==='older'&&threadEntries.length){
  const token=version,data=await api('messages/'+id+'?before='+threadEntries[0].id);if(token!==version)return true;
  const stream=document.querySelector('#stream'),height=stream.scrollHeight;threadEntries.unshift(...data.messages);document.querySelector('#bubbles').insertAdjacentHTML('afterbegin',bubbles(data.messages));
  if(!data.hasMore)document.querySelector('#earlier').replaceChildren();stream.scrollTop+=stream.scrollHeight-height;
 }
 }finally{el.disabled=false;}return true;
}
async function socialForm(form,data){
 if(!['peopleSearch','composeSocial','profileEdit','sendMessage'].includes(form.id))return false;
 if(form.id==='peopleSearch'){const params=new URLSearchParams(location.search);params.set('q',data.q.trim());go('/people?'+params);return true;}
 const button=form.querySelector('button[type=submit],button:not([type])');if(button.disabled)return true;
 button.disabled=true;const field=form.querySelector('.error');field.textContent='';
 try{
 if(form.id==='composeSocial'){
  await savePostDraft(form,data);
 }else if(form.id==='profileEdit'){
  if((data.coverPicture?.size || coverEditors.get(form)?.dirty) && data.removeCover)throw Error('اختر إما معايرة الغلاف أو إزالته.');
  const avatar=await imageData(data.picture,420),cover=exportCoverCrop(form);await api('me/profile','PATCH',{name:data.name.trim(),bio:data.bio.trim(),cover_position:cover?50:Number(data.cover_position),...(avatar?{avatar}:data.removeAvatar?{avatar:null}:{}),...(cover?{cover}:data.removeCover?{cover:null}:{})});user=(await api('me')).user;account();dialog.close();await route();notify('تم حفظ الملف الشخصي');
 }else if(form.id==='sendMessage'){
  const id=form.dataset.id,token=version;if(!data.body.trim())throw Error('اكتب الرسالة أولًا.');await api('messages/'+id,'POST',{body:data.body.trim()});form.reset();await fetchMessages(id,token);await refreshInbox(id,token);const stream=document.querySelector('#stream');if(stream)stream.scrollTop=stream.scrollHeight;
 }
 }catch(e){field.textContent=e.message;}finally{button.disabled=false;}return true;
}
setInterval(async()=>{
 if(document.visibilityState==='hidden'||pollBusy)return;pollBusy=true;
 try{
 const token=version,dm=location.pathname.match(/^\/messages(?:\/(\d+))?\/?$/);
 if(user&&dm){if(dm[1]&&threadPeer)await fetchMessages(dm[1],token);await refreshInbox(dm[1]||'',token);}
 }catch{/* Reconnect on the next poll. */}finally{pollBusy=false;}
},8000);
setInterval(async()=>{if(document.visibilityState==='hidden')return;await pulse();if(location.pathname==='/wall')wallPresence(version).catch(()=>{});},60000);

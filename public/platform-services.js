'use strict';
// One workspace for six service cores. Integrations stay opt-in; no simulated payments, streams or AI responses.
const tnServiceTabs=[
 ['ai','تنميات AI','message-square'],['live','البث المباشر','radio'],['calls','الاتصال','phone'],
 ['reels','Reels','clapperboard'],['privacy','الخصوصية','shield'],['payments','المدفوعات','credit-card']
];
let tnActiveService='ai';
function tnSafe(v){return esc(v);}
function tnServiceWelcome(k){return ({
 ai:'محادثات محفوظة ومسار جاهز لربط مزوّد توليدي، مع ضمان عدم اختلاق ردود.',
 live:'إنشاء جلسات وإدارة التحضير للبث، ثم ربط مزود الوسائط لاحقاً.',
 calls:'دعوات صوتية ومرئية بين الأصدقاء، وإشارات آمنة مقيّدة بالأطراف. نقل الصوت والفيديو يحتاج WebRTC وتجهيز الشبكة.',
 reels:'كتالوج مستقل لمقاطع الأعضاء، وربط الفيديوهات الموجودة بالمنشورات، وإدارة حالة نشر المقطع.',
 privacy:'ضبط نطاق ظهور النبذة وبيانات المناسبات والملف المهني، على أساس صلاحيات يطبّقها الخادم.',
 payments:'مسودات طلبات مالية وحسابات تسوية تأسيسية، دون سحب أموال أو منح حالة مدفوعة.'
 }[k]);}
// Contextual tools: no standalone Services landing page.
// The same authenticated API flows are reused inside a compact dialog.
async function tnOpenTool(service='ai'){
 tnActiveService=tnServiceTabs.some(t=>t[0]===service)?service:'ai';
 const title=tnServiceTabs.find(t=>t[0]===tnActiveService)[1];
 const isAi=tnActiveService==='ai';
 showModal(title,
  '<div class="tnEmbeddedTool '+(isAi?'tnAiWorkspace':'')+'"><p class="tnToolIntro">'+tnSafe(tnServiceWelcome(tnActiveService))+'</p>'+
  '<div id="tnServiceBody" class="tnServiceBody">جارٍ التحميل…</div></div>');
 dialog.classList.toggle('tnAiDialog',isAi);
 dialog.classList.toggle('tnToolDialog',!isAi);
 dialog.addEventListener('close',()=>{dialog.classList.remove('tnAiDialog','tnToolDialog');},{once:true});
 await tnLoadService(tnActiveService);
}
async function renderTnServices(service='ai'){await tnOpenTool(service);}
async function tnLoadService(k){
 const area=document.getElementById('tnServiceBody');if(!area)return;
 if(!user){area.innerHTML='<p>سجّل الدخول لفتح خدمات حسابك.</p><button class="btn primary" data-act="login">تسجيل الدخول</button>';return;}
 try{
 if(k==='ai'){
  const r=await api('platform/ai/threads');
  area.innerHTML='<div class="tnAiColumns"><aside class="tnAiHistory"><h3>محادثاتك</h3><form class="tnServiceForm" id="tnAiNew"><label>اسم المحادثة<input name="title" required maxlength="120" placeholder="محادثة جديدة"></label><button class="btn primary">＋ محادثة</button><div class="error"></div></form><div class="tnServiceList">'+r.threads.map(x=>'<button type="button" class="tnServiceRow" data-act="tn-ai-open" data-id="'+tnSafe(x.id)+'">'+tnSafe(x.title)+'</button>').join('')+'</div></aside><div class="tnAiConversation"><div class="tnAgentStrip"><strong>مساعد تنميات</strong><small>المساعد البحثي · محرر المعرفة · المستشار التنموي — أدوار مخططة لمرحلة ربط النموذج</small></div><div id="tnAiThread"><p>اختر محادثة أو أنشئ محادثة جديدة.</p></div></div></div>';
 }else if(k==='live'){
  const r=await api('platform/live/mine');
  area.innerHTML='<form id="tnLiveNew" class="tnServiceForm"><label>عنوان البث<input name="title" minlength="5" maxlength="160" required></label><label>وصف البث<textarea name="description" maxlength="1000"></textarea></label><button class="btn primary">إعداد جلسة بث</button><div class="error"></div></form><button class="btn" type="button" data-act="tn-media-test" data-video="yes">فحص الكاميرا والميكروفون قبل البث</button><h3>جلسات البث</h3><div class="tnServiceList">'+r.sessions.map(x=>'<article class="tnServiceRow"><strong>'+tnSafe(x.title)+'</strong><small>'+tnSafe(x.state)+'</small>'+(x.state==='draft'?'<button class="btn" data-act="tn-live-cancel" data-id="'+tnSafe(x.id)+'">إلغاء</button>':'')+'</article>').join('')+'</div><p class="tnServiceNote">بدء البث الحقيقي مشروط بتوصيل خدمة بث تدعم إصدار مفاتيح البث ومعالجة الفيديو والتحكم بالوصول.</p>';
 }else if(k==='calls'){
  const r=await api('platform/calls');
  area.innerHTML='<form id="tnCallNew" class="tnServiceForm"><label>رقم العضو (صديق)<input name="callee_id" type="number" required min="1"></label><label>نوع المكالمة<select name="kind"><option value="audio">صوتية</option><option value="video">مرئية</option></select></label><button class="btn primary">إنشاء دعوة اتصال</button><div class="error"></div></form><button class="btn" type="button" data-act="tn-media-test" data-video="yes">اختبار الكاميرا والميكروفون</button><h3>دعوات الاتصال</h3><div class="tnServiceList">'+r.calls.map(c=>'<article class="tnServiceRow"><strong>اتصال '+(c.kind==='audio'?'صوتي':'مرئي')+'</strong><small>'+tnSafe(c.status)+'</small>'+(c.status==='invited'&&c.callee_id===user.id?'<button data-act="tn-call-accept" data-id="'+tnSafe(c.id)+'" class="btn primary">قبول</button><button data-act="tn-call-decline" data-id="'+tnSafe(c.id)+'" class="btn">رفض</button>':'')+(c.status==='accepted'?'<button data-act="tn-call-connect" data-kind="'+tnSafe(c.kind)+'" data-initiator="'+(c.caller_id===user.id?'yes':'no')+'" data-id="'+tnSafe(c.id)+'" class="btn primary">فتح الاتصال</button><button data-act="tn-call-end" data-id="'+tnSafe(c.id)+'" class="btn">إنهاء</button>':'')+'</article>').join('')+'</div><p class="tnServiceNote">الدعوات والإشارات محفوظة؛ لا يمكن إجراء محادثة صوتية أو مرئية حتى تجهيز WebRTC/STUN/TURN والواجهة الآمنة لطلب صلاحية الكاميرا والميكروفون.</p>';
 }else if(k==='reels'){
  const [mine,posts,publicFeed]=await Promise.all([api('platform/reels/mine'),api('posts?user='+user.id),api('platform/reels')]);
  const videos=(posts.posts||[]).flatMap(p=>(p.attachments||[]).filter(f=>f.mime==='video/mp4'&&/^\/api\/files\/[0-9a-f-]{36}$/.test(f.url||'')).map(f=>({key:f.url,title:p.title||f.name||'مقطع فيديو'})));
  area.innerHTML='<form id="tnReelNew" class="tnServiceForm"><label>عنوان المقطع<input name="title" minlength="3" maxlength="160" required></label><label>الوصف<textarea name="caption" maxlength="1500"></textarea></label><label>اختر فيديو من منشوراتك<select name="media_key" required><option value="">اختر الفيديو</option>'+videos.map(v=>'<option value="'+tnSafe(v.key)+'">'+tnSafe(v.title)+'</option>').join('')+'</select></label><label>نطاق العرض<select name="visibility"><option value="private">خاص</option><option value="followers">المتابعون</option><option value="public">عام</option></select></label><button class="btn primary">إضافة مسودة Reel</button><div class="error"></div></form><h3>مقاطعي</h3><div class="tnServiceList">'+mine.reels.map(x=>'<article class="tnServiceRow"><strong>'+tnSafe(x.title)+'</strong><small>'+tnSafe(x.status)+' · '+tnSafe(x.visibility)+'</small>'+(x.status==='draft'?'<button class="btn" data-act="tn-reel-publish" data-id="'+x.id+'">نشر</button>':'')+'</article>').join('')+'</div><h3>مقاطع المجتمع</h3><div class="tnReelFeed">'+publicFeed.reels.map(r=>'<article class="tnReelTile"><video src="'+tnSafe(r.media_key)+'" controls playsinline preload="metadata" aria-label="'+tnSafe(r.title)+'"></video><div><strong>'+tnSafe(r.title)+'</strong><p>'+tnSafe(r.caption||'')+'</p><small>'+tnSafe(r.author)+'</small></div></article>').join('')+'</div><p class="tnServiceNote">الرفع الجديد والتحويل إلى مقاطع عمودية متعددة الدقات سيصبحان متاحين بعد ربط خدمة تخزين ومعالجة فيديو. يمكن إنشاء المسودات من الفيديوهات المنشورة حالياً.</p>';
 }else if(k==='privacy'){
  const r=await api('platform/privacy'),p=r.privacy;
  const select=(name,value)=>'<select name="'+name+'">'+[['public','عام'],['members','الأعضاء'],['friends','الأصدقاء'],['only_me','أنا فقط']].map(([v,l])=>'<option value="'+v+'" '+(value===v?'selected':'')+'>'+l+'</option>').join('')+'</select>';
  area.innerHTML='<form id="tnPrivacy" class="tnServiceForm">'+[['bio_scope','النبذة الشخصية'],['birthday_scope','تاريخ الميلاد'],['events_scope','المناسبات الخاصة'],['professional_scope','الملف المهني']].map(([name,label])=>'<label>'+label+select(name,p[name])+'</label>').join('')+'<label>تاريخ الميلاد (اختياري)<input name="date_of_birth" type="date" value="'+tnSafe(p.date_of_birth||'')+'"></label><label>المناسبات الخاصة (كل مناسبة في سطر)<textarea name="events">'+tnSafe(Array.isArray(p.private_events)?p.private_events.join('\n'):JSON.parse(p.private_events||'[]').join('\n'))+'</textarea></label><button class="btn primary">حفظ الخصوصية</button><div class="error"></div></form><p class="tnServiceNote">تُفرض خصوصية النبذة في API الملف الشخصي. بيانات الميلاد والمناسبات تُحفظ بحماية افتراضية ولا تُعرض في ملف العضو العام؛ تفعيل العرض المشروط لهما والملف المهني يتطلب مراجعة جميع نقاط استرجاع هذه البيانات.</p>';
 }else if(k==='payments'){
  const r=await api('platform/payments/orders');
  area.innerHTML=(user?.role==='admin'?'<div id="tnPaymentPolicy">جارٍ تحميل سياسة العمولات…</div>':'')+'<form id="tnOrderDraft" class="tnServiceForm"><label>رقم حساب البائع<input type="number" name="seller_id" required min="1"></label><label>القيمة بالريال<input type="number" name="amount_sar" min="0" step="0.01" required></label><label>وصف الطلب<input name="description" maxlength="500"></label><button class="btn primary">حفظ مسودة الطلب</button><div class="error"></div></form><h3>طلباتي</h3><div class="tnServiceList">'+r.orders.map(x=>'<article class="tnServiceRow"><strong>'+tnSafe(x.description||'طلب')+'</strong><small>'+(Number(x.subtotal_minor)/100).toFixed(2)+' ر.س · '+tnSafe(x.status)+'</small></article>').join('')+'</div><p class="tnServiceNote">هذه مسودات وليست طلبات شراء مسددة. العمولة صفر حتى اعتماد سياسة عمولات موثقة. لا تُحصّل المنصة مبالغ، ولا تقبل إشعارات دفع من العميل.</p>';
  if(user?.role==='admin'){
   try{
    const r=await api('platform/payments/policy'),p=r.policy;
    document.getElementById('tnPaymentPolicy').innerHTML='<form id="tnPolicyForm" class="tnServiceForm"><label>عمولة النسبة (نقطة أساس من 10,000)<input name="commission_basis_points" type="number" min="0" max="5000" value="'+Number(p.commission_basis_points)+'" required></label><label>رسم ثابت (هللات)<input name="fixed_commission_minor" type="number" min="0" max="10000000" value="'+Number(p.fixed_commission_minor)+'" required></label><button class="btn primary">حفظ سياسة العمولات</button><div class="error"></div></form>';
   }catch(e){document.getElementById('tnPaymentPolicy').textContent=e.message;}
  }

 }
 }catch(e){area.innerHTML='<p class="error">'+tnSafe(e.message)+'</p>';}
}
async function tnServicesClick(action,el){
 if(action==='tn-call-connect'){await tnWebRtcConnect(el.dataset.id,el.dataset.initiator==='yes',el.dataset.kind==='video');return true;}
 if(action==='tn-media-test'){
  if(!navigator.mediaDevices?.getUserMedia){notify('لا يدعم المتصفح الوصول إلى الكاميرا والميكروفون.');return true;}
  try{
   const stream=await navigator.mediaDevices.getUserMedia({audio:true,video:el.dataset.video==='yes'});
   showModal('فحص أجهزة البث والاتصال','<div class="tnMediaTest"><video autoplay muted playsinline controls="false"></video><p>هذه معاينة محلية فقط. لا يُرسل الصوت أو الفيديو إلى المجتمع.</p><button class="btn primary" type="button" data-act="close">إنهاء الفحص</button></div>');
   const video=document.querySelector('.tnMediaTest video');if(video){video.srcObject=stream;video.play().catch(()=>{});}
   dialog.addEventListener('close',()=>stream.getTracks().forEach(t=>t.stop()),{once:true});
  }catch(e){notify('تعذر فتح أجهزة الوسائط؛ تحقق من أذونات المتصفح.');}
  return true;
 }
 if(action==='tn-tool'){if(!user){auth('login');return true;}await tnOpenTool(el.dataset.service);return true;}
 if(action==='tn-tab'){await tnOpenTool(el.dataset.service);return true;}
 if(action==='tn-ai-open'){
  const r=await api('platform/ai/threads/'+el.dataset.id);const node=document.getElementById('tnAiThread');if(!node)return true;
  node.innerHTML='<h3>'+tnSafe(r.thread.title)+'</h3><div class="tnServiceMessages">'+r.messages.map(m=>'<p><strong>'+tnSafe(m.role==='user'?'أنت':'المساعد')+': </strong>'+tnSafe(m.body)+'</p>').join('')+'</div><form class="tnServiceForm" id="tnAiMessage"><input type="hidden" name="thread_id" value="'+tnSafe(r.thread.id)+'"><label>اكتب رسالتك<textarea name="body" required maxlength="8000"></textarea></label><button class="btn primary">حفظ الرسالة</button><div class="error"></div></form><p class="tnServiceNote">لن يُنشأ رد توليدي حتى توصيل مزود الذكاء الاصطناعي.</p>';return true;
 }
 if(['tn-live-cancel','tn-call-accept','tn-call-decline','tn-call-end','tn-reel-publish'].includes(action)){
  try{
   if(action==='tn-live-cancel')await api('platform/live/'+el.dataset.id,'PATCH',{state:'cancelled'});
   if(action.startsWith('tn-call-'))await api('platform/calls/'+el.dataset.id,'PATCH',{status:action.split('-')[2]==='end'?'ended':action.split('-')[2]==='accept'?'accepted':'declined'});
   if(action==='tn-reel-publish')await api('platform/reels/'+el.dataset.id,'PATCH',{status:'published'});
   notify('تم تحديث الحالة.');await tnLoadService(tnActiveService);
  }catch(e){notify(e.message);}
  return true;
 }
 return false;
}
async function tnServicesForm(form,data){
 const p=form.id;
 if(!['tnAiNew','tnAiMessage','tnLiveNew','tnCallNew','tnReelNew','tnPrivacy','tnOrderDraft','tnPolicyForm'].includes(p))return false;
 const error=form.querySelector('.error');if(error)error.textContent='';
 const button=form.querySelector('button[type=submit],button:not([type])');if(button)button.disabled=true;
 try{
  if(p==='tnAiNew'){const created=await api('platform/ai/threads','POST',data);await tnLoadService('ai');await tnServicesClick('tn-ai-open',{dataset:{id:created.id}});return true;}
  if(p==='tnAiMessage'){await api('platform/ai/threads/'+data.thread_id+'/messages','POST',{body:data.body});await tnServicesClick('tn-ai-open',{dataset:{id:data.thread_id}});return true;}
  if(p==='tnLiveNew')await api('platform/live','POST',data);
  if(p==='tnCallNew')await api('platform/calls','POST',{callee_id:Number(data.callee_id),kind:data.kind});
  if(p==='tnReelNew')await api('platform/reels','POST',data);
  if(p==='tnPrivacy')await api('platform/privacy','PUT',{...data,private_events:String(data.events||'').split('\n').map(s=>s.trim()).filter(Boolean),date_of_birth:data.date_of_birth||null});
  if(p==='tnPolicyForm')await api('platform/payments/policy','PUT',{commission_basis_points:Number(data.commission_basis_points),fixed_commission_minor:Number(data.fixed_commission_minor)});
  if(p==='tnOrderDraft'){
   const amount=Math.round(Number(data.amount_sar)*100);
   if(!Number.isSafeInteger(amount)||amount<0)throw Error('القيمة غير صحيحة.');
   await api('platform/payments/orders','POST',{seller_id:Number(data.seller_id),subtotal_minor:amount,description:data.description});
  }
  notify('حُفظت البيانات.');
  await tnLoadService(tnActiveService);
 }catch(e){if(error)error.textContent=e.message;else notify(e.message);}finally{if(button)button.disabled=false;}
 return true;
}

let tnRtcCurrent=null;
async function tnWebRtcConnect(sessionId,initiator,withVideo){
 if(!navigator.mediaDevices?.getUserMedia||typeof RTCPeerConnection==='undefined'){notify('المتصفح لا يدعم اتصال WebRTC.');return;}
 if(tnRtcCurrent){notify('أنه اتصالك الحالي أولاً.');return;}
 let local,peer,interval,latest=0,remoteReady=false;
 const pending=[];
 const close=()=>{
  if(interval)clearInterval(interval);
  if(peer)peer.close();
  if(local)local.getTracks().forEach(t=>t.stop());
  tnRtcCurrent=null;
 };
 try{
  local=await navigator.mediaDevices.getUserMedia({audio:true,video:withVideo});
  // A TURN/STUN server should be supplied after provider integration; host candidates alone
  // generally work only for peers on networks with a direct route.
  peer=new RTCPeerConnection({iceServers:[]});
  tnRtcCurrent={close,sessionId};
  showModal('اتصال تنميات','<div class="tnRtcStage"><div><strong>كاميرتك</strong><video class="tnRtcLocal" autoplay muted playsinline></video></div><div><strong>الطرف الآخر</strong><video class="tnRtcRemote" autoplay playsinline></video></div><p class="tnServiceNote">الاتصال التجريبي يعمل عند إمكان الاتصال المباشر بالشبكة. تحتاج الاتصالات عبر الإنترنت عادة إلى مزود STUN/TURN. لا تُسجّل الوسائط في قاعدة البيانات.</p><button type="button" class="btn" data-act="close">إغلاق الاتصال</button></div>');
  const localVideo=document.querySelector('.tnRtcLocal'),remoteVideo=document.querySelector('.tnRtcRemote');
  if(localVideo){localVideo.srcObject=local;localVideo.play().catch(()=>{});}
  const output=new MediaStream();
  if(remoteVideo)remoteVideo.srcObject=output;
  local.getTracks().forEach(t=>peer.addTrack(t,local));
  peer.addEventListener('track',e=>{
    e.streams[0]?.getTracks().forEach(t=>{if(!output.getTracks().some(x=>x.id===t.id))output.addTrack(t);});
    remoteVideo?.play().catch(()=>{});
  });
  const send=async(signal_kind,value)=>api('platform/calls/'+sessionId+'/signals','POST',{signal_kind,payload:JSON.stringify(value)});
  peer.addEventListener('icecandidate',e=>{if(e.candidate)send('candidate',e.candidate.toJSON()).catch(()=>{});});
  dialog.addEventListener('close',close,{once:true});
  const poll=async()=>{
   if(!tnRtcCurrent||tnRtcCurrent.sessionId!==sessionId)return;
   try{
    const r=await api('platform/calls/'+sessionId+'/signals?after='+latest);
    for(const signal of r.signals){
     latest=Math.max(latest,signal.id);
     if(signal.sender_id===user.id)continue;
     let payload;try{payload=JSON.parse(signal.payload);}catch{continue;}
     if(signal.signal_kind==='offer'&&!initiator&&payload.type==='offer'){
      await peer.setRemoteDescription(payload);remoteReady=true;
      for(const c of pending.splice(0))await peer.addIceCandidate(c).catch(()=>{});
      const answer=await peer.createAnswer();await peer.setLocalDescription(answer);
      await send('answer',peer.localDescription.toJSON());
     }else if(signal.signal_kind==='answer'&&initiator&&payload.type==='answer'&&!peer.currentRemoteDescription){
      await peer.setRemoteDescription(payload);remoteReady=true;
      for(const c of pending.splice(0))await peer.addIceCandidate(c).catch(()=>{});
     }else if(signal.signal_kind==='candidate'){
      if(remoteReady)await peer.addIceCandidate(payload).catch(()=>{});
      else pending.push(payload);
     }else if(signal.signal_kind==='bye'){dialog.close();}
    }
   }catch(e){notify('تعذر جلب إشارات الاتصال.');}
  };
  interval=setInterval(poll,1800);
  if(initiator){
   const offer=await peer.createOffer();await peer.setLocalDescription(offer);
   await send('offer',peer.localDescription.toJSON());
  }
  await poll();
 }catch(e){close();if(dialog.open)dialog.close();notify('تعذر بدء الاتصال أو الحصول على إذن الأجهزة.');}
}

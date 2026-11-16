'use strict';
// Separate personal submission tracking and consolidated admin review from the account dropdown.
const reviewLabels={post:'منشور',project:'مشروع',need:'احتياج',opportunity:'فرصة',organization:'جهة',application:'طلب مشاركة',received_application:'طلب مشاركة وارد',relation:'تعارف مهني',collaboration:'مشاركة مشروع',partnership:'تعاون مجموعات',group_link:'ربط مجموعة بمشروع',outcome:'نتيجة'};
const reviewStates={visible:'منشور',published:'منشور',pending:'قيد المراجعة',unverified:'بانتظار التحقق',verified:'تم التحقق',rejected:'مرفوض',hidden:'مخفي',closed:'مغلق',completed:'مكتمل',accepted:'مقبول',reviewed:'تمت مراجعة الدليل',self_reported:'إفادة ذاتية'};
function reviewCard(x){
 const paths={post:'/profile/'+user.id,project:'/my-projects',opportunity:'/my-opportunities',need:'/my-needs',
 organization:'/my-opportunities',application:'/my-opportunities',received_application:'/my-opportunities',
 relation:'/network',collaboration:'/my-projects',partnership:'/group-partnerships',group_link:'/my-opportunities'};
 const href=paths[x.kind];
 return '<article class="reviewItem"><span class="reviewKind">'+esc(reviewLabels[x.kind]||x.kind)+'</span><h3>'+esc(x.title||'بدون عنوان')+'</h3><p>'+esc(reviewStates[x.status]||x.status)+'</p><small>'+esc(x.created_at||'')+'</small>'+(href?'<a class="journeyLink" href="'+href+'">فتح القسم المختص</a>':'')+'</article>';
}
async function renderMySubmissions(token){
 if(location.pathname!=='/my-submissions')return false;
 if(!user){go('/welcome');return true;}
 main.innerHTML='<div class="status">جارٍ تحميل مشاركاتك وطلبـاتك...</div>';
 const data=await api('review-center/mine');if(token!==version)return true;
 const body='<section class="journeyPanel"><h2>حالات مشاركاتي وطلباتي</h2><p>يمكنك معرفة حالة كل موضوع أو مشروع أو فرصة أو احتياج أو جهة أرسلتها، دون البحث في صفحات أخرى.</p><div class="reviewGrid">'+(data.items.length?data.items.map(reviewCard).join(''):'<p class="journeyEmpty">لم تسجل مشاركات أو طلبات بعد.</p>')+'</div></section>';
 jShell('متابعة مشاركاتي','سجل الطلبات والمحتوى وحالة المراجعة.',body);
 return true;
}
async function renderReviewQueue(){
 const target=document.getElementById('govContent');if(!target)return;
 const {items,counts}=await api('review-center/queue');
 if(!target.isConnected||governanceTab!=='queue')return;
 const types=['project','need','opportunity','organization','outcome','post'];
 const labels=types.map(k=>'<div class="gov-metric"><span>'+esc(reviewLabels[k])+'</span><strong>'+Number(counts[k]||0)+'</strong></div>').join('');
 const cards=items.map(item=>{
  const type=item.kind;
  const actions=type==='outcome'
   ?'<button data-act="review-decision" data-kind="outcome" data-id="'+item.id+'" data-status="reviewed" class="btn">مراجعة الدليل</button>'
   :'<button data-act="review-decision" data-kind="'+type+'" data-id="'+item.id+'" data-status="approved" class="btn primary">اعتماد</button> '+
     '<button data-act="review-decision" data-kind="'+type+'" data-id="'+item.id+'" data-status="rejected" class="btn">رفض</button>';
  return '<article class="reviewItem"><span class="reviewKind">'+esc(reviewLabels[type]||type)+'</span><h3>'+esc(item.title)+'</h3><p>'+esc(item.description||'')+'</p>'+(item.evidence_url?'<a href="'+esc(item.evidence_url)+'" target="_blank" rel="noopener noreferrer">فتح دليل النتيجة</a>':'')+'<small>'+esc(item.owner)+' · '+esc(item.created_at||'')+'</small><div class="reviewActions">'+actions+'</div></article>';
 }).join('');
 target.innerHTML='<div class="gov-metrics">'+labels+'</div><p class="gov-tip">تضم هذه القائمة الطلبات المعلقة في جميع خدمات المجتمع. اعتماد النتائج يعني مراجعة دليلها، وليس إثبات أثر مستقل.</p>'+
 '<div class="reviewGrid">'+(cards||'<p class="journeyEmpty">لا توجد طلبات قيد المراجعة حالياً.</p>')+'</div>';
}
async function reviewCenterAction(action,el){
 if(action!=='review-decision')return false;
 if(user?.role!=='admin')return true;
 const {kind,id,status}=el.dataset;
 const note=prompt('أدخل سبب القرار أو تفاصيل المراجعة:');if(note===null)return true;
 if(note.trim().length<12){notify('يرجى إضافة سبب واضح لا يقل عن 12 حرفاً');return true;}
 const approvals={project:'published',need:'published',opportunity:'published',organization:'verified',post:'visible'};
 const decisions={project:'rejected',need:'rejected',opportunity:'rejected',organization:'rejected',post:'hidden'};
 const decision=status==='approved'?approvals[kind]:status==='rejected'?decisions[kind]:'reviewed';
 const paths={project:'hub/admin/projects/',need:'needs/admin/',opportunity:'work/admin/opportunities/',organization:'work/admin/organizations/',outcome:'work/admin/outcomes/',post:'admin/posts/'};
 if(!paths[kind])return true;
 const payload=(kind==='project'||kind==='post')?{status:decision,reason:note.trim()}:{status:decision,note:note.trim()};
 el.disabled=true;
 try{await api(paths[kind]+id,'PATCH',payload);notify('حُفظ القرار وتحدثت حالة الطلب');await renderReviewQueue();}
 catch(error){notify(error.message);}
 finally{el.disabled=false;}
 return true;
}

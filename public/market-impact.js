'use strict';
const marketKindLabels={producer:'منتج',manufacturer:'مصنّع',distributor:'موزّع',service_provider:'مقدم خدمات'};
const marketMoney=p=>p===null||p===undefined?'السعر عند الطلب':(Number(p)/100).toLocaleString('ar-SA',{style:'currency',currency:'SAR'});
async function renderMarket(){
 document.title='سوق تنميات | مجتمع تنميات';
 main.innerHTML='<section class="tnMarket"><div class="marketHero"><small>مجتمع تنميات · منظومة الأعمال</small><h1>سوق تنميات</h1><p>سوق موحد ومساحات تجارية ذكية للمنتجين والمصنّعين والموزعين ومقدمي الخدمات.</p><a href="#marketApply" class="btn primary">أنشئ مساحتك التجارية</a></div><div class="marketFilters"><input id="marketQuery" type="search" placeholder="ابحث عن منتج أو خدمة" aria-label="ابحث في السوق"><select id="marketType"><option value="">جميع العروض</option><option value="product">المنتجات</option><option value="service">الخدمات</option></select><button class="btn" data-act="market-refresh">بحث</button></div><h2>المنتجات والخدمات</h2><div id="marketListings" class="marketGrid">جارٍ تحميل العروض…</div><h2>المساحات التجارية</h2><div id="marketStores" class="marketGrid">جارٍ تحميل المساحات…</div><section id="marketApply" class="marketApply"><h2>مساحتي في سوق تنميات</h2><p>أنشئ واجهتك الخاصة ضمن سوق تنميات. تُراجع طلبات المساحات قبل نشرها، والبيع والدفع الإلكتروني سيُفعّلان في مرحلة مستقلة.</p><div id="marketMyStores"></div></section></section>';
 await refreshMarket();
}
async function refreshMarket(){
 const listingBox=document.getElementById('marketListings'),storeBox=document.getElementById('marketStores');
 if(!listingBox||!storeBox)return;
 try{
  const q=encodeURIComponent(document.getElementById('marketQuery').value.trim()),type=encodeURIComponent(document.getElementById('marketType').value);
  const [a,b]=await Promise.all([api('market/listings?q='+q+'&type='+type),api('market/stores')]);
  listingBox.innerHTML=a.listings.length?a.listings.map(p=>'<article class="marketCard"><span class="marketTag">'+(p.type==='service'?'خدمة':'منتج')+'</span><h3>'+esc(p.title)+'</h3><p>'+esc(p.description)+'</p><strong>'+esc(marketMoney(p.price_minor))+'</strong><small>المساحة: '+esc(p.store_name)+'</small></article>').join(''):'<p>لا توجد عروض منشورة بعد. يمكن لأصحاب المساحات إضافة أولى عروضهم.</p>';
  storeBox.innerHTML=b.stores.length?b.stores.map(s=>'<article class="marketCard"><span class="marketTag">'+esc(marketKindLabels[s.kind]||s.kind)+'</span><h3>'+esc(s.name)+'</h3><p>'+esc(s.description)+'</p><small>بإدارة '+esc(s.owner_name)+' · '+Number(s.listings)+' عروض</small></article>').join(''):'<p>لم تُعتمد مساحات تجارية بعد.</p>';
 }catch(e){listingBox.textContent=e.message;storeBox.textContent='تعذّر تحميل المساحات.';}
 const mine=document.getElementById('marketMyStores');if(!mine)return;
 if(!user){mine.innerHTML='<p>سجّل الدخول لإنشاء مساحة تجارية.</p><button class="btn" data-act="login">تسجيل الدخول</button>';return;}
 try{
  const res=await api('market/my-stores');
  mine.innerHTML='<div class="marketGrid">'+res.stores.map(s=>'<article class="marketCard"><h3>'+esc(s.name)+'</h3><p>الحالة: '+esc({pending:'قيد المراجعة',approved:'معتمدة',rejected:'مرفوضة',suspended:'معلقة'}[s.status])+'</p>'+(s.status==='approved'?'<form class="marketListingForm" data-store-id="'+s.id+'"><label>عنوان العرض<input name="title" required minlength="3" maxlength="160"></label><label>التفاصيل<textarea name="description" maxlength="2000"></textarea></label><label>نوع العرض<select name="type"><option value="product">منتج</option><option value="service">خدمة</option></select></label><label>السعر بالريال (اختياري)<input name="price_sar" type="number" min="0" step="0.01" placeholder="السعر عند الطلب"></label><button class="btn primary">نشر عرض</button><div class="error"></div></form>':'')+'</article>').join('')+'</div><form id="marketStoreForm" class="marketStoreForm"><h3>طلب مساحة تجارية جديدة</h3><label>اسم المساحة<input name="name" required minlength="3" maxlength="100"></label><label>الصفة التجارية<select name="kind"><option value="producer">منتج</option><option value="manufacturer">مصنّع</option><option value="distributor">موزّع</option><option value="service_provider">مقدم خدمات</option></select></label><label>وصف النشاط<textarea name="description" maxlength="1000"></textarea></label><button class="btn primary">إرسال الطلب للمراجعة</button><div class="error"></div></form>';
 }catch(e){mine.textContent=e.message;}
}
async function renderImpactMembers(){
 document.title='أثر الأعضاء | تنميات';
 main.innerHTML='<section class="tnMarket"><div class="marketHero"><small>مجتمع تنميات · قياس الأثر</small><h1>تصنيف الأعضاء وفق الأثر</h1><p>تصنيف نوعي يعتمد على نتائج موثّقة ومراجعة بشرية، وليس على كثرة المنشورات أو الإعجابات.</p></div><div id="impactMembers" class="marketGrid">جارٍ تحميل التصنيفات…</div>'+(user?.role==='admin'?'<section class="marketApply"><h2>اعتماد أثر عضو</h2><form id="impactReviewForm"><label>رقم العضو<input name="member_id" type="number" min="1" required></label><label>تقييم الأثر (0–100)<input name="score" type="number" min="0" max="100" required></label><label>الأدلة والنتائج المحققة<textarea name="evidence" minlength="12" maxlength="1000" required></textarea></label><button class="btn primary">اعتماد التقييم</button><div class="error"></div></form></section>':'')+'</section>';
 await refreshImpactMembers();
}
async function refreshImpactMembers(){
 const el=document.getElementById('impactMembers');if(!el)return;
 try{const r=await api('impact/members');el.innerHTML=r.members.length?r.members.map(m=>'<article class="marketCard"><span class="marketTag">'+esc(m.category)+'</span><h3>'+esc(m.name)+'</h3><strong>'+Number(m.score)+' / 100</strong><p>'+esc(m.evidence||'')+'</p></article>').join(''):'<p>لم تُعتمد تصنيفات أثر بعد.</p>';}catch(e){el.textContent=e.message;}
}
async function renderMarketAdmin(){
 if(user?.role!=='admin'){go('/wall');return;}
 document.title='إدارة سوق تنميات';
 main.innerHTML='<section class="tnMarket"><div class="marketHero"><h1>مراجعة المساحات التجارية</h1><p>مراجعة واعتماد مساحات البائعين قبل إتاحتها في السوق.</p></div><div id="marketAdminStores" class="marketGrid"></div></section>';
 await refreshMarketAdmin();
}
async function refreshMarketAdmin(){
 const el=document.getElementById('marketAdminStores');if(!el)return;
 try{const res=await api('market/admin/stores');el.innerHTML=res.stores.map(s=>'<article class="marketCard"><span class="marketTag">'+esc(s.status)+'</span><h3>'+esc(s.name)+'</h3><p>'+esc(s.owner_name)+' · '+esc(s.owner_email)+'</p><div class="marketRow">'+['approved','rejected','suspended'].map(st=>'<button type="button" class="btn" data-act="market-status" data-store-id="'+s.id+'" data-status="'+st+'">'+({approved:'اعتماد',rejected:'رفض',suspended:'تعليق'}[st])+'</button>').join('')+'</div></article>').join('')||'<p>لا توجد طلبات بعد.</p>';}catch(e){el.textContent=e.message;}
}
async function marketImpactForm(form,data){
 try{
 if(form.id==='marketStoreForm'){await api('market/stores','POST',data);notify('تم إرسال طلب المساحة للمراجعة.');await refreshMarket();return true;}
 if(form.classList.contains('marketListingForm')){
  const cents=data.price_sar===''?null:Math.round(Number(data.price_sar)*100);
  if(cents!==null&&(!Number.isSafeInteger(cents)||cents<0)){throw new Error('السعر غير صحيح.');}
  await api('market/stores/'+form.dataset.storeId+'/listings','POST',{...data,price_minor:cents});
  notify('نُشر العرض بنجاح.');await refreshMarket();return true;
 }
 if(form.id==='impactReviewForm'){await api('impact/members/'+Number(data.member_id),'PUT',data);notify('اعتمد تصنيف الأثر.');await refreshImpactMembers();return true;}
 }catch(e){const err=form.querySelector('.error');if(err)err.textContent=e.message;else notify(e.message);return true;}
 return false;
}
async function marketImpactAction(act,element){
 if(act==='market-refresh'){await refreshMarket();return true;}
 if(act==='market-status'){
  if(!confirm('هل تريد تغيير حالة المساحة التجارية؟'))return true;
  try{await api('market/admin/stores/'+Number(element.dataset.storeId),'PATCH',{status:element.dataset.status});await refreshMarketAdmin();notify('تم تحديث الحالة.');}catch(e){notify(e.message);}return true;
 }
 return false;
}

'use strict';
// Market Pro — progressive enhancement of Tnmyat existing accounts and approved stores.
const marketProStatus={new:'جديد',quoted:'تم التسعير',accepted:'مقبول مبدئياً',declined:'مرفوض',closed:'مغلق',submitted:'مقدم',selected:'مختار',rejected:'غير مختار'};
const marketProCategories=['عام','مواد البناء','التقنية','الصناعة','الزراعة','الأغذية','التعليم','الخدمات المهنية','التجهيزات','النقل واللوجستيات'];
const marketProCategoryOptions=(selected='')=>marketProCategories.map(s=>'<option value="'+esc(s)+'" '+(s===selected?'selected':'')+'>'+esc(s)+'</option>').join('');
const marketProPrice=p=>marketMoney(p);
const marketProPending='<p class="marketEmpty">لا توجد عناصر منشورة هنا بعد. ستكون هذه المساحة متاحة مع أول مشاركة معتمدة.</p>';
let marketProTab='all',marketProStores=[];
async function renderMarketPro(){
 document.title='سوق تنميات | مجتمع تنميات';
 main.innerHTML='<section class="marketPro tnMarket"><div class="marketProHero"><div class="marketProHeroText"><div class="marketProEyebrow">مجتمع تنميات · بيئة أعمال رقمية</div><h1>سوق تنميات</h1><p>السوق الموحد، والمتاجر الذكية، ومساحة المنافسة والتوريد في منظومة أعمال متكاملة.</p><div class="marketProHeroActions"><a class="marketProButton main" href="#marketProExplore">استكشف السوق</a><a class="marketProButton ghost" href="#marketProWorkspace">مساحتي التجارية</a></div></div><div class="marketProHeroPanel"><span>نموذج العمل</span><strong>سوق موحّد + مساحات مستقلة</strong><p>تجربة واحدة للتصفح والتوريد، وهوية خاصة لكل بائع.</p><div class="marketProPillRow"><span>B2C</span><span>B2B</span><span>RFQ</span></div></div></div>'+
 '<div class="marketProStats" id="marketProStats"><article><span>مساحات معتمدة</span><strong id="mpStatStores">—</strong></article><article><span>عروض منشورة</span><strong id="mpStatListings">—</strong></article><article><span>منافسات مفتوحة</span><strong id="mpStatRfqs">—</strong></article><article><span>أنماط النشاط</span><strong>4</strong></article></div>'+
 '<section class="marketProServices"><h2>منظومة سوق تنميات</h2><div class="marketProServiceGrid">'+[
 ['▣','السوق الموحد','منتجات وخدمات من مساحات تجارية موثوقة ومعتمدة'],
 ['▤','متاجر مستقلة','مساحات للبائعين بهوياتهم وعروضهم ومؤشراتهم'],
 ['◇','سوق الأعمال B2B','طلبات أسعار وتوريد وطلبات كميات بين المنشآت'],
 ['⚑','سوق الفرص RFQ','طرح الاحتياجات التنافسية واستقبال عروض الموردين'],
 ['◎','مؤشرات الأداء','متابعة الاستفسارات والفرص والعروض والمساحات'],
 ['✦','الخدمات الذكية','تحسين الوصف والمطابقة والتحليلات ضمن خارطة التطوير']
 ].map(([i,h,d])=>'<article class="marketProService"><span class="marketProServiceIcon">'+i+'</span><h3>'+h+'</h3><p>'+d+'</p></article>').join('')+'</div></section>'+
 '<section id="marketProExplore" class="marketProSection"><div class="marketProSectionHead"><div><small>استكشف المنتجات والخدمات</small><h2>مساحات الأعمال</h2></div><a href="#marketProWorkspace">اعرض منتجاتك وخدماتك</a></div><form id="marketProSearch" class="marketProSearch"><label>البحث<input name="q" id="marketProQuery" type="search" placeholder="ابحث عن منتج أو خدمة أو مورد"></label><label>نوع العرض<select name="type" id="marketProType"><option value="">الكل</option><option value="product">منتجات</option><option value="service">خدمات</option></select></label><label>المجال<select name="category" id="marketProCategory"><option value="">كل المجالات</option>'+marketProCategoryOptions()+'</select></label><button class="marketProButton main" type="submit">بحث</button></form><div class="marketProCatalog" id="marketProCatalog">جارٍ تحميل العروض…</div></section>'+
 '<section class="marketProSection"><div class="marketProSectionHead"><div><small>شركاء الأعمال</small><h2>المساحات التجارية المعتمدة</h2></div></div><div id="marketProStoreGrid" class="marketProCardGrid">جارٍ تحميل المتاجر…</div></section>'+
 '<section class="marketProSection" id="marketProRfqs"><div class="marketProSectionHead"><div><small>أعمال وتوريد</small><h2>المنافسات وطلبات عروض الأسعار</h2></div></div><p class="marketProLead">انشر احتياجاً واضحاً، واستقبل عروض الموردين، واختر العرض الأنسب. الاختيار ليس عملية شراء أو تعاقداً نهائياً.</p><div class="marketProTwo"><div id="marketProRfqList" class="marketProRfqList">جارٍ تحميل المنافسات…</div><div class="marketProPane"><h3>طرح فرصة توريد</h3>'+(user?'<form id="marketProRfqForm" class="marketProForm"><label>عنوان الاحتياج<input name="title" required minlength="6" maxlength="150"></label><label>التفاصيل والمواصفات<textarea name="description" required minlength="20" maxlength="2500"></textarea></label><label>القطاع<select name="category">'+marketProCategoryOptions()+'</select></label><label>الكمية المتوقعة<input name="quantity" type="number" min="1" placeholder="اختياري"></label><label>آخر موعد للتقديم<input name="deadline" type="date"></label><button class="marketProButton main" type="submit">نشر المنافسة</button><div class="error" role="alert"></div></form>':'<p>سجّل الدخول لطرح منافسة جديدة.</p><button class="btn" data-act="login">تسجيل الدخول</button>')+'</div></div></section>'+
 '<section class="marketProSection" id="marketProWorkspace"><div class="marketProSectionHead"><div><small>أعمالي في تنميات</small><h2>لوحة التاجر والمشتري</h2></div></div><div id="marketProDashboard">'+(user?'جارٍ تحميل مؤشرات أعمالك…':'<p>سجّل الدخول لإنشاء مساحة أو متابعة طلبات الأسعار.</p><button class="btn" data-act="login">تسجيل الدخول</button>')+'</div></section>'+
 '<section class="marketProSection marketProRoadmap"><h2>الخدمات المشتركة والرؤية التطويرية</h2><p class="marketProLead">بنية موحّدة تدعم المشاركين دون أن تلغي استقلالية متاجرهم.</p><div class="marketProRoadmapGrid">'+[
 ['مفعّل في هذا الإصدار','الهوية التجارية والفهرس','مساحات مستقلة، بحث، تصنيفات، صور روابط، مخزون وصور المنتجات'],
 ['مفعّل في هذا الإصدار','طلبات الأسعار والمنافسات','استفسارات العملاء، تسعير البائع، منافسات التوريد وعروضها'],
 ['مخطط للتكامل','الدفع والفواتير والعمولات','تكامل مزود دفع موثق، ضرائب وفوترة وعمولات قابلة للتخصيص'],
 ['مخطط للتكامل','الشحن وتنفيذ الطلبات','شركات الشحن، حالات الطلب، الإرجاع، وحلول التخزين'],
 ['مخطط للتكامل','التسويق والتحليلات','قسائم، حملات، تقارير مبيعات ومؤشرات جودة الخدمة'],
 ['مخطط للتكامل','المساعد التجاري الذكي','مطابقة موردين، صياغة وصف، مقارنة عروض، وتحليلات ذكية']
 ].map(([status,title,desc])=>'<article class="marketProRoadmapItem"><small>'+status+'</small><h3>'+title+'</h3><p>'+desc+'</p></article>').join('')+'</div><p class="marketProNote">المنصة حالياً لإدارة العروض والتفاوض والفرص؛ لا تتضمن دفعاً إلكترونياً أو أوامر شحن أو توثيقاً تلقائياً للموردين.</p></section></section>';
 await Promise.all([marketProLoadCatalog(),marketProLoadRfqs(),marketProLoadWorkspace()]);
}
async function marketProLoadCatalog(){
 const box=document.getElementById('marketProCatalog'),storesBox=document.getElementById('marketProStoreGrid');if(!box||!storesBox)return;
 try{
  const q=encodeURIComponent(document.getElementById('marketProQuery')?.value.trim()||'');
  const type=encodeURIComponent(document.getElementById('marketProType')?.value||'');
  const category=document.getElementById('marketProCategory')?.value||'';
  const [offers,stores]=await Promise.all([api('market/listings?q='+q+'&type='+type),api('market/stores')]);
  const all=offers.listings.filter(l=>!category||l.category===category);
  document.getElementById('mpStatStores').textContent=stores.stores.length;
  document.getElementById('mpStatListings').textContent=offers.listings.length;
  box.innerHTML=all.length?'<div class="marketProCardGrid">'+all.map(l=>'<article class="marketProProduct">'+(l.image_url?'<div class="marketProProductImage"><img src="'+esc(l.image_url)+'" alt="'+esc(l.title)+'" loading="lazy" referrerpolicy="no-referrer"></div>':'<div class="marketProProductImage placeholder">▣</div>')+'<div class="marketProProductBody"><div class="marketProMeta"><span>'+esc(l.type==='service'?'خدمة':'منتج')+'</span><span>'+esc(l.category||'عام')+'</span></div><h3>'+esc(l.title)+'</h3><p>'+esc(l.description)+'</p><strong>'+esc(marketProPrice(l.price_minor))+'</strong><small>بواسطة '+esc(l.store_name)+'</small>'+(l.stock_qty!==null&&l.type==='product'?'<small>المخزون المعلن: '+Number(l.stock_qty)+'</small>':'')+(user?'<button type="button" class="marketProButton secondary" data-act="mp-request" data-listing-id="'+l.id+'" data-title="'+esc(l.title)+'">طلب عرض سعر</button>':'<button type="button" class="marketProButton secondary" data-act="login">سجّل الدخول لطلب السعر</button>')+'</div></article>').join('')+'</div>':marketProPending;
  marketProStores=stores.stores;
  storesBox.innerHTML=stores.stores.length?stores.stores.map(s=>'<article class="marketProStore"><div class="marketProAvatar">'+esc(s.name.slice(0,1))+'</div><h3>'+esc(s.name)+'</h3><span>'+esc(marketKindLabels[s.kind]||s.kind)+'</span><p>'+esc(s.description)+'</p><small>'+Number(s.listings)+' عروض منشورة</small></article>').join(''):marketProPending;
 }catch(e){box.textContent=e.message;storesBox.textContent='تعذر تحميل المساحات.';}
}
async function marketProLoadRfqs(){
 const box=document.getElementById('marketProRfqList');if(!box)return;
 try{const r=await api('market/rfqs');document.getElementById('mpStatRfqs').textContent=r.rfqs.length;box.innerHTML=r.rfqs.length?r.rfqs.map(v=>'<article class="marketProRfq"><span>فرصة توريد · '+esc(v.category)+'</span><h3>'+esc(v.title)+'</h3><p>'+esc(v.description)+'</p><small>الجهة: '+esc(v.buyer_name)+(v.deadline?' · آخر موعد '+esc(v.deadline):'')+(v.quantity?' · الكمية '+Number(v.quantity):'')+'</small>'+(user?'<button class="marketProButton secondary" type="button" data-act="mp-bid" data-rfq-id="'+v.id+'" data-title="'+esc(v.title)+'">تقديم عرض</button>':'')+'</article>').join(''):marketProPending;}catch(e){box.textContent=e.message;}
}
async function marketProLoadWorkspace(){
 const box=document.getElementById('marketProDashboard');if(!box||!user)return;
 try{
  const [mine,listing,stats,received,sent,bids,receivedBids]=await Promise.all([
    api('market/my-stores'),api('market/my-listings'),api('market/dashboard'),api('market/inquiries?mode=received'),
    api('market/inquiries?mode=sent'),api('market/rfq-bids?mode=mine'),api('market/rfq-bids?mode=received')
  ]);
  const approved=mine.stores.filter(s=>s.status==='approved');
  box.innerHTML='<div class="marketProDashboardStats">'+[
   ['مساحاتي',stats.stats.stores],['عروضي',stats.stats.listings],['طلبات واردة',stats.stats.received_inquiries],
   ['طلبات مرسلة',stats.stats.sent_inquiries],['منافساتي',stats.stats.rfqs],['عروضي للمنافسات',stats.stats.bids]
  ].map(([k,v])=>'<article><span>'+k+'</span><strong>'+Number(v)+'</strong></article>').join('')+'</div>'+
  '<div class="marketProTwo"><div class="marketProPane"><h3>مساحاتي التجارية</h3>'+(mine.stores.map(s=>'<div class="marketProMini"><strong>'+esc(s.name)+'</strong><span>'+esc({approved:'معتمدة',pending:'بانتظار الاعتماد',rejected:'مرفوضة',suspended:'معلقة'}[s.status])+'</span></div>').join('')||'<p>ليس لديك مساحة بعد.</p>')+'<form id="marketStoreForm" class="marketProForm"><h4>طلب مساحة جديدة</h4><label>اسم المساحة<input name="name" minlength="3" maxlength="100" required></label><label>نوع النشاط<select name="kind"><option value="producer">منتج</option><option value="manufacturer">مصنّع</option><option value="distributor">موزّع</option><option value="service_provider">مقدم خدمات</option></select></label><label>التعريف التجاري<textarea name="description" maxlength="1000"></textarea></label><button class="marketProButton main">إرسال الطلب</button><div class="error"></div></form></div>'+
  '<div class="marketProPane"><h3>إضافة منتج أو خدمة</h3>'+(approved.length?'<form class="marketListingForm marketProForm" data-store-id="'+approved[0].id+'"><label>المساحة التجارية<select name="market_store_choice" data-act="noop">'+approved.map(s=>'<option value="'+s.id+'">'+esc(s.name)+'</option>').join('')+'</select></label><label>اسم العرض<input name="title" minlength="3" maxlength="160" required></label><label>التفاصيل<textarea name="description" maxlength="2000"></textarea></label><label>النوع<select name="type"><option value="product">منتج</option><option value="service">خدمة</option></select></label><label>السعر بالريال (اختياري)<input name="price_sar" type="number" min="0" step="0.01"></label><button class="marketProButton main">إضافة العرض</button><div class="error"></div></form>':'<p>يمكن إضافة العروض بعد اعتماد مساحتك التجارية.</p>')+'</div></div>'+
  '<div class="marketProPane"><h3>كتالوجي ومخزوني</h3>'+(listing.listings.length?'<div class="marketProLineList">'+listing.listings.map(l=>'<div class="marketProLine"><div><strong>'+esc(l.title)+'</strong><small>'+esc(l.store_name)+' · '+esc(l.category||'عام')+' · '+esc(marketProPrice(l.price_minor))+'</small></div><button type="button" class="btn" data-act="mp-edit" data-listing-id="'+l.id+'" data-title="'+esc(l.title)+'" data-category="'+esc(l.category||'عام')+'" data-sku="'+esc(l.sku||'')+'" data-stock="'+(l.stock_qty===null?'':Number(l.stock_qty))+'" data-min="'+Number(l.min_order_qty||1)+'" data-image="'+esc(l.image_url||'')+'">بيانات المنتج والمخزون</button></div>').join('')+'</div>':marketProPending)+'</div>'+
  '<div class="marketProTwo"><div class="marketProPane"><h3>طلبات الأسعار الواردة</h3>'+marketProInquiries(received.inquiries,true)+'</div><div class="marketProPane"><h3>طلباتي المرسلة</h3>'+marketProInquiries(sent.inquiries,false)+'</div></div>'+
  '<div class="marketProTwo"><div class="marketProPane"><h3>عروضي للمنافسات</h3>'+marketProBids(bids.bids,false)+'</div><div class="marketProPane"><h3>عروض المنافسات الواردة</h3>'+marketProBids(receivedBids.bids,true)+'</div></div>';
 }catch(e){box.textContent=e.message;}
}
function marketProInquiries(items,received){
 return items.length?items.map(r=>'<article class="marketProMini"><strong>'+esc(r.listing_title)+'</strong><p>'+esc(r.message||'لا توجد ملاحظات')+'</p><small>الكمية '+Number(r.quantity)+' · '+esc(marketProStatus[r.status]||r.status)+' · '+(received?'طالب العرض: '+esc(r.buyer_name):'المورد: '+esc(r.seller_name))+'</small>'+(r.amount_minor!==null?'<p>السعر المقترح: '+esc(marketProPrice(r.amount_minor))+' · '+esc(r.quotation_notes||'')+'</p>':'')+(received&&['new','quoted'].includes(r.status)?'<button type="button" class="btn" data-act="mp-quote" data-inquiry-id="'+r.id+'">إرسال / تعديل عرض السعر</button>':'')+(!received&&r.status==='quoted'?'<div class="marketProActionGroup"><button type="button" class="btn" data-act="mp-decision" data-inquiry-id="'+r.id+'" data-status="accepted">قبول مبدئي</button><button type="button" class="btn" data-act="mp-decision" data-inquiry-id="'+r.id+'" data-status="declined">رفض</button></div>':'')+'</article>').join(''):marketProPending;
}
function marketProBids(items,received){
 return items.length?items.map(b=>'<article class="marketProMini"><strong>'+esc(b.rfq_title)+'</strong><p>'+esc(b.store_name)+' · '+esc(marketProPrice(b.amount_minor))+'</p><small>'+esc(marketProStatus[b.status]||b.status)+'</small>'+(received&&b.status==='submitted'?'<button type="button" class="btn" data-act="mp-select-bid" data-bid-id="'+b.id+'">اختيار العرض وإغلاق المنافسة</button>':'')+'</article>').join(''):marketProPending;
}
async function marketProForm(form,data){
 try{
  if(form.id==='marketStoreForm'&&document.querySelector('.marketPro')){
   await api('market/stores','POST',data);
   notify('أُرسل طلب المساحة للإدارة.');
   await marketProLoadWorkspace();return true;
  }
  if(form.classList.contains('marketListingForm')&&document.querySelector('.marketPro')){
   const storeId=Number(data.market_store_choice||form.dataset.storeId);
   if(!Number.isSafeInteger(storeId)||storeId<=0)throw new Error('اختر مساحة صحيحة.');
   const price=data.price_sar===''||data.price_sar===undefined?null:Math.round(Number(data.price_sar)*100);
   if(price!==null&&(!Number.isSafeInteger(price)||price<0))throw new Error('السعر غير صحيح.');
   await api('market/stores/'+storeId+'/listings','POST',{title:data.title,description:data.description,type:data.type,price_minor:price});
   notify('أُضيف العرض إلى المساحة التجارية.');
   await marketProLoadWorkspace();await marketProLoadCatalog();return true;
  }
  if(form.id==='marketProSearch'){await marketProLoadCatalog();return true;}
  if(form.id==='marketProRfqForm'){await api('market/rfqs','POST',data);notify('نُشرت المنافسة.');form.reset();await marketProLoadRfqs();await marketProLoadWorkspace();return true;}
  if(form.id==='marketProRequestForm'){await api('market/inquiries','POST',data);dialog.close();notify('تم إرسال طلب السعر.');await marketProLoadWorkspace();return true;}
  if(form.id==='marketProQuoteForm'){await api('market/inquiries/'+Number(data.inquiry_id)+'/quote','POST',{amount_minor:Math.round(Number(data.amount_sar)*100),notes:data.notes});dialog.close();notify('أُرسل عرض السعر.');await marketProLoadWorkspace();return true;}
  if(form.id==='marketProBidForm'){await api('market/rfqs/'+Number(data.rfq_id)+'/bids','POST',{store_id:Number(data.store_id),amount_minor:Math.round(Number(data.amount_sar)*100),notes:data.notes});dialog.close();notify('تم تقديم العرض.');await marketProLoadWorkspace();return true;}
  if(form.id==='marketProEditForm'){await api('market/listings/'+Number(data.listing_id),'PATCH',data);dialog.close();notify('حُفظت بيانات العرض.');await marketProLoadWorkspace();await marketProLoadCatalog();return true;}
 }catch(e){const error=form.querySelector('.error');if(error)error.textContent=e.message;else notify(e.message);return true;}
 return false;
}
async function marketProAction(action,el){
 if(!action?.startsWith('mp-'))return false;
 try{
  const name=esc(el.dataset.title||'العرض');
  if(action==='mp-request'){if(!user){auth('login');return true;}showModal('طلب عرض سعر — '+name,'<p>هذا طلب تسعير، وليس عملية شراء أو دفع.</p><form id="marketProRequestForm" class="fields"><input name="listing_id" type="hidden" value="'+Number(el.dataset.listingId)+'"><label>الكمية<input name="quantity" type="number" min="1" required value="1"></label><label>ملاحظات الطلب<textarea name="message" maxlength="1000"></textarea></label><div class="error"></div><button class="btn primary">إرسال للبائع</button></form>');return true;}
  if(action==='mp-quote'){showModal('تسعير طلب العميل','<form id="marketProQuoteForm" class="fields"><input type="hidden" name="inquiry_id" value="'+Number(el.dataset.inquiryId)+'"><label>إجمالي عرض السعر (ريال)<input name="amount_sar" type="number" min="0" step="0.01" required></label><label>شروط وملاحظات<textarea name="notes" maxlength="1500"></textarea></label><div class="error"></div><button class="btn primary">إرسال عرض السعر</button></form>');return true;}
  if(action==='mp-bid'){if(!user){auth('login');return true;}const r=await api('market/my-stores');const stores=r.stores.filter(s=>s.status==='approved');if(!stores.length){notify('تحتاج إلى مساحة تجارية معتمدة لتقديم عرض.');return true;}showModal('تقديم عرض — '+name,'<form id="marketProBidForm" class="fields"><input name="rfq_id" type="hidden" value="'+Number(el.dataset.rfqId)+'"><label>المساحة التجارية<select name="store_id">'+stores.map(s=>'<option value="'+s.id+'">'+esc(s.name)+'</option>').join('')+'</select></label><label>إجمالي القيمة بالريال<input name="amount_sar" type="number" min="0" step="0.01" required></label><label>المواصفات والشروط<textarea name="notes" maxlength="1200"></textarea></label><div class="error"></div><button class="btn primary">تقديم العرض</button></form>');return true;}
  if(action==='mp-edit'){showModal('تفاصيل العرض — '+name,'<form id="marketProEditForm" class="fields"><input type="hidden" name="listing_id" value="'+Number(el.dataset.listingId)+'"><label>التصنيف<select name="category">'+marketProCategoryOptions(el.dataset.category)+'</select></label><label>رابط صورة HTTPS<input name="image_url" type="url" maxlength="500" value="'+esc(el.dataset.image||'')+'"></label><label>رمز المنتج SKU<input name="sku" maxlength="80" value="'+esc(el.dataset.sku||'')+'"></label><label>المخزون (اتركه فارغاً إذا لم يكن محدداً)<input name="stock_qty" type="number" min="0" value="'+esc(el.dataset.stock||'')+'"></label><label>الحد الأدنى للطلب<input name="min_order_qty" type="number" min="1" required value="'+Number(el.dataset.min||1)+'"></label><div class="error"></div><button class="btn primary">حفظ البيانات</button></form>');return true;}
  if(action==='mp-decision'){if(!confirm('هل تريد تسجيل هذا القرار؟ لا يُعد قبولاً لعقد أو دفع.'))return true;await api('market/inquiries/'+Number(el.dataset.inquiryId)+'/decision','PATCH',{status:el.dataset.status});notify('تم تسجيل القرار.');await marketProLoadWorkspace();return true;}
  if(action==='mp-select-bid'){if(!confirm('اختيار هذا العرض يغلق المنافسة، لكنه لا ينشئ عقداً أو دفعة. متابعة؟'))return true;await api('market/rfq-bids/'+Number(el.dataset.bidId)+'/select','PATCH',{});notify('تم اختيار العرض.');await marketProLoadWorkspace();await marketProLoadRfqs();return true;}
 }catch(e){notify(e.message);}return true;
}

'use strict';
// Demonstration catalogue is intentionally isolated from real vendor inventory.
// All demo details, prices and artwork are illustrative; no checkout can be initiated.
const tnDemoCatalog=[
 {id:'solar-kit',title:'حزمة طاقة شمسية منزلية',type:'product',category:'الطاقة والبيئة',price:4850,image_url:'https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=1600&q=88',tone:'sun',summary:'حل طاقة احتياطي للمواقع الصغيرة والمنازل الريفية.',marketing:'حل متكامل لتوليد الكهرباء النظيفة وتوفير مصدر طاقة موثوق للمنازل والمرافق.',spec:'ألواح 2×450 واط، عاكس 2 كيلوواط، بطارية تخزين اختيارية. التركيب والفحص والتوصيل تُسعّر منفصلة.',delivery:'التوريد خلال مدة يتفق عليها المورد والمشتري؛ السعر تقديري.'},
 {id:'water-kit',title:'مجموعة ترشيد المياه',type:'product',category:'الطاقة والبيئة',price:390,image_url:'https://images.unsplash.com/photo-1530053969600-caed2596d242?auto=format&fit=crop&w=1600&q=88',tone:'aqua',summary:'ملحقات لتقليل الهدر في المباني والمرافق.',marketing:'اختيار عملي لمبادرات كفاءة استهلاك المياه، مناسب للتركيبات المنزلية والمؤسسية.',spec:'6 مرشدات تدفق، قطعتا تحكم، دليل تركيب وتوصيات صيانة.',delivery:'تُحدد القيمة النهائية وفق الكمية ومواصفات التوريد.'},
 {id:'school-box',title:'حقيبة أدوات مدرسية متكاملة',type:'product',category:'التعليم والمعرفة',price:145,image_url:'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1600&q=88',tone:'violet',summary:'محتويات تعليمية متعددة للطلاب والمبادرات المدرسية.',marketing:'حقيبة مقترحة للمدارس والبرامج المجتمعية مع إمكانية التخصيص بالهوية البصرية.',spec:'دفاتر وأقلام ومسطرة وحافظة ومواد تنظيمية. إمكانية توفير كميات للمؤسسات.',delivery:'السعر تقديري للحقيبة الواحدة قبل التخصيص والشحن.'},
 {id:'learning-tablet',title:'جهاز لوحي تعليمي',type:'product',category:'التعليم والمعرفة',price:790,image_url:'https://images.unsplash.com/photo-1589739900243-4b52cd9dd8df?auto=format&fit=crop&w=1600&q=88',tone:'blue',summary:'جهاز مخصص لدعم التعلم الرقمي والوصول إلى الموارد التعليمية.',marketing:'وسيلة لتسهيل وصول الطلاب إلى الموارد والمنصات التعليمية ضمن مشاريع التحول الرقمي.',spec:'شاشة 10 بوصات، تخزين 64 جيجابايت، غلاف حماية، إعداد تعليمي اختياري.',delivery:'تُحدد المواصفات والسعر وفق الطراز والكمية المطلوبة.'},
 {id:'farm-seed',title:'حزمة بذور للزراعة المجتمعية',type:'product',category:'الزراعة والتنمية',price:220,image_url:'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=1600&q=88',tone:'green',summary:'مجموعة بذور مختارة لمبادرات الزراعة والحدائق المجتمعية.',marketing:'خطوة تطبيقية في المبادرات الزراعية التعليمية والمساحات الخضراء.',spec:'بذور متنوعة، مواد إنبات، بطاقات متابعة، إرشادات أولية.',delivery:'تتغير الأصناف والتكلفة بحسب البلد والموسم.'},
 {id:'recycle-box',title:'محطة فرز نفايات صغيرة',type:'product',category:'الطاقة والبيئة',price:1120,image_url:'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=1600&q=88',tone:'teal',summary:'حاويات فرز للاستخدام المدرسي والمؤسسي.',marketing:'حل عملي لتعزيز ثقافة الفرز وتقليل المخلفات في المرافق.',spec:'3 حاويات ملوّنة، إرشادات استخدام، ملصقات اختيارية.',delivery:'قيمة تقديرية للتوريد، ولا تشمل النقل.'},
 {id:'school-lab',title:'مشروع مختبر ابتكار مدرسي',type:'project',category:'المشاريع',price:68000,image_url:'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1600&q=88',tone:'indigo',summary:'تجهيز بيئة تعليمية محفزة للابتكار والتصميم والتطبيق.',marketing:'مشروع تنموي يجمع التجهيز الفني والتدريب ومؤشرات الاستخدام ويُنفذ على مراحل.',spec:'تصميم مساحة 40 م²، 8 محطات عمل، أدوات نمذجة، تدريب معلمين، خطة تشغيل مؤشرات.',delivery:'تُحدد الميزانية بعد دراسة الموقع والمتطلبات الفنية.'},
 {id:'water-project',title:'مشروع محطات مياه مجتمعية',type:'project',category:'المشاريع',price:185000,image_url:'https://images.unsplash.com/photo-1541919329513-35f7af297129?auto=format&fit=crop&w=1600&q=88',tone:'aqua',summary:'مشروع بنية أساسية لتوفير مياه آمنة ومستدامة للمجتمعات.',marketing:'فرصة متكاملة لربط الحل الهندسي بالتشغيل والصيانة وقياس الاستفادة المجتمعية.',spec:'دراسة احتياج، تصميم أولي، محطة معالجة صغيرة، تدريب تشغيل، متابعة 6 أشهر.',delivery:'تُحدد التكلفة النهائية وفق الموقع ونتائج التحاليل.'},
 {id:'urban-garden',title:'مشروع حديقة حضرية',type:'project',category:'المشاريع',price:45000,image_url:'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=1600&q=88',tone:'green',summary:'تصور حديقة مجتمعية قابلة للتطوير.',marketing:'مساحة خضراء ذات قيمة اجتماعية وبيئية تدعم المشاركة والعمل التطوعي.',spec:'تصميم 250 م²، تجهيز تربة وزراعة وري، خطة إدارة ومشاركة مجتمعية.',delivery:'تختلف القيمة وفق الأرض والمواد وطبيعة الموقع.'},
 {id:'strategy-service',title:'إعداد خطة استراتيجية مؤسسية',type:'service',category:'الاستشارات والتدريب',price:12500,image_url:'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1600&q=88',tone:'indigo',summary:'صياغة أولويات وخطة تنفيذ ومؤشرات قياس.',marketing:'خدمة استشارية تدعم المؤسسات في مواءمة الأهداف والقدرات والنتائج.',spec:'تشخيص أولي، 3 جلسات عمل، خطة تنفيذية، مصفوفة مؤشرات، ورشة تسليم.',delivery:'تُحدد التكلفة وفق حجم المؤسسة ونطاق العمل.'},
 {id:'ai-training',title:'برنامج أدوات AI للبحث العلمي',type:'service',category:'الاستشارات والتدريب',price:3800,image_url:'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1600&q=88',tone:'violet',summary:'تدريب متخصص للباحثين وفرق التطوير.',marketing:'برنامج عملي يوظف أدوات الذكاء الاصطناعي في البحث والتحقق العلمي.',spec:'12 ساعة تدريبية، أنشطة تطبيقية، دليل استخدام، مشروع ختامي.',delivery:'تُحدد التكلفة وفق عدد المشاركين ونطاق البرنامج.'},
 {id:'brand-service',title:'تصميم هوية مشروع تنموي',type:'service',category:'التصميم والإبداع',price:5900,image_url:'https://images.unsplash.com/photo-1545235617-9465d2a55698?auto=format&fit=crop&w=1600&q=88',tone:'rose',summary:'هوية بصرية متناسقة للتواصل مع الجمهور.',marketing:'حزمة تصميم تساعد المبادرات على تقديم رسالة واضحة وثابتة عبر الوسائط.',spec:'شعار رئيسي وبدائل، لوحة ألوان، نماذج منشورات، دليل استخدام مختصر.',delivery:'السعر تصوري، يعتمد النهائي على عدد التطبيقات والجولات.'}
];
const tnDemoPrice=x=>(Number(x)||0).toLocaleString('ar-SA',{style:'currency',currency:'SAR',maximumFractionDigits:0});
const tnMarketIllustration=x=>'<div class="tmProductArt"><img src="'+esc(x.image_url||tnCategoryImage(x.category))+'" loading="lazy" alt="'+esc(x.title)+'"></div>';
const tnCategoryImage=category=>({ 'الطاقة والبيئة':'https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=1600&q=88','التعليم والمعرفة':'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1600&q=88','الزراعة والتنمية':'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=1600&q=88','المشاريع':'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1600&q=88','الاستشارات والتدريب':'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1600&q=88','التصميم والإبداع':'https://images.unsplash.com/photo-1545235617-9465d2a55698?auto=format&fit=crop&w=1600&q=88' }[category]||'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=88');
const tnRealImg=x=>'<div class="tmProductArt"><img src="'+esc(x.image_url||tnCategoryImage(x.category))+'" loading="lazy" alt="'+esc(x.title)+'"></div>';
const tnStars=(n,count)=>'<span class="tmStars" aria-label="'+(count?Number(n).toFixed(1)+' من 5':'لم يُقيّم بعد')+'">'+(count?'★'.repeat(Math.round(Number(n)))+'☆'.repeat(5-Math.round(Number(n))):'☆☆☆☆☆')+'</span><small>'+(count?Number(n).toFixed(1)+' · '+Number(count)+' تقييم':'لا توجد تقييمات')+'</small>';
const tnTag=x=>x.type==='project'||x.category==='المشاريع'?'مشروع':x.type==='service'?'خدمة':'منتج';
const tnCard=(x,demo=false)=>'<article class="tmCard">'+(demo?tnMarketIllustration(x):tnRealImg(x))+
 '<div class="tmCardBody"><div class="tmMeta"><span>'+esc(tnTag(x))+'</span>'+'<span>'+esc(x.category||'عام')+'</span>'+'</div>'+
 '<h3><a href="/market/item/'+(demo?'demo-'+x.id:Number(x.id))+'">'+esc(x.title)+'</a></h3><p>'+esc(x.summary||x.description||'')+'</p>'+
 (demo?'':'<div class="tmStarsRow">'+tnStars(x.avg_stars,x.reviews_count)+'</div>')+
 '<div class="tmPriceRow"><strong>'+(demo?tnDemoPrice(x.price):x.price_minor===null?'السعر عند الطلب':tnDemoPrice(x.price_minor/100))+'</strong>'+
 (demo?'<span class="tmDemoPill">سعر تقديري</span>':'<button type="button" class="tmFavorite" data-act="tm-favorite" data-id="'+x.id+'" aria-label="إضافة إلى المفضلة">♡</button>')+'</div>'+
 '<a class="tmCardAction" href="/market/item/'+(demo?'demo-'+x.id:Number(x.id))+'">عرض التفاصيل</a>'+(demo?'':'<button type="button" class="tmCardAction tmCardCart" data-act="tm-add-cart" data-id="'+x.id+'">＋ أضف للسلة</button>')+'</div></article>';
async function renderMarketV3(){
 document.title='سوق تنميات | مجتمع تنميات';
 main.innerHTML='<section class="tmMarket"><div class="tmHero tmHeroCinematic"><img class="tmHeroBackground" src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=2400&q=92" alt="مشهد عمراني حديث يعكس التنمية والاقتصاد" fetchpriority="high"><div class="tmHeroContent"><span class="tmEyebrow">TNMYAT MARKET · مجتمع تنميات</span><h1>سوق تنميات</h1><h2>مساحة للتنمية والتجارة والفرص</h2><p>منصة تجمع المنتجات والخدمات والمبادرات والمشروعات التنموية في بيئة رقمية واحدة.</p><div class="tmHeroActions"><a href="#tmProducts" class="tmBtn tmBtnLight">تصفح السوق</a><a href="#tmCreate" class="tmBtn tmBtnGhost">افتح متجرك التنموي</a></div></div><div class="tmHeroSignature"><strong>تنميات</strong><span>تنمية · تجارة · تحول رقمي</span></div></div>'+
 '<div class="tmBenefits"><span>متاجر الأعضاء</span><span>تقييمات وتفضيلات</span><span>مشاريع وخدمات</span><span>تفاصيل وأسعار</span></div>'+
 '<div class="tmSectionHeader" id="tmProducts"><div><small>المنتجات والخدمات والمشاريع</small><h2>اكتشف فرص السوق</h2></div><div class="tmToolbar"><button class="tmBtn tmBtnOutline" data-act="tm-cart">▣ سلة مشترياتي</button><button class="tmBtn tmBtnOutline" data-act="tm-my-favorites">♡ تفضيلاتي</button></div></div>'+
 '<form id="tmSearchForm" class="tmSearch"><label>ابحث<input type="search" name="q" placeholder="منتج، خدمة، مشروع، مؤسسة…"></label><label>النوع<select name="type"><option value="">الكل</option><option value="product">المنتجات</option><option value="service">الخدمات</option><option value="project">المشاريع</option></select></label><label>الترتيب<select name="sort"><option value="newest">الأحدث</option><option value="price-asc">الأقل سعراً</option><option value="price-desc">الأعلى سعراً</option><option value="rated">الأعلى تقييماً</option></select></label><button class="tmBtn tmBtnDark">بحث</button></form>'+
 '<div class="tmSectionHeader"><div><small>عروض فعلية يضيفها الأعضاء</small><h2>منتجات المجتمع</h2></div></div><div id="tmActualProducts" class="tmGrid">جارٍ تحميل العروض…</div>'+
 '<div class="tmSectionHeader"><div><small>كتالوج المنتجات والخدمات والمشاريع</small><h2>مجالات وفرص تنموية</h2></div></div>'+
 '<div id="tmDemoProducts" class="tmGrid">'+tnDemoCatalog.map(x=>tnCard(x,true)).join('')+'</div>'+
 '<div class="tmSectionHeader"><div><small>علامات تنموية مستقلة</small><h2>المتاجر التجارية</h2></div></div><div id="tmStoreCards" class="tmStoreGrid">جارٍ تحميل المتاجر…</div>'+
 '<section class="tmCreateBlock" id="tmCreate"><div><span>متجرك تحت مظلة تنميات</span><h2>ابدأ متجرك التنموي</h2><p>كتالوج ومنتجات، لوحة إدارة محمية بكلمة مرور مستقلة، نطاق فرعي محجوز، تفضيلات وتقييمات وطلبات شراء مبدئية، ومساعدة ذكية ضمن أدوات المتجر.</p><p class="tmCaution">تُستكمل عمليات الربط التشغيلي بعد الانتهاء من اختبار النموذج الأولي لسوق تنميات.</p></div><button type="button" data-act="tm-onboard" class="tmBtn tmBtnLight">إنشاء متجر</button><button type="button" data-act="tm-my-stores" class="tmBtn tmBtnGhost">إدارة متاجري</button></section></section>';
 await tnLoadMarketCatalog();
}
async function tnLoadMarketCatalog(filters={}){
 const products=document.getElementById('tmActualProducts'),stores=document.getElementById('tmStoreCards');
 if(!products||!stores)return;
 try{
  const params=new URLSearchParams();for(const [k,v] of Object.entries(filters))if(v)params.set(k,v);
  const [p,s]=await Promise.all([api('market/catalog'+(params.size?'?'+params:'')),api('market/stores')]);
  products.innerHTML=p.listings.length?p.listings.map(x=>tnCard(x)).join(''):'<div class="tmEmpty">تُعرض هنا المنتجات والخدمات التي يضيفها أعضاء المجتمع.</div>';
  stores.innerHTML=s.stores.length?s.stores.map(x=>'<article class="tmStore"><div class="tmStoreMonogram">'+esc(x.name.slice(0,1))+'</div><strong>'+esc(x.name)+'</strong><small>'+esc(x.description||'متجر ضمن مجتمع تنميات')+'</small><span>'+Number(x.listings)+' عرض منشور</span>'+(x.slug?'<a href="/shop/'+esc(x.slug)+'">زيارة المتجر</a>':'')+'</article>').join(''):'<div class="tmEmpty">ستظهر المتاجر المعتمدة هنا.</div>';
 }catch(e){products.textContent=e.message;stores.textContent='تعذر تحميل المتاجر.';}
}
async function renderMarketProduct(id){
 const isDemo=String(id).startsWith('demo-');let item,reviews=[],isFav=false;
 if(isDemo){item=tnDemoCatalog.find(x=>x.id===String(id).slice(5));if(!item){main.textContent='النموذج غير موجود.';return;}}
 else {const res=await api('market/item/'+Number(id));item=res.item;reviews=res.reviews;isFav=res.is_favorite;}
 document.title=item.title+' | سوق تنميات';
 const demo=isDemo;
 const image=demo?tnMarketIllustration(item):tnRealImg(item);
 let gallery=[];
 if(!demo){try{gallery=JSON.parse(item.gallery_json||'[]');if(!Array.isArray(gallery))gallery=[];}catch{}}
 const thumbs=gallery.length?'<div class="tmGallery">'+gallery.filter(x=>typeof x==='string'&&x.startsWith('https://')).slice(0,6).map(x=>'<button type="button" data-act="tm-view-photo" data-src="'+esc(x)+'"><img src="'+esc(x)+'" alt="صورة إضافية" loading="lazy"></button>').join('')+'</div>':'';

 const cost=demo?tnDemoPrice(item.price):item.price_minor===null?'السعر عند الطلب':tnDemoPrice(item.price_minor/100);
 main.innerHTML='<section class="tmMarket tmDetail"><nav class="tmBreadcrumb"><a href="/market">سوق تنميات</a> / '+esc(tnTag(item))+' / '+esc(item.title)+'</nav>'+
 '<div class="tmProductDetail"><div class="tmDetailArt">'+image+thumbs+'</div><div class="tmDetailText"><span class="tmDemoPill">'+(demo?'كتالوج تنموي':'عرض متجر عضو')+'</span><h1>'+esc(item.title)+'</h1><div class="tmStarsRow">'+(demo?'':tnStars(item.avg_stars,item.reviews_count))+'</div>'+
 '<p class="tmDetailLead">'+esc(item.marketing||item.marketing_text||item.description||'')+'</p><strong class="tmDetailPrice">'+cost+'</strong><p>'+esc(item.delivery||'يتم تأكيد التسليم والمواصفات عبر البائع قبل أي تعاقد.')+'</p>'+
 '<div class="tmProductActions">'+(demo?'<span class="tmDemoInfo">للاستفسار عن المواصفات والتوريد، يُحدد النطاق مع الجهة المقدمة.</span>':
 '<label>الكمية<input id="tmQuantity" type="number" min="'+Number(item.min_order_qty||1)+'" value="'+Number(item.min_order_qty||1)+'"></label><button type="button" data-act="tm-add-cart" data-id="'+item.id+'" class="tmBtn tmBtnDark">＋ أضف للسلة</button><button type="button" data-act="tm-order" data-id="'+item.id+'" class="tmBtn tmBtnOutline">طلب مباشر</button><button type="button" data-act="tm-favorite" data-id="'+item.id+'" class="tmBtn tmBtnOutline">'+(isFav?'♥ محفوظ':'♡ المفضلة')+'</button>')+
 '</div>'+(!demo&&item.store_slug?'<a href="/shop/'+esc(item.store_slug)+'" class="tmVendor">زيارة متجر '+esc(item.store_name)+'</a>':'')+'</div></div>'+
 '<div class="tmDetailSections"><article><h2>نبذة تسويقية</h2><p>'+esc(item.marketing||item.marketing_text||item.description||'وصف البائع')+'</p></article><article><h2>المواصفات والتفاصيل</h2><p>'+esc(item.spec||item.specifications||item.description||'لا توجد مواصفات إضافية')+'</p></article><article><h2>التوريد والشراء</h2><p>'+esc(item.delivery||'طلب الشراء هنا طلب مبدئي يُرسل للبائع. لا يتم تحصيل أي مبلغ، ولا يُنشأ عقد أو شحن آلي.')+'</p></article></div>'+
 '<section class="tmReviews"><h2>تقييمات الأعضاء</h2>'+(demo?'<p>تُضاف التقييمات بعد إتاحة البيع والتعاملات عبر المتجر.</p>':reviews.map(r=>'<div class="tmReview"><div><strong>'+esc(r.author)+'</strong><span class="tmStars">'+('★'.repeat(Number(r.stars)))+'</span></div><p>'+esc(r.comment||'تقييم بلا تعليق')+'</p></div>').join('')+'<form id="tmReviewForm" class="tmForm" data-id="'+item.id+'"><label>تقييمك<select name="stars">'+[5,4,3,2,1].map(n=>'<option value="'+n+'">'+n+' نجوم</option>').join('')+'</select></label><label>رأيك<textarea name="comment" maxlength="1200" placeholder="اكتب ملاحظاتك عن المنتج"></textarea></label><button class="tmBtn tmBtnDark">حفظ التقييم</button><div class="error"></div><small>التقييم يعكس رأي العضو، وليس إثباتاً تلقائياً لعملية شراء.</small></form>')+'</section></section>';
}
async function renderMarketShop(slug){
 const r=await api('market/shop/'+encodeURIComponent(slug)),s=r.store;
 document.title=s.name+' | سوق تنميات';
 main.innerHTML='<section class="tmMarket tmShop"><div class="tmShopHero" style="--tm-theme:'+esc(s.theme_color||'#183e60')+'"><div><small>متجر تنموي معتمد</small><h1>'+esc(s.name)+'</h1><p>'+esc(s.description||'مرحباً بكم في متجر تنميات')+'</p><span>بإدارة '+esc(s.owner_name)+'</span></div><div class="tmShopLogo">'+(s.logo_url?'<img src="'+esc(s.logo_url)+'" alt="">':'◈')+'</div></div>'+
 '<div class="tmSectionHeader"><div><small>كتالوج المتجر</small><h2>المنتجات والخدمات</h2></div><a href="/market">جميع السوق</a></div><div class="tmGrid">'+(r.listings.length?r.listings.map(x=>tnCard(x)).join(''):'<div class="tmEmpty">لم ينشر المتجر منتجات بعد.</div>')+'</div>'+
 (s.contact_text?'<section class="tmContact"><h2>التواصل مع المتجر</h2><p>'+esc(s.contact_text)+'</p></section>':'')+'</section>';
}
async function renderMarketCart(){
 document.title='سلة مشترياتي | سوق تنميات';
 if(!user){auth('login');return;}
 const res=await api('market/cart'),items=res.items;
 const total=items.reduce((sum,x)=>sum+(x.price_minor===null?0:x.price_minor*x.quantity),0);
 const unknown=items.some(x=>x.price_minor===null);
 main.innerHTML='<section class="tmMarket tmCart"><div class="tmSectionHeader"><div><small>الطلبات والمشتريات</small><h1>سلة مشترياتي</h1></div><a href="/market">← متابعة التسوق</a></div>'+
 (items.length?'<div class="tmCartLayout"><div class="tmCartItems">'+items.map(x=>'<article class="tmCartLine">'+tnRealImg(x)+'<div class="tmCartInfo"><h3><a href="/market/item/'+x.id+'">'+esc(x.title)+'</a></h3><small>المتجر: '+esc(x.store_name)+'</small><strong>'+esc(x.price_minor===null?'السعر يحدد عند الطلب':tnDemoPrice(x.price_minor/100))+'</strong><label>الكمية<input type="number" min="'+Number(x.min_order_qty||1)+'" max="'+(x.stock_qty===null?10000:Number(x.stock_qty))+'" value="'+Number(x.quantity)+'" data-market-qty="'+x.id+'"></label><div class="tmCartButtons"><button data-act="tm-update-cart" data-id="'+x.id+'" class="tmBtn tmBtnOutline">تحديث</button><button data-act="tm-remove-cart" data-id="'+x.id+'" class="tmBtn tmBtnOutline">إزالة</button></div></div></article>').join('')+'</div>'+
 '<aside class="tmCartSummary"><h2>ملخص السلة</h2><p>المنتجات: '+items.length+'</p><strong>الإجمالي التقديري: '+tnDemoPrice(total/100)+'</strong>'+(unknown?'<small>توجد عناصر تتطلب تحديد السعر من البائع.</small>':'')+
 '<p>لا تتضمن الأسعار بالضرورة الشحن أو الضرائب أو التركيب. طلب السلة لا يخصم أي مبلغ.</p><form id="tmCartCheckout" class="tmForm"><label>ملاحظات التوريد والشحن<textarea name="notes" maxlength="1000" placeholder="متطلبات تسليم دون إدخال بيانات حساسة"></textarea></label><button class="tmBtn tmBtnDark">إرسال طلبات السلة</button><div class="error"></div></form></aside></div>':
 '<div class="tmEmpty">سلتك فارغة. <a href="/market">استعرض منتجات السوق</a>.</div>')+'</section>';
}
async function tnMarketV3Onboard(){
 if(!user){auth('login');return;}
 showModal('إنشاء متجر تنموي','<form id="tmOnboard" class="tmForm"><label>اسم المتجر<input name="name" required minlength="3" maxlength="100" placeholder="متجر التنمية"></label><label>عنوان المتجر بالإنجليزية<input name="slug" dir="ltr" required pattern="[a-z][a-z0-9-]{2,39}" placeholder="development-store"></label><p class="tmSlugHint">رابط المعاينة: /shop/development-store — النطاق الفرعي يحتاج تفعيل DNS لاحقاً.</p><label>مجال النشاط<select name="kind"><option value="producer">منتجات</option><option value="manufacturer">تصنيع</option><option value="distributor">توزيع</option><option value="service_provider">خدمات</option></select></label><label>نبذة عن المتجر<textarea name="description" maxlength="1000"></textarea></label><label>كلمة مرور إدارة المتجر<input name="store_password" type="password" autocomplete="new-password" required minlength="12" maxlength="128" placeholder="12 حرفاً مع حروف كبيرة وصغيرة وأرقام"></label><button class="tmBtn tmBtnDark">إرسال طلب إنشاء المتجر</button><div class="error"></div></form>');
}
async function tnMyStores(){
 if(!user){auth('login');return;}
 const res=await api('market/my-stores');
 document.title='إدارة متاجري | سوق تنميات';
 main.innerHTML='<section class="tmMarket tmConsolePage"><div class="tmSectionHeader"><div><small>حساب التاجر</small><h1>متاجري التنموية</h1></div><a href="/market">العودة للسوق</a></div><div class="tmStoreGrid">'+(res.stores.length?res.stores.map(s=>'<article class="tmStore"><strong>'+esc(s.name)+'</strong><small>حالة الاعتماد: '+esc(s.status)+'</small>'+(s.slug?'<a href="/shop/'+esc(s.slug)+'">عرض المتجر</a>':'')+'<button class="tmBtn tmBtnDark" data-act="tm-open-console" data-id="'+s.id+'" data-slug="'+esc(s.slug||'')+'">'+(s.slug?'إدارة المتجر':'تفعيل لوحة المتجر')+'</button></article>').join(''):'<div class="tmEmpty">ليس لديك متاجر. <a href="/market">ابدأ بإنشاء متجر</a></div>')+'</div></section>';
}
async function tnOpenStoreConsole(storeId){
 const r=await api('market/store-console/'+storeId);
 const s=r.store;
 document.title='لوحة '+s.name+' | سوق تنميات';
 main.innerHTML='<section class="tmMarket tmConsolePage"><div class="tmSectionHeader"><div><small>لوحة المتجر المستقلة</small><h1>'+esc(s.name)+'</h1><p>طلبات شراء مبدئية: '+Number(r.requests_count)+'</p></div><a href="/market/stores">كل متاجري</a></div>'+
 '<div class="tmConsoleActions"><a href="/shop/'+esc(s.slug||'')+'" class="tmBtn tmBtnOutline">معاينة المتجر</a><button data-act="tm-create-item" data-id="'+s.id+'" class="tmBtn tmBtnDark">＋ منتج أو مشروع أو خدمة</button><button data-act="tm-store-settings" data-id="'+s.id+'" class="tmBtn tmBtnOutline">إعدادات المتجر</button><button data-act="tm-store-requests" data-id="'+s.id+'" class="tmBtn tmBtnOutline">الطلبات الواردة</button><button data-act="tn-tool" data-service="ai" class="tmBtn tmBtnOutline">✦ مساعد المتجر AI</button></div>'+
 '<p class="tmDomainHint">معاينة متاحة: /shop/'+esc(s.slug||'')+' | النطاق المقترح: '+esc(s.slug||'store')+'.shops.tnmyat.com (لم يتم تفعيله بعد)</p>'+
 '<div class="tmSectionHeader"><h2>الكتالوج الخاص بك</h2></div><div class="tmManageGrid">'+r.listings.map(x=>'<article class="tmManageCard"><strong>'+esc(x.title)+'</strong><small>الحالة: '+esc(x.status)+' | '+esc(x.category||'عام')+'</small><span>'+esc(x.price_minor===null?'يحدد السعر لاحقاً':tnDemoPrice(x.price_minor/100))+'</span><button data-act="tm-edit-item" data-store="'+s.id+'" data-id="'+x.id+'" data-title="'+esc(x.title)+'" data-desc="'+esc(x.description)+'" data-marketing="'+esc(x.marketing_text||'')+'" data-status="'+esc(x.status)+'" data-image="'+esc(x.image_url||'')+'" class="tmBtn tmBtnOutline">تعديل</button></article>').join('')+'</div></section>';
}
async function tnMarketV3Action(action,el){
 if(action==='tm-view-photo'){const img=document.querySelector('.tmDetailArt .tmProductArt img');if(img)img.src=el.dataset.src;return true;}
 if(action==='tm-cart'){await renderMarketCart();return true;}
 if(action==='tm-add-cart'){
  if(!user){auth('login');return true;}
  try{
   const listingId=Number(el.dataset.id),qty=Number(document.querySelector('#tmQuantity')?.value||1);
   await api('market/cart','POST',{listing_id:listingId,quantity:qty});
   notify('أُضيف المنتج إلى السلة.');
  }catch(e){notify(e.message);}return true;
 }
 if(action==='tm-update-cart'){
  try{
   const id=Number(el.dataset.id),quantity=Number(document.querySelector('[data-market-qty="'+id+'"]')?.value||1);
   await api('market/cart','POST',{listing_id:id,quantity});await renderMarketCart();
  }catch(e){notify(e.message);}return true;
 }
 if(action==='tm-remove-cart'){
  try{await api('market/cart/'+Number(el.dataset.id),'DELETE');await renderMarketCart();}catch(e){notify(e.message);}return true;
 }

 if(action==='tm-onboard'){await tnMarketV3Onboard();return true;}
 if(action==='tm-my-stores'){await tnMyStores();return true;}
 if(action==='tm-my-favorites'){
  if(!user){auth('login');return true;}
  const r=await api('market/favorites');
  main.innerHTML='<section class="tmMarket"><div class="tmSectionHeader"><h1>تفضيلاتي</h1><a href="/market">السوق</a></div><div class="tmGrid">'+(r.listings.length?r.listings.map(x=>tnCard(x)).join(''):'<div class="tmEmpty">لا توجد منتجات مفضلة بعد.</div>')+'</div></section>';return true;
 }
 if(action==='tm-favorite'){
  if(!user){auth('login');return true;}
  try{const r=await api('market/favorites/'+Number(el.dataset.id),'POST',{});notify(r.is_favorite?'تمت إضافة المنتج إلى المفضلة.':'أُزيل المنتج من المفضلة.');el.textContent=r.is_favorite?'♥ محفوظ':'♡ المفضلة';}catch(e){notify(e.message);}return true;
 }
 if(action==='tm-order'){
  if(!user){auth('login');return true;}
  const quantity=Number(document.querySelector('#tmQuantity')?.value||1);
  showModal('طلب شراء مبدئي','<p>سيسجل النظام اهتمامك ويرسله للبائع. لا يتضمن دفعاً أو حجزاً مؤكداً للمخزون.</p><form id="tmOrder" data-id="'+Number(el.dataset.id)+'" class="tmForm"><label>الكمية<input name="quantity" type="number" min="1" value="'+quantity+'" required></label><label>ملاحظات للبائع<textarea name="notes" maxlength="1000"></textarea></label><button class="tmBtn tmBtnDark">إرسال الطلب</button><div class="error"></div></form>');return true;
 }
 if(action==='tm-open-console'){
  if(!user){auth('login');return true;}
  const sid=Number(el.dataset.id);
  showModal('دخول إدارة المتجر','<form id="tmStoreLogin" data-id="'+sid+'" class="tmForm"><p>أدخل كلمة المرور المستقلة لإدارة هذا المتجر.</p>'+(el.dataset.slug?'':'<label>عنوان المتجر بالإنجليزية<input name="slug" required minlength="3" maxlength="40" placeholder="my-store"></label>')+'<label>كلمة مرور المتجر<input name="store_password" type="password" required minlength="'+(el.dataset.slug?'1':'12')+'" autocomplete="'+(el.dataset.slug?'current-password':'new-password')+'"></label><button class="tmBtn tmBtnDark">'+(el.dataset.slug?'دخول لوحة المتجر':'تفعيل حماية المتجر')+'</button><div class="error"></div></form>');return true;
 }
 if(action==='tm-create-item'){
  const sid=Number(el.dataset.id);
  showModal('إضافة عرض جديد','<form id="tmNewItem" class="tmForm" data-id="'+sid+'"><label>اسم المنتج أو الخدمة<input name="title" minlength="3" maxlength="160" required></label><label>التصنيف<select name="type"><option value="product">منتج</option><option value="service">خدمة</option><option value="project">مشروع تنموي</option></select></label><label>الفئة<input name="category" maxlength="60" placeholder="التعليم والمعرفة"></label><label>السعر بالريال<input name="price_sar" type="number" min="0" step="0.01"></label><label>المخزون (اختياري)<input name="stock_qty" type="number" min="0"></label><label>الحد الأدنى للطلب<input name="min_order_qty" type="number" min="1" max="10000" value="1"></label><label>رمز الصنف SKU<input name="sku" maxlength="80"></label><label>رابط صورة HTTPS<input name="image_url" type="url"></label><label>صور إضافية HTTPS (كل رابط في سطر)<textarea name="gallery_urls" placeholder="https://example.com/photo2.jpg"></textarea></label><label>نبذة عن العرض<textarea name="description" maxlength="2000"></textarea></label><label>وصف تسويقي<textarea name="marketing_text" maxlength="1200"></textarea></label><label>المواصفات<textarea name="specifications" maxlength="1500"></textarea></label><button class="tmBtn tmBtnDark">نشر العرض</button><div class="error"></div></form>');return true;
 }
 if(action==='tm-edit-item'){
  try{
   const id=Number(el.dataset.id),sid=Number(el.dataset.store);
   const r=await api('market/store-console/'+sid),item=r.listings.find(x=>x.id===id);
   if(!item)throw Error('العرض غير موجود.');
   let gallery=[];try{gallery=JSON.parse(item.gallery_json||'[]');}catch{}
   showModal('تعديل العرض','<form id="tmEditItem" data-store="'+sid+'" data-id="'+id+'" class="tmForm"><label>اسم العرض<input name="title" required minlength="3" maxlength="160" value="'+esc(item.title)+'"></label><label>الوصف<textarea name="description" maxlength="2000">'+esc(item.description)+'</textarea></label><label>نبذة تسويقية<textarea name="marketing_text" maxlength="1200">'+esc(item.marketing_text||'')+'</textarea></label><label>المواصفات<textarea name="specifications" maxlength="1500">'+esc(item.specifications||'')+'</textarea></label><label>الفئة<input name="category" maxlength="60" value="'+esc(item.category||'عام')+'"></label><label>رمز SKU<input name="sku" maxlength="80" value="'+esc(item.sku||'')+'"></label><label>السعر بالريال<input name="price_sar" type="number" step="0.01" min="0" value="'+(item.price_minor===null?'':Number(item.price_minor)/100)+'"></label><label>المخزون<input name="stock_qty" type="number" min="0" value="'+(item.stock_qty??'')+'"></label><label>الحد الأدنى للطلب<input name="min_order_qty" type="number" min="1" value="'+Number(item.min_order_qty||1)+'"></label><label>الصورة الرئيسية<input name="image_url" type="url" value="'+esc(item.image_url||'')+'"></label><label>صور أخرى HTTPS (كل رابط في سطر)<textarea name="gallery_urls">'+esc(gallery.join('\n'))+'</textarea></label><label>حالة النشر<select name="status">'+['published','draft','archived'].map(x=>'<option '+(x===item.status?'selected':'')+' value="'+x+'">'+({published:'منشور',draft:'مسودة',archived:'مؤرشف'}[x])+'</option>').join('')+'</select></label><button class="tmBtn tmBtnDark">حفظ التعديلات</button><div class="error"></div></form>');
  }catch(e){notify(e.message);}
  return true;
 }
 if(action==='tm-store-requests'){
  try{
   const sid=Number(el.dataset.id),r=await api('market/store-console/'+sid+'/requests');
   showModal('طلبات المتجر',r.requests.length?'<div class="tmRequests">'+r.requests.map(x=>'<article><strong>'+esc(x.listing_title)+'</strong><p>المشتري: '+esc(x.buyer_name)+' | الكمية: '+Number(x.quantity)+'</p><small>الحالة: '+esc(x.status)+'</small><p>'+esc(x.notes||'')+'</p></article>').join('')+'</div>':'<p>لم تصل طلبات جديدة.</p>');
  }catch(e){notify(e.message);}return true;
 }
 if(action==='tm-store-settings'){
  try{
   const sid=Number(el.dataset.id),r=await api('market/store-console/'+sid),s=r.store;
   showModal('إعدادات المتجر','<form id="tmStoreSettings" data-id="'+sid+'" class="tmForm"><label>اسم المتجر<input name="name" maxlength="100" required value="'+esc(s.name)+'"></label><label>الوصف<textarea name="description" maxlength="1000">'+esc(s.description||'')+'</textarea></label><label>معلومات التواصل<textarea name="contact_text" maxlength="400">'+esc(s.contact_text||'')+'</textarea></label><label>رابط الشعار<input type="url" name="logo_url" value="'+esc(s.logo_url||'')+'"></label><label>رابط صورة الغلاف<input type="url" name="banner_url" value="'+esc(s.banner_url||'')+'"></label><label>لون الهوية<input type="color" name="theme_color" value="'+esc(s.theme_color||'#183e60')+'"></label><button class="tmBtn tmBtnDark">حفظ إعدادات المتجر</button><div class="error"></div></form>');
  }catch(e){notify(e.message);}return true;
 }
 return false;
}
async function tnMarketV3Form(form,data){
 if(form.id==='tmSearchForm'){await tnLoadMarketCatalog({q:data.q,type:data.type,sort:data.sort});return true;}
 if(!['tmOnboard','tmStoreLogin','tmNewItem','tmEditItem','tmStoreSettings','tmOrder','tmReviewForm','tmCartCheckout'].includes(form.id))return false;
 const error=form.querySelector('.error'),button=form.querySelector('button[type=submit],button:not([type])');
 if(error)error.textContent='';if(button)button.disabled=true;
 try{
  if(form.id==='tmCartCheckout'){const r=await api('market/cart/checkout','POST',{notes:data.notes});notify('تم إرسال '+r.requests_created+' طلب شراء مبدئي دون دفع.');await renderMarketCart();return true;}
  if(form.id==='tmOnboard'){
   const r=await api('market/shop-onboard','POST',data);dialog.close();notify('أُنشئ طلب المتجر. سيظهر للجمهور بعد اعتماد الإدارة.');await tnMyStores();
  }else if(form.id==='tmStoreLogin'){
   const storeId=Number(form.dataset.id);
   if(data.slug){
    await api('market/store-bootstrap','POST',{store_id:storeId,slug:data.slug,store_password:data.store_password});
   }else await api('market/store-login','POST',{store_id:storeId,store_password:data.store_password});
   if(data.slug)await api('market/store-login','POST',{store_id:storeId,store_password:data.store_password});
   dialog.close();await tnOpenStoreConsole(storeId);
  }else if(form.id==='tmNewItem'){
   const price=data.price_sar===''?null:Math.round(Number(data.price_sar)*100);
   if(price!==null&&(!Number.isSafeInteger(price)||price<0))throw Error('السعر غير صحيح.');
   await api('market/store-console/'+Number(form.dataset.id)+'/items','POST',{...data,price_minor:price,kind:data.type,category:data.type==='project'?'المشاريع':data.category});
   dialog.close();notify('نُشر العرض في متجرك.');await tnOpenStoreConsole(Number(form.dataset.id));
  }else if(form.id==='tmEditItem'){
   const price=data.price_sar===''?null:Math.round(Number(data.price_sar)*100);
   await api('market/store-console/'+Number(form.dataset.store)+'/items/'+Number(form.dataset.id),'PATCH',{...data,price_minor:price});
   dialog.close();notify('تم حفظ التعديل.');await tnOpenStoreConsole(Number(form.dataset.store));
  }else if(form.id==='tmStoreSettings'){
   await api('market/store-console/'+Number(form.dataset.id),'PATCH',data);dialog.close();notify('حُفظت إعدادات المتجر.');await tnOpenStoreConsole(Number(form.dataset.id));
  }else if(form.id==='tmOrder'){
   await api('market/order-request','POST',{listing_id:Number(form.dataset.id),quantity:Number(data.quantity),notes:data.notes});
   dialog.close();notify('وصل طلبك إلى المتجر، ولم يتم تحصيل أي مبلغ.');
  }else if(form.id==='tmReviewForm'){
   await api('market/reviews/'+Number(form.dataset.id),'POST',{stars:Number(data.stars),comment:data.comment});
   notify('تم تسجيل تقييمك.');await renderMarketProduct(Number(form.dataset.id));
  }
 }catch(e){if(error)error.textContent=e.message;else notify(e.message);}finally{if(button)button.disabled=false;}
 return true;
}

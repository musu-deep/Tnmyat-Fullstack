// Market V3 — commerce catalogue, secure vendor console and order intents.
// No payment transactions or live subdomain provisioning occur in this module.
const MARKET_SALT_BYTES=16, MARKET_HASH_BYTES=32, MARKET_HASH_ROUNDS=180000;
const idNum=v=>{const n=Number(v);return Number.isSafeInteger(n)&&n>0?n:null;};
const cleanSlug=v=>{const s=String(v||'').trim().toLowerCase();return /^(?=.{3,40}$)[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(s)&&!['www','admin','api','mail','market','support','app','shop','shops','tnmyat','test'].includes(s)?s:null;};
const hex=b=>Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');
const bytes=s=>Uint8Array.from(s.match(/.{2}/g).map(c=>parseInt(c,16)));
const sha256=async s=>hex(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))));
async function vendorHash(pass,salt,iterations=MARKET_HASH_ROUNDS){
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(pass),'PBKDF2',false,['deriveBits']);
 return hex(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt:bytes(salt),iterations,hash:'SHA-256'},key,MARKET_HASH_BYTES*8)));
}
const cookieValue=request=>{const c=request.headers.get('cookie')||'';const m=c.match(/(?:^|;\s*)tn_store_session=([a-f0-9]{64})(?:;|$)/);return m?.[1]||null;};
const vendorCookie=(token,age)=>'tn_store_session='+token+'; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age='+age;
const safePhoto=v=>{if(!v)return null;try{const u=new URL(String(v));return u.protocol==='https:'&&u.username===''&&u.password===''&&String(v).length<=600?u.href:null;}catch{return null;}};
const marketGallery=v=>{
 const raw=Array.isArray(v)?v:typeof v==='string'?v.split(/[\n,]/).map(x=>x.trim()).filter(Boolean):[];
 if(raw.length>6)throw new Error('الحد الأقصى ست صور للعرض.');
 return raw.map(x=>{const result=safePhoto(x);if(!result)throw new Error('أدخل روابط صور HTTPS صحيحة.');return result;});
};
const publicProductSQL=`SELECT l.id,l.store_id,l.title,l.description,l.type,l.price_minor,l.currency,
 l.category,l.image_url,l.gallery_json,l.sku,l.stock_qty,l.min_order_qty,
 l.specifications,l.marketing_text,l.created_at,s.name store_name,s.slug store_slug,s.kind store_kind,
 (SELECT ROUND(AVG(r.stars),1) FROM market_reviews r WHERE r.listing_id=l.id AND r.status='visible') avg_stars,
 (SELECT COUNT(*) FROM market_reviews r WHERE r.listing_id=l.id AND r.status='visible') reviews_count
 FROM market_listings l JOIN market_stores s ON s.id=l.store_id
 WHERE l.status='published' AND s.status='approved'`;
export async function marketV3Route(request,db,user,{json,parseBody,textField,requireUser,ApiError,enforceLimit}){
 const url=new URL(request.url),p=url.pathname,m=request.method;
 if(!p.startsWith('/api/market/'))return null;
 const member=()=>{requireUser(user);if(user.account_status!=='active')throw new ApiError(403,'الحساب غير نشط.');};
 const limited=async(type,count=40)=>{member();await enforceLimit(db,'market-v3-'+type,user.id,count,3600);};
 const product=async id=>{
  const item=await db.prepare(publicProductSQL+' AND l.id=?').bind(id).first();
  if(!item)throw new ApiError(404,'العرض غير متاح.');
  return item;
 };
 const owner=async storeId=>{
  member();
  const store=await db.prepare('SELECT * FROM market_stores WHERE id=? AND owner_id=?').bind(storeId,user.id).first();
  if(!store)throw new ApiError(404,'المتجر غير متاح لحسابك.');
  return store;
 };
 const authorizedStore=async storeId=>{
  const store=await owner(storeId),token=cookieValue(request);
  if(!token)throw new ApiError(401,'أدخل كلمة مرور إدارة المتجر.');
  const session=await db.prepare('SELECT store_id,owner_id,expires_at FROM market_store_sessions WHERE token_hash=?').bind(await sha256(token)).first();
  if(!session||session.store_id!==storeId||session.owner_id!==user.id||session.expires_at<=Math.floor(Date.now()/1000))
   throw new ApiError(401,'انتهت جلسة المتجر. سجّل الدخول مجدداً.');
  return store;
 };
 if(p==='/api/market/catalog'&&m==='GET'){
  const q=(url.searchParams.get('q')||'').trim().slice(0,90);
  const category=(url.searchParams.get('category')||'').trim().slice(0,60);
  const type=url.searchParams.get('type')||'';
  const sort=url.searchParams.get('sort')||'newest';
  if(type&&!['product','service','project'].includes(type))throw new ApiError(400,'نوع العرض غير صحيح.');
  if(!['newest','price-asc','price-desc','rated'].includes(sort))throw new ApiError(400,'ترتيب غير مدعوم.');
  const order={
   newest:'l.id DESC',
   'price-asc':'l.price_minor IS NULL,l.price_minor ASC,l.id DESC',
   'price-desc':'l.price_minor DESC,l.id DESC',
   rated:'avg_stars DESC,l.id DESC'
  }[sort];
  // A project is a product tagged as a project, preserving the original type constraint.
  const kind=type==='project'?'product':type;
  const rows=await db.prepare(publicProductSQL+` AND (?='' OR l.type=?) AND (?='' OR l.category=?) AND (?='' OR l.title LIKE ? OR l.description LIKE ?) `+' ORDER BY '+order+' LIMIT 120')
   .bind(kind,kind,type==='project'?'المشاريع':category,type==='project'?'المشاريع':category,q,'%'+q+'%','%'+q+'%').all();
  return json({listings:rows.results});
 }
 const itemRoute=p.match(/^\/api\/market\/item\/(\d+)$/);
 if(itemRoute&&m==='GET'){
  const item=await product(idNum(itemRoute[1]));
  const reviews=await db.prepare(`SELECT r.stars,r.comment,r.created_at,u.name author FROM market_reviews r JOIN users u ON u.id=r.user_id WHERE r.listing_id=? AND r.status='visible' ORDER BY r.id DESC LIMIT 40`).bind(item.id).all();
  const favored=user?await db.prepare('SELECT 1 yes FROM market_favorites WHERE user_id=? AND listing_id=?').bind(user.id,item.id).first():null;
  return json({item,reviews:reviews.results,is_favorite:!!favored});
 }
 if(p==='/api/market/favorites'&&m==='GET'){
  member();const r=await db.prepare(publicProductSQL+' AND l.id IN (SELECT listing_id FROM market_favorites WHERE user_id=?) ORDER BY l.id DESC').bind(user.id).all();
  return json({listings:r.results});
 }
 const fave=p.match(/^\/api\/market\/favorites\/(\d+)$/);
 if(fave&&m==='POST'){
  await limited('favorite',100);
  const item=await product(idNum(fave[1]));
  const existing=await db.prepare('SELECT 1 yes FROM market_favorites WHERE user_id=? AND listing_id=?').bind(user.id,item.id).first();
  if(existing)await db.prepare('DELETE FROM market_favorites WHERE user_id=? AND listing_id=?').bind(user.id,item.id).run();
  else await db.prepare('INSERT INTO market_favorites(user_id,listing_id) VALUES(?,?)').bind(user.id,item.id).run();
  return json({is_favorite:!existing});
 }
 const review=p.match(/^\/api\/market\/reviews\/(\d+)$/);
 if(review&&m==='POST'){
  await limited('review',20);const item=await product(idNum(review[1]));
  const b=await parseBody(request),stars=Number(b.stars);
  if(!Number.isInteger(stars)||stars<1||stars>5)throw new ApiError(400,'التقييم بين نجمة وخمس نجوم.');
  if(item.store_id&&await db.prepare('SELECT 1 yes FROM market_stores WHERE id=? AND owner_id=?').bind(item.store_id,user.id).first())throw new ApiError(403,'لا يمكن تقييم منتجات متجرك.');
  const comment=textField(b.comment||'',0,1200,'ملاحظتك');
  await db.prepare(`INSERT INTO market_reviews(listing_id,user_id,stars,comment) VALUES(?,?,?,?)
    ON CONFLICT(listing_id,user_id) DO UPDATE SET stars=excluded.stars,comment=excluded.comment,created_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')`)
   .bind(item.id,user.id,stars,comment).run();
  return json({ok:true,verified_purchase:false});
 }
 const shop=p.match(/^\/api\/market\/shop\/([a-z][a-z0-9-]{2,39})$/);
 if(shop&&m==='GET'){
  const store=await db.prepare(`SELECT s.id,s.name,s.slug,s.description,s.kind,s.logo_url,s.banner_url,s.contact_text,s.theme_color,u.name owner_name
   FROM market_stores s JOIN users u ON u.id=s.owner_id WHERE s.slug=? AND s.status='approved'`).bind(shop[1]).first();
  if(!store)throw new ApiError(404,'المتجر غير متاح.');
  const items=await db.prepare(publicProductSQL+' AND s.id=? ORDER BY l.id DESC LIMIT 120').bind(store.id).all();
  return json({store,listings:items.results,custom_domain_active:false});
 }
 if(p==='/api/market/shop-onboard'&&m==='POST'){
  await limited('onboard',5);const b=await parseBody(request);
  const name=textField(b.name,3,100,'اسم المتجر'),description=textField(b.description||'',0,1000,'وصف المتجر');
  const slug=cleanSlug(b.slug),password=String(b.store_password||'');
  if(!slug)throw new ApiError(400,'اختر عنواناً إنجليزياً من 3 إلى 40 حرفاً، دون رموز أو مسافات.');
  if(password.length<12||password.length>128||!/[A-Z]/.test(password)||!/[a-z]/.test(password)||!/[0-9]/.test(password))
   throw new ApiError(400,'كلمة مرور المتجر: 12 حرفاً على الأقل، مع أحرف كبيرة وصغيرة وأرقام.');
  const kind=b.kind;
  if(!['producer','manufacturer','distributor','service_provider'].includes(kind))throw new ApiError(400,'فئة النشاط غير صحيحة.');
  const clash=await db.prepare('SELECT id FROM market_stores WHERE slug=?').bind(slug).first();
  if(clash)throw new ApiError(409,'العنوان محجوز. اختر عنواناً آخر.');
  const count=await db.prepare('SELECT count(*) c FROM market_stores WHERE owner_id=?').bind(user.id).first();
  if(count.c>=5)throw new ApiError(429,'بلغت الحد المسموح للمتاجر.');
  const salt=hex(crypto.getRandomValues(new Uint8Array(MARKET_SALT_BYTES))),hash=await vendorHash(password,salt);
  try{
   await db.batch([
    db.prepare('INSERT INTO market_stores(owner_id,name,description,kind,slug) VALUES(?,?,?,?,?)').bind(user.id,name,description,kind,slug),
    db.prepare('INSERT INTO market_store_access(store_id,password_salt,password_hash,iterations) SELECT id,?,?,? FROM market_stores WHERE slug=? AND owner_id=?')
     .bind(salt,hash,MARKET_HASH_ROUNDS,slug,user.id)
   ]);
  }catch(e){if(String(e.message).includes('UNIQUE'))throw new ApiError(409,'العنوان محجوز.');throw e;}
  const created=await db.prepare('SELECT id FROM market_stores WHERE slug=? AND owner_id=?').bind(slug,user.id).first();
  return json({id:created.id,slug,status:'pending',path:'/shop/'+slug,domain_provisioned:false},201);
 }
 if(p==='/api/market/store-bootstrap'&&m==='POST'){
  await limited('store-bootstrap',5);const b=await parseBody(request),storeId=idNum(b.store_id);
  if(!storeId)throw new ApiError(400,'المتجر غير صحيح.');
  const store=await owner(storeId);
  const existing=await db.prepare('SELECT store_id FROM market_store_access WHERE store_id=?').bind(storeId).first();
  if(existing)throw new ApiError(409,'إدارة المتجر محمية بالفعل بكلمة مرور.');
  const slug=cleanSlug(b.slug||store.slug);
  if(!slug)throw new ApiError(400,'عنوان المتجر غير صحيح.');
  const collision=await db.prepare('SELECT id FROM market_stores WHERE slug=? AND id<>?').bind(slug,storeId).first();
  if(collision)throw new ApiError(409,'عنوان المتجر محجوز.');
  const password=String(b.store_password||'');
  if(password.length<12||password.length>128||!/[A-Z]/.test(password)||!/[a-z]/.test(password)||!/[0-9]/.test(password))
   throw new ApiError(400,'كلمة المرور تحتاج 12 حرفاً وأحرفاً كبيرة وصغيرة وأرقاماً.');
  const salt=hex(crypto.getRandomValues(new Uint8Array(MARKET_SALT_BYTES))),hash=await vendorHash(password,salt);
  try{
   await db.batch([
    db.prepare('UPDATE market_stores SET slug=? WHERE id=? AND owner_id=?').bind(slug,storeId,user.id),
    db.prepare('INSERT INTO market_store_access(store_id,password_salt,password_hash,iterations) VALUES(?,?,?,?)').bind(storeId,salt,hash,MARKET_HASH_ROUNDS)
   ]);
  }catch(e){if(String(e.message).includes('UNIQUE'))throw new ApiError(409,'هذا العنوان أو كلمة المرور الإدارية مفعلة بالفعل.');throw e;}
  return json({ok:true,slug,path:'/shop/'+slug,domain_provisioned:false});
 }
 if(p==='/api/market/store-login'&&m==='POST'){
  await limited('store-login',15);const b=await parseBody(request),storeId=idNum(b.store_id);
  if(!storeId)throw new ApiError(400,'اختر متجراً.');
  await owner(storeId);
  const auth=await db.prepare('SELECT password_salt,password_hash,iterations FROM market_store_access WHERE store_id=?').bind(storeId).first();
  if(!auth)throw new ApiError(409,'متجر قديم: يلزم تعيين كلمة مرور مستقلة لإدارته.');
  const password=String(b.store_password||'');
  if(password.length>128)throw new ApiError(400,'كلمة المرور غير صحيحة.');
  const hash=await vendorHash(password,auth.password_salt,auth.iterations);
  let difference=0;for(let i=0;i<hash.length;i++)difference|=hash.charCodeAt(i)^auth.password_hash.charCodeAt(i);
  if(difference!==0)throw new ApiError(401,'كلمة المرور غير صحيحة.');
  const token=hex(crypto.getRandomValues(new Uint8Array(32)));
  await db.prepare('INSERT INTO market_store_sessions(token_hash,store_id,owner_id,expires_at) VALUES(?,?,?,unixepoch()+3600)')
   .bind(await sha256(token),storeId,user.id).run();
  return json({ok:true,store_id:storeId},200,{'Set-Cookie':vendorCookie(token,3600)});
 }
 const consoleRoute=p.match(/^\/api\/market\/store-console\/(\d+)(?:\/(items|requests)(?:\/(\d+))?)?$/);
 if(consoleRoute){
  const storeId=idNum(consoleRoute[1]);if(!storeId)throw new ApiError(400,'المتجر غير صحيح.');
  const store=await authorizedStore(storeId);
  if(m==='GET'&&!consoleRoute[2]){
   const listings=await db.prepare('SELECT * FROM market_listings WHERE store_id=? ORDER BY id DESC LIMIT 500').bind(storeId).all();
   const requests=await db.prepare('SELECT COUNT(*) c FROM market_purchase_requests WHERE store_id=? AND status=?').bind(storeId,'requested').first();
   return json({store,listings:listings.results,requests_count:requests.c,domain_provisioned:false});
  }
  if(m==='PATCH'&&!consoleRoute[2]){
   await limited('store-settings',20);
   const b=await parseBody(request),name=textField(b.name||store.name,3,100,'اسم المتجر');
   const description=textField(b.description??store.description,0,1000,'الوصف');
   const contact=textField(b.contact_text||'',0,400,'معلومات التواصل');
   const logo=safePhoto(b.logo_url),banner=safePhoto(b.banner_url);
   if(b.logo_url&&!logo||b.banner_url&&!banner)throw new ApiError(400,'روابط الصور يجب أن تكون HTTPS صحيحة.');
   const color=/^#[0-9a-fA-F]{6}$/.test(b.theme_color||'')?b.theme_color:'#183e60';
   await db.prepare('UPDATE market_stores SET name=?,description=?,contact_text=?,logo_url=?,banner_url=?,theme_color=? WHERE id=?')
    .bind(name,description,contact,logo,banner,color,storeId).run();
   return json({ok:true});
  }
  if(consoleRoute[2]==='requests'&&m==='GET'){
   const rows=await db.prepare('SELECT r.*,u.name buyer_name,l.title listing_title FROM market_purchase_requests r JOIN users u ON u.id=r.buyer_id JOIN market_listings l ON l.id=r.listing_id WHERE r.store_id=? ORDER BY r.id DESC LIMIT 120').bind(storeId).all();
   return json({requests:rows.results});
  }
  if(consoleRoute[2]==='items'&&m==='POST'){
   await limited('item-create',80);
   if(store.status!=='approved')throw new ApiError(403,'ينبغي اعتماد المتجر قبل نشر المنتجات.');
   const b=await parseBody(request),title=textField(b.title,3,160,'اسم العرض');
   const description=textField(b.description||'',0,2000,'الوصف'),category=textField(b.category||'عام',1,60,'الفئة');
   const kind=b.kind==='project'?'product':b.type;
   if(!['product','service'].includes(kind))throw new ApiError(400,'نوع العرض غير صحيح.');
   const price=b.price_minor===null||b.price_minor===''||b.price_minor===undefined?null:Number(b.price_minor);
   if(price!==null&&(!Number.isSafeInteger(price)||price<0||price>100000000000))throw new ApiError(400,'سعر غير صحيح.');
   const stock=b.stock_qty===''||b.stock_qty===null||b.stock_qty===undefined?null:Number(b.stock_qty);
   if(stock!==null&&(!Number.isSafeInteger(stock)||stock<0))throw new ApiError(400,'المخزون غير صحيح.');
   const min=Number(b.min_order_qty||1);if(!Number.isSafeInteger(min)||min<1||min>10000)throw new ApiError(400,'الحد الأدنى للطلب غير صحيح.');
   const image=safePhoto(b.image_url);if(b.image_url&&!image)throw new ApiError(400,'رابط الصورة غير صحيح.');
   let gallery;try{gallery=marketGallery(b.gallery_urls);}catch(e){throw new ApiError(400,e.message);}
   const marketing=textField(b.marketing_text||'',0,1200,'الوصف التسويقي');
   const spec=textField(b.specifications||'',0,1500,'المواصفات'),sku=textField(b.sku||'',0,80,'رمز الصنف');
   const inserted=await db.prepare(`INSERT INTO market_listings(store_id,title,description,type,price_minor,status,category,image_url,gallery_json,sku,stock_qty,min_order_qty,marketing_text,specifications)
   VALUES(?,?,?,?,?,'published',?,?,?,?,?,?,?,?) RETURNING id`)
   .bind(storeId,title,description,kind,price,category,image,JSON.stringify(gallery),sku,stock,min,marketing,spec).first();
   return json({id:inserted.id,status:'published'},201);
  }
  if(consoleRoute[2]==='items'&&consoleRoute[3]&&m==='PATCH'){
   await limited('item-edit',80);
   const listingId=idNum(consoleRoute[3]);
   const item=await db.prepare('SELECT * FROM market_listings WHERE id=? AND store_id=?').bind(listingId,storeId).first();
   if(!item)throw new ApiError(404,'المنتج غير موجود.');
   const b=await parseBody(request);
   if(b.status!==undefined&&!['draft','published','archived'].includes(b.status))throw new ApiError(400,'حالة العرض غير صحيحة.');
   const image=b.image_url===undefined?item.image_url:safePhoto(b.image_url);
   if(b.image_url&&!image)throw new ApiError(400,'رابط الصورة غير صحيح.');
   const name=textField(b.title??item.title,3,160,'العنوان');
   const desc=textField(b.description??item.description,0,2000,'الوصف');
   const marketing=textField(b.marketing_text??item.marketing_text,0,1200,'الوصف التسويقي');
   const spec=textField(b.specifications??item.specifications,0,1500,'المواصفات');
   const category=textField(b.category??item.category,1,60,'الفئة');
   const sku=textField(b.sku??item.sku??'',0,80,'رمز الصنف');
   const price=b.price_minor===undefined?item.price_minor:b.price_minor===null||b.price_minor===''?null:Number(b.price_minor);
   const stock=b.stock_qty===undefined?item.stock_qty:b.stock_qty===null||b.stock_qty===''?null:Number(b.stock_qty);
   const min=b.min_order_qty===undefined?item.min_order_qty:Number(b.min_order_qty);
   if(price!==null&&(!Number.isSafeInteger(price)||price<0||price>100000000000))throw new ApiError(400,'سعر غير صحيح.');
   if(stock!==null&&(!Number.isSafeInteger(stock)||stock<0)||!Number.isSafeInteger(min)||min<1||min>10000)throw new ApiError(400,'المخزون أو الحد الأدنى غير صحيح.');
   let gallery;try{gallery=b.gallery_urls===undefined?JSON.parse(item.gallery_json||'[]'):marketGallery(b.gallery_urls);}catch(e){throw new ApiError(400,'روابط الصور الإضافية غير صحيحة.');}
   await db.prepare(`UPDATE market_listings SET title=?,description=?,marketing_text=?,specifications=?,category=?,sku=?,price_minor=?,
    stock_qty=?,min_order_qty=?,image_url=?,gallery_json=?,status=? WHERE id=? AND store_id=?`)
    .bind(name,desc,marketing,spec,category,sku,price,stock,min,image,JSON.stringify(gallery),b.status||item.status,item.id,storeId).run();
   return json({ok:true});
  }
 }
 // Persistent cart for member purchases; money always remains outside the platform.
 if(p==='/api/market/cart'&&m==='GET'){
  member();const rows=await db.prepare(publicProductSQL+` AND l.id IN (SELECT listing_id FROM market_cart_items WHERE user_id=?)
   ORDER BY l.id DESC LIMIT 100`).bind(user.id).all();
  const amounts=await db.prepare('SELECT listing_id,quantity FROM market_cart_items WHERE user_id=?').bind(user.id).all();
  const quantities=new Map(amounts.results.map(x=>[x.listing_id,x.quantity]));
  return json({items:rows.results.map(x=>({...x,quantity:quantities.get(x.id)||1})),payable:false});
 }
 if(p==='/api/market/cart'&&m==='POST'){
  await limited('cart',80);const b=await parseBody(request),item=await product(idNum(b.listing_id));
  const quantity=Number(b.quantity);
  if(!Number.isSafeInteger(quantity)||quantity<(item.min_order_qty||1)||quantity>10000)throw new ApiError(400,'الكمية غير صحيحة.');
  if(item.stock_qty!==null&&quantity>item.stock_qty)throw new ApiError(400,'الكمية المطلوبة تتجاوز المخزون.');
  await db.prepare(`INSERT INTO market_cart_items(user_id,listing_id,quantity) VALUES(?,?,?)
    ON CONFLICT(user_id,listing_id) DO UPDATE SET quantity=excluded.quantity`).bind(user.id,item.id,quantity).run();
  return json({ok:true,quantity});
 }
 const cartRemove=p.match(/^\/api\/market\/cart\/(\d+)$/);
 if(cartRemove&&m==='DELETE'){
  member();await db.prepare('DELETE FROM market_cart_items WHERE user_id=? AND listing_id=?').bind(user.id,idNum(cartRemove[1])).run();
  return json({ok:true});
 }
 if(p==='/api/market/cart/checkout'&&m==='POST'){
  await limited('cart-checkout',15);
  const b=await parseBody(request),notes=textField(b.notes||'',0,1000,'ملاحظات الطلب');
  const rows=await db.prepare(`SELECT c.listing_id,c.quantity,l.price_minor,l.stock_qty,l.min_order_qty,l.store_id,s.owner_id
    FROM market_cart_items c JOIN market_listings l ON l.id=c.listing_id
    JOIN market_stores s ON s.id=l.store_id
    WHERE c.user_id=? AND s.status='approved' AND l.status='published' ORDER BY c.added_at ASC LIMIT 80`).bind(user.id).all();
  const items=rows.results;
  if(!items.length)throw new ApiError(400,'السلة فارغة أو المنتجات لم تعد متاحة.');
  for(const item of items){
   if(item.owner_id===user.id)throw new ApiError(403,'لا يمكنك طلب منتجات متجرك.');
   if(item.quantity<item.min_order_qty||item.stock_qty!==null&&item.quantity>item.stock_qty)
    throw new ApiError(409,'تغير المخزون أو الحد الأدنى لبعض المنتجات. راجع السلة.');
  }
  const statements=items.map(x=>db.prepare('INSERT INTO market_purchase_requests(listing_id,buyer_id,store_id,quantity,unit_price_minor,notes) VALUES(?,?,?,?,?,?)')
   .bind(x.listing_id,user.id,x.store_id,x.quantity,x.price_minor,notes));
  statements.push(db.prepare('DELETE FROM market_cart_items WHERE user_id=?').bind(user.id));
  await db.batch(statements);
  return json({ok:true,requests_created:items.length,charged:false,inventory_reserved:false,shipping_booked:false},201);
 }
 if(p==='/api/market/order-request'&&m==='POST'){
  await limited('order-request',25);const b=await parseBody(request),item=await product(idNum(b.listing_id));
  const quantity=Number(b.quantity);
  if(!Number.isSafeInteger(quantity)||quantity<(item.min_order_qty||1)||quantity>10000)throw new ApiError(400,'الكمية أقل من الحد الأدنى أو غير صحيحة.');
  if(item.stock_qty!==null&&quantity>item.stock_qty)throw new ApiError(400,'الكمية المطلوبة غير متاحة.');
  const store=await db.prepare('SELECT owner_id FROM market_stores WHERE id=?').bind(item.store_id).first();
  if(store.owner_id===user.id)throw new ApiError(403,'لا يمكنك شراء منتجات متجرك.');
  const notes=textField(b.notes||'',0,1000,'تفاصيل الطلب');
  const created=await db.prepare('INSERT INTO market_purchase_requests(listing_id,buyer_id,store_id,quantity,unit_price_minor,notes) VALUES(?,?,?,?,?,?) RETURNING id')
   .bind(item.id,user.id,item.store_id,quantity,item.price_minor,notes).first();
  return json({id:created.id,status:'requested',paid:false,fulfillment:false},201);
 }
 if(p==='/api/market/my-requests'&&m==='GET'){
  member();const res=await db.prepare('SELECT r.id,r.quantity,r.unit_price_minor,r.status,r.created_at,l.title,s.name store_name FROM market_purchase_requests r JOIN market_listings l ON l.id=r.listing_id JOIN market_stores s ON s.id=r.store_id WHERE r.buyer_id=? ORDER BY r.id DESC LIMIT 100').bind(user.id).all();
  return json({requests:res.results});
 }
 return null;
}

// Curated hybrid marketplace: seller storefronts + shared discovery. No checkout/payment processing.
export async function marketImpactRoute(request, db, user, {json,parseBody,textField,requireUser,ApiError}) {
 const url=new URL(request.url),path=url.pathname,method=request.method;
 if(!path.startsWith('/api/market/')&&!path.startsWith('/api/impact/'))return null;
 const admin=()=>{if(!user||user.role!=='admin'||user.account_status!=='active')throw new ApiError(403,'هذه العملية مخصصة للإدارة العامة.');};
 const member=()=>{requireUser(user);if(user.account_status!=='active')throw new ApiError(403,'حساب غير نشط.');};
 const idPart=path.match(/\/(\d+)(?:\/|$)/);
 const id=idPart?Number(idPart[1]):0;
 if(method==='GET'&&path==='/api/impact/members'){
  const rows=await db.prepare(`SELECT u.id,u.name,COALESCE(i.score,0) score,COALESCE(i.category,'قيد التقييم') category,i.evidence,i.updated_at
    FROM market_member_impact_ratings i JOIN users u ON u.id=i.user_id
    WHERE u.account_status='active' ORDER BY i.score DESC,u.id ASC LIMIT 100`).all();
  return json({members:rows.results});
 }
 if(method==='PUT'&&/^\/api\/impact\/members\/\d+$/.test(path)){
  admin();const body=await parseBody(request);
  const score=Number(body.score);
  if(!Number.isInteger(score)||score<0||score>100)throw new ApiError(400,'درجة الأثر بين صفر و100.');
  const evidence=textField(body.evidence,12,1000,'مستند أو وصف دليل الأثر');
  const found=await db.prepare("SELECT id FROM users WHERE id=? AND account_status='active'").bind(id).first();
  if(!found)throw new ApiError(404,'العضو غير موجود أو غير نشط.');
  const category=score>=80?'أثر رائد':score>=60?'أثر متقدم':score>=40?'أثر نامٍ':'أثر ناشئ';
  await db.prepare(`INSERT INTO market_member_impact_ratings(user_id,score,evidence,category,reviewed_by)
   VALUES(?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET score=excluded.score,evidence=excluded.evidence,
   category=excluded.category,reviewed_by=excluded.reviewed_by,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')`)
   .bind(id,score,evidence,category,user.id).run();
  return json({ok:true,category});
 }
 if(method==='GET'&&path==='/api/market/stores'){
  const rows=await db.prepare(`SELECT s.id,s.name,s.description,s.kind,u.name owner_name,
   (SELECT count(*) FROM market_listings l WHERE l.store_id=s.id AND l.status='published') listings
   FROM market_stores s JOIN users u ON u.id=s.owner_id WHERE s.status='approved'
   ORDER BY s.id DESC LIMIT 100`).all();
  return json({stores:rows.results});
 }
 if(method==='GET'&&path==='/api/market/listings'){
  const q=(url.searchParams.get('q')||'').trim().slice(0,80);
  const kind=url.searchParams.get('type')||'';
  if(kind&&!['product','service'].includes(kind))throw new ApiError(400,'نوع العرض غير صحيح.');
  const rows=await db.prepare(`SELECT l.id,l.title,l.description,l.type,l.price_minor,l.currency,l.category,l.image_url,l.stock_qty,l.min_order_qty,
   s.id store_id,s.name store_name,s.kind store_kind
   FROM market_listings l JOIN market_stores s ON s.id=l.store_id
   WHERE s.status='approved' AND l.status='published' AND (?='' OR l.type=?)
   AND (?='' OR l.title LIKE ? OR l.description LIKE ?)
   ORDER BY l.id DESC LIMIT 100`).bind(kind,kind,q,'%'+q+'%','%'+q+'%').all();
  return json({listings:rows.results});
 }
 if(method==='GET'&&path==='/api/market/my-stores'){
  member();
  const rows=await db.prepare('SELECT id,name,description,kind,status FROM market_stores WHERE owner_id=? ORDER BY id DESC').bind(user.id).all();
  return json({stores:rows.results});
 }
 if(method==='POST'&&path==='/api/market/stores'){
  member();const b=await parseBody(request);
  const name=textField(b.name,3,100,'اسم المساحة التجارية');
  const description=textField(b.description||'',0,1000,'الوصف');
  if(!['producer','manufacturer','distributor','service_provider'].includes(b.kind))throw new ApiError(400,'فئة النشاط غير صحيحة.');
  const count=await db.prepare('SELECT count(*) c FROM market_stores WHERE owner_id=?').bind(user.id).first();
  if(count.c>=5)throw new ApiError(429,'بلغت الحد الأقصى للمساحات.');
  await db.prepare('INSERT INTO market_stores(owner_id,name,description,kind) VALUES(?,?,?,?)').bind(user.id,name,description,b.kind).run();
  return json({ok:true,status:'pending'},201);
 }
 if(method==='POST'&&/^\/api\/market\/stores\/\d+\/listings$/.test(path)){
  member();
  const store=await db.prepare('SELECT owner_id,status FROM market_stores WHERE id=?').bind(id).first();
  if(!store||store.owner_id!==user.id)throw new ApiError(403,'هذه المساحة ليست ملكك.');
  if(store.status!=='approved')throw new ApiError(403,'تحتاج المساحة إلى الموافقة قبل إضافة عروض.');
  const b=await parseBody(request);const title=textField(b.title,3,160,'عنوان العرض');
  const description=textField(b.description||'',0,2000,'الوصف');
  if(!['product','service'].includes(b.type))throw new ApiError(400,'اختر منتجاً أو خدمة.');
  const price=b.price_minor===null||b.price_minor===''||b.price_minor===undefined?null:Number(b.price_minor);
  if(price!==null&&(!Number.isSafeInteger(price)||price<0||price>100000000000))throw new ApiError(400,'السعر غير صحيح.');
  const count=await db.prepare('SELECT count(*) c FROM market_listings WHERE store_id=?').bind(id).first();
  if(count.c>=500)throw new ApiError(429,'بلغت الحد الأقصى للعروض.');
  await db.prepare('INSERT INTO market_listings(store_id,title,description,type,price_minor,status) VALUES(?,?,?,?,?,?)')
   .bind(id,title,description,b.type,price,'published').run();
  return json({ok:true},201);
 }
 if(method==='GET'&&path==='/api/market/admin/stores'){
  admin();const rows=await db.prepare(`SELECT s.id,s.name,s.kind,s.status,u.name owner_name,u.email owner_email
    FROM market_stores s JOIN users u ON u.id=s.owner_id ORDER BY s.id DESC LIMIT 200`).all();
  return json({stores:rows.results});
 }
 if(method==='PATCH'&&/^\/api\/market\/admin\/stores\/\d+$/.test(path)){
  admin();const b=await parseBody(request);
  if(!['approved','rejected','suspended','pending'].includes(b.status))throw new ApiError(400,'حالة غير صحيحة.');
  const result=await db.prepare('UPDATE market_stores SET status=? WHERE id=?').bind(b.status,id).run();
  if(!result.meta.changes)throw new ApiError(404,'المساحة غير موجودة.');
  return json({ok:true});
 }
 throw new ApiError(404,'المسار غير متاح.');
}

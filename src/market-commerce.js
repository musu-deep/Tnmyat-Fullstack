// Incremental Tnmyat market operations. Intentionally no payment capture or fulfillment claims.
export async function marketCommerceRoute(request,db,user,{json,parseBody,textField,requireUser,ApiError}) {
 const url=new URL(request.url),p=url.pathname,m=request.method;
 if(!p.startsWith('/api/market/'))return null;
 const member=()=>{requireUser(user);if(user.account_status!=='active')throw new ApiError(403,'الحساب غير نشط.');};
 const validateId=value=>{const n=Number(value);if(!Number.isSafeInteger(n)||n<=0)throw new ApiError(400,'المعرّف غير صحيح.');return n;};
 const cents=value=>{const n=Number(value);if(!Number.isSafeInteger(n)||n<0||n>100000000000)throw new ApiError(400,'المبلغ غير صحيح.');return n;};
 const positive=value=>{const n=Number(value);if(!Number.isSafeInteger(n)||n<1||n>1000000)throw new ApiError(400,'الكمية غير صحيحة.');return n;};
 const storeOwner=async(storeId)=>{member();const store=await db.prepare('SELECT id,owner_id,status FROM market_stores WHERE id=?').bind(storeId).first();if(!store||store.owner_id!==user.id)throw new ApiError(403,'لا تملك هذه المساحة.');if(store.status!=='approved')throw new ApiError(403,'المساحة لم تُعتمد.');return store;};
 const listingOwner=async(listingId)=>{member();const r=await db.prepare('SELECT l.id,l.store_id,s.owner_id,s.status FROM market_listings l JOIN market_stores s ON s.id=l.store_id WHERE l.id=?').bind(listingId).first();if(!r||r.owner_id!==user.id)throw new ApiError(403,'لا تملك هذا العرض.');if(r.status!=='approved')throw new ApiError(403,'المساحة غير معتمدة.');return r;};
 const storefront=p.match(/^\/api\/market\/storefront\/(\d+)$/);
 if(storefront&&m==='GET'){
  const id=validateId(storefront[1]);
  const store=await db.prepare(`SELECT s.id,s.name,s.description,s.kind,u.name owner_name
    FROM market_stores s JOIN users u ON u.id=s.owner_id
    WHERE s.id=? AND s.status='approved'`).bind(id).first();
  if(!store)throw new ApiError(404,'هذه المساحة غير متاحة.');
  const listings=await db.prepare(`SELECT id,title,description,type,price_minor,currency,category,image_url,stock_qty,min_order_qty,sku
    FROM market_listings WHERE store_id=? AND status='published' ORDER BY id DESC LIMIT 200`).bind(id).all();
  return json({store,listings:listings.results});
 }
 if(p==='/api/market/categories'&&m==='GET')return json({categories:['مواد البناء','التقنية','الصناعة','الزراعة','الأغذية','التعليم','الخدمات المهنية','التجهيزات','النقل واللوجستيات','عام']});
 if(p==='/api/market/dashboard'&&m==='GET'){
  member();
  const stats=await db.prepare(`SELECT (SELECT COUNT(*) FROM market_stores WHERE owner_id=?) stores,
   (SELECT COUNT(*) FROM market_listings l JOIN market_stores s ON s.id=l.store_id WHERE s.owner_id=?) listings,
   (SELECT COUNT(*) FROM market_inquiries WHERE seller_id=?) received_inquiries,
   (SELECT COUNT(*) FROM market_inquiries WHERE buyer_id=?) sent_inquiries,
   (SELECT COUNT(*) FROM market_rfq WHERE buyer_id=?) rfqs,
   (SELECT COUNT(*) FROM market_rfq_bids WHERE vendor_id=?) bids`).bind(user.id,user.id,user.id,user.id,user.id,user.id).first();
  return json({stats});
 }
 if(p==='/api/market/inquiries'&&m==='GET'){
  member();
  const mode=url.searchParams.get('mode')==='sent'?'sent':'received';
  const where=mode==='sent'?'i.buyer_id':'i.seller_id';
  const results=await db.prepare(`SELECT i.id,i.quantity,i.message,i.status,i.created_at,l.title listing_title,s.name store_name,
    b.name buyer_name,v.name seller_name,q.amount_minor,q.notes quotation_notes
    FROM market_inquiries i JOIN market_listings l ON l.id=i.listing_id
    JOIN market_stores s ON s.id=l.store_id JOIN users b ON b.id=i.buyer_id JOIN users v ON v.id=i.seller_id
    LEFT JOIN market_quotations q ON q.inquiry_id=i.id WHERE `+where+`=? ORDER BY i.id DESC LIMIT 100`).bind(user.id).all();
  return json({inquiries:results.results});
 }
 if(p==='/api/market/inquiries'&&m==='POST'){
  member();const b=await parseBody(request);const listingId=validateId(b.listing_id),quantity=positive(b.quantity||1);
  const listing=await db.prepare(`SELECT l.id,l.min_order_qty,l.stock_qty,s.owner_id FROM market_listings l
   JOIN market_stores s ON s.id=l.store_id WHERE l.id=? AND l.status='published' AND s.status='approved'`).bind(listingId).first();
  if(!listing)throw new ApiError(404,'العرض غير متاح.');
  if(listing.owner_id===user.id)throw new ApiError(400,'لا يمكنك طلب عرضك الخاص.');
  if(quantity<listing.min_order_qty)throw new ApiError(400,'الكمية أقل من الحد الأدنى.');
  if(listing.stock_qty!==null&&quantity>listing.stock_qty)throw new ApiError(400,'الكمية المطلوبة تتجاوز المخزون المعروض.');
  const message=textField(b.message||'',0,1000,'تفاصيل الطلب');
  await db.prepare('INSERT INTO market_inquiries(listing_id,buyer_id,seller_id,quantity,message) VALUES(?,?,?,?,?)')
   .bind(listingId,user.id,listing.owner_id,quantity,message).run();
  return json({ok:true,message:'تم إرسال طلب السعر إلى البائع. لم يُنفّذ شراء أو دفع.'},201);
 }
 const reply=p.match(/^\/api\/market\/inquiries\/(\d+)\/quote$/);
 if(reply&&m==='POST'){
  member();const id=validateId(reply[1]),b=await parseBody(request),amount=cents(b.amount_minor);
  const inquiry=await db.prepare('SELECT seller_id,status FROM market_inquiries WHERE id=?').bind(id).first();
  if(!inquiry||inquiry.seller_id!==user.id)throw new ApiError(403,'الطلب ليس موجهاً لك.');
  if(!['new','quoted'].includes(inquiry.status))throw new ApiError(409,'لا يمكن تسعير هذا الطلب.');
  const notes=textField(b.notes||'',0,1500,'ملاحظات التسعير');
  await db.batch([
   db.prepare(`INSERT INTO market_quotations(inquiry_id,seller_id,amount_minor,notes) VALUES(?,?,?,?)
      ON CONFLICT(inquiry_id) DO UPDATE SET amount_minor=excluded.amount_minor,notes=excluded.notes,created_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')`).bind(id,user.id,amount,notes),
   db.prepare("UPDATE market_inquiries SET status='quoted',updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?").bind(id)
  ]);
  return json({ok:true});
 }
 const decision=p.match(/^\/api\/market\/inquiries\/(\d+)\/decision$/);
 if(decision&&m==='PATCH'){
  member();const id=validateId(decision[1]),b=await parseBody(request);
  if(!['accepted','declined'].includes(b.status))throw new ApiError(400,'الحالة غير صحيحة.');
  const inquiry=await db.prepare('SELECT buyer_id,status FROM market_inquiries WHERE id=?').bind(id).first();
  if(!inquiry||inquiry.buyer_id!==user.id)throw new ApiError(403,'هذا ليس طلبك.');
  if(inquiry.status!=='quoted')throw new ApiError(409,'يلزم وجود عرض سعر قبل اتخاذ قرار.');
  await db.prepare("UPDATE market_inquiries SET status=?,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=? AND status='quoted'").bind(b.status,id).run();
  return json({ok:true,message:'تم تسجيل قرارك على عرض السعر. لا يُعد ذلك دفعاً أو تنفيذ شحن.'});
 }
 const catalog=p.match(/^\/api\/market\/listings\/(\d+)$/);
 if(catalog&&m==='PATCH'){
  const listingId=validateId(catalog[1]);await listingOwner(listingId);const b=await parseBody(request);
  const category=textField(b.category||'عام',1,80,'التصنيف');
  const imageUrl=textField(b.image_url||'',0,500,'رابط الصورة');
  if(imageUrl&&!/^https:\/\/[a-z0-9.-]+(?::443)?(?:\/|$)/i.test(imageUrl))throw new ApiError(400,'رابط الصورة يجب أن يكون HTTPS.');
  const stock=b.stock_qty===''||b.stock_qty===null||b.stock_qty===undefined?null:Number(b.stock_qty);
  if(stock!==null&&(!Number.isSafeInteger(stock)||stock<0||stock>100000000))throw new ApiError(400,'المخزون غير صحيح.');
  const minimum=positive(b.min_order_qty||1);
  const sku=textField(b.sku||'',0,80,'رمز المنتج');
  await db.prepare(`UPDATE market_listings SET category=?,image_url=?,stock_qty=?,min_order_qty=?,sku=?,
  updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?`).bind(category,imageUrl,stock,minimum,sku,listingId).run();
  return json({ok:true});
 }
 if(p==='/api/market/my-listings'&&m==='GET'){
  member();const rows=await db.prepare(`SELECT l.id,l.title,l.type,l.price_minor,l.category,l.stock_qty,l.min_order_qty,l.sku,l.image_url,l.status,s.name store_name
   FROM market_listings l JOIN market_stores s ON s.id=l.store_id WHERE s.owner_id=? ORDER BY l.id DESC LIMIT 200`).bind(user.id).all();
  return json({listings:rows.results});
 }
 if(p==='/api/market/rfqs'&&m==='GET'){
  const rows=await db.prepare(`SELECT r.id,r.title,r.description,r.category,r.quantity,r.deadline,r.created_at,u.name buyer_name
   FROM market_rfq r JOIN users u ON u.id=r.buyer_id WHERE r.status='open' ORDER BY r.id DESC LIMIT 100`).all();
  return json({rfqs:rows.results});
 }
 if(p==='/api/market/rfqs'&&m==='POST'){
  member();const b=await parseBody(request);const title=textField(b.title,6,150,'عنوان المنافسة'),description=textField(b.description,20,2500,'تفاصيل الطلب');
  const category=textField(b.category||'عام',1,80,'التصنيف');
  const quantity=b.quantity?positive(b.quantity):null;
  const deadline=b.deadline||null;
  if(deadline&&(!/^\d{4}-\d{2}-\d{2}$/.test(deadline)||deadline<new Date().toISOString().slice(0,10)))throw new ApiError(400,'تاريخ الإغلاق غير صحيح.');
  await db.prepare('INSERT INTO market_rfq(buyer_id,title,description,category,quantity,deadline) VALUES(?,?,?,?,?,?)')
    .bind(user.id,title,description,category,quantity,deadline).run();
  return json({ok:true},201);
 }
 if(p==='/api/market/rfq-bids'&&m==='GET'){
  member();const mode=url.searchParams.get('mode')==='received'?'received':'mine';
  const query=mode==='mine'? `SELECT b.id,b.amount_minor,b.notes,b.status,r.title rfq_title,s.name store_name
    FROM market_rfq_bids b JOIN market_rfq r ON r.id=b.rfq_id JOIN market_stores s ON s.id=b.store_id
    WHERE b.vendor_id=? ORDER BY b.id DESC LIMIT 100`:
    `SELECT b.id,b.amount_minor,b.notes,b.status,r.title rfq_title,s.name store_name
    FROM market_rfq_bids b JOIN market_rfq r ON r.id=b.rfq_id JOIN market_stores s ON s.id=b.store_id
    WHERE r.buyer_id=? ORDER BY b.id DESC LIMIT 100`;
  const rows=await db.prepare(query).bind(user.id).all();return json({bids:rows.results});
 }
 const bid=p.match(/^\/api\/market\/rfqs\/(\d+)\/bids$/);
 if(bid&&m==='POST'){
  member();const id=validateId(bid[1]),b=await parseBody(request),storeId=validateId(b.store_id);
  await storeOwner(storeId);const amount=cents(b.amount_minor),notes=textField(b.notes||'',0,1200,'تفاصيل العرض');
  const rfq=await db.prepare("SELECT buyer_id,status,deadline FROM market_rfq WHERE id=?").bind(id).first();
  if(!rfq||rfq.status!=='open'||rfq.deadline&&rfq.deadline<new Date().toISOString().slice(0,10))throw new ApiError(404,'المنافسة غير مفتوحة.');
  if(rfq.buyer_id===user.id)throw new ApiError(400,'لا يمكن التقديم على منافستك.');
  try{await db.prepare('INSERT INTO market_rfq_bids(rfq_id,store_id,vendor_id,amount_minor,notes) VALUES(?,?,?,?,?)').bind(id,storeId,user.id,amount,notes).run();}
  catch{throw new ApiError(409,'سبق أن تقدمت بهذه المساحة للمنافسة.');}
  return json({ok:true},201);
 }
 const choose=p.match(/^\/api\/market\/rfq-bids\/(\d+)\/select$/);
 if(choose&&m==='PATCH'){
  member();const bidId=validateId(choose[1]);
  const row=await db.prepare('SELECT b.id,b.rfq_id,r.buyer_id,r.status FROM market_rfq_bids b JOIN market_rfq r ON r.id=b.rfq_id WHERE b.id=?').bind(bidId).first();
  if(!row||row.buyer_id!==user.id)throw new ApiError(403,'المنافسة ليست ملكك.');
  if(row.status!=='open')throw new ApiError(409,'المنافسة مغلقة.');
  await db.batch([
   db.prepare("UPDATE market_rfq_bids SET status='rejected' WHERE rfq_id=? AND status='submitted'").bind(row.rfq_id),
   db.prepare("UPDATE market_rfq_bids SET status='selected' WHERE id=?").bind(bidId),
   db.prepare("UPDATE market_rfq SET status='closed' WHERE id=?").bind(row.rfq_id)
  ]);
  return json({ok:true,message:'تم اختيار العرض وإغلاق المنافسة، دون إبرام عقد أو تحصيل مالي.'});
 }
 return null;
}

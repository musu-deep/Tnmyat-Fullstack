// Provider-neutral, authenticated service cores.
// Real AI generation, media delivery, and charging are deliberately disabled until configured and validated.
export async function platformServicesRoute(request,db,user,{json,parseBody,textField,requireUser,ApiError,enforceLimit}){
 const path=new URL(request.url).pathname, url=new URL(request.url),method=request.method;
 if(!path.startsWith('/api/platform/'))return null;
 const modes=['public','members','friends','only_me'];
 const id=()=>crypto.randomUUID();
 const signed=()=>{requireUser(user);if(user.account_status!=='active')throw new ApiError(403,'الحساب غير نشط.');};
 const write=async(scope,limit=30)=>{signed();await enforceLimit(db,'platform-'+scope,user.id,limit,3600);return parseBody(request);};
 const positive=v=>{let n=Number(v);if(!Number.isSafeInteger(n)||n<=0)throw new ApiError(400,'المعرّف غير صحيح.');return n;};
 const getConfig=async(name)=>db.prepare('SELECT service,provider,mode,public_settings FROM tn_service_config WHERE service=?').bind(name).first();
 const participant=async(callId)=>{
  signed();
  const call=await db.prepare('SELECT * FROM tn_call_sessions WHERE id=?').bind(callId).first();
  if(!call||call.caller_id!==user.id&&call.callee_id!==user.id)throw new ApiError(404,'المكالمة غير متاحة.');
  return call;
 };
 if(path==='/api/platform/capabilities'&&method==='GET'){
  const r=await db.prepare('SELECT service,provider,mode FROM tn_service_config ORDER BY service').all();
  return json({capabilities:r.results,services:['ai','live','calls','reels','privacy','payments'],note:'التكاملات الخارجية لا تعمل قبل توصيل مزوديها واختبارها.'});
 }
 // AI conversation history, prompts, and a provider handoff boundary.
 if(path==='/api/platform/ai/threads'&&method==='GET'){
  signed();const r=await db.prepare('SELECT id,title,created_at FROM tn_ai_threads WHERE owner_id=? ORDER BY created_at DESC LIMIT 50').bind(user.id).all();return json({threads:r.results});
 }
 if(path==='/api/platform/ai/threads'&&method==='POST'){
  const b=await write('ai-create',20),title=textField(b.title||'محادثة جديدة',1,120,'عنوان المحادثة'),key=id();
  await db.prepare('INSERT INTO tn_ai_threads(id,owner_id,title) VALUES(?,?,?)').bind(key,user.id,title).run();
  return json({id:key,title},201);
 }
 const ai=path.match(/^\/api\/platform\/ai\/threads\/([0-9a-f-]{36})(?:\/messages)?$/);
 if(ai){signed();const key=ai[1];const thread=await db.prepare('SELECT id,owner_id,title FROM tn_ai_threads WHERE id=? AND owner_id=?').bind(key,user.id).first();if(!thread)throw new ApiError(404,'المحادثة غير متاحة.');
  if(method==='GET'){const r=await db.prepare('SELECT id,role,body,source_refs,created_at FROM tn_ai_messages WHERE thread_id=? ORDER BY id DESC LIMIT 100').bind(key).all();return json({thread,messages:r.results.reverse()});}
  if(method==='POST'&&path.endsWith('/messages')){
   const b=await write('ai-message',60),body=textField(b.body,1,8000,'الرسالة');
   await db.prepare("INSERT INTO tn_ai_messages(thread_id,role,body) VALUES(?,'user',?)").bind(key,body).run();
   return json({saved:true,generated:false,reason:'لم يتم توصيل مزود توليد النصوص. حُفظت الرسالة ويمكن توليد الردود بعد تكامل الخدمة.'},202);
  }
 }
 // Live programming and ownership, with no misleading LIVE state before a signed provider callback.
 if(path==='/api/platform/live'&&method==='GET'){
  const r=await db.prepare("SELECT id,title,description,state,started_at,created_at FROM tn_live_sessions WHERE state='live' ORDER BY created_at DESC LIMIT 30").all();return json({sessions:r.results});
 }
 if(path==='/api/platform/live/mine'&&method==='GET'){
  signed();const r=await db.prepare('SELECT id,title,description,state,created_at FROM tn_live_sessions WHERE owner_id=? ORDER BY created_at DESC LIMIT 100').bind(user.id).all();return json({sessions:r.results});
 }
 if(path==='/api/platform/live'&&method==='POST'){
  const b=await write('live-create',12),title=textField(b.title,5,160,'عنوان البث'),description=textField(b.description||'',0,1000,'وصف البث'),key=id();
  await db.prepare('INSERT INTO tn_live_sessions(id,owner_id,title,description) VALUES(?,?,?,?)').bind(key,user.id,title,description).run();
  return json({id:key,state:'draft',provider_connected:false},201);
 }
 const live=path.match(/^\/api\/platform\/live\/([0-9a-f-]{36})$/);
 if(live&&method==='PATCH'){
  const b=await write('live-update',20);
  const session=await db.prepare('SELECT id,owner_id,state FROM tn_live_sessions WHERE id=?').bind(live[1]).first();
  if(!session||session.owner_id!==user.id)throw new ApiError(404,'البث غير متاح.');
  if(b.state!=='cancelled'||session.state!=='draft')throw new ApiError(409,'يُسمح بإلغاء البث المسودّة فقط قبل ربط مزود البث.');
  await db.prepare("UPDATE tn_live_sessions SET state='cancelled' WHERE id=?").bind(live[1]).run();return json({ok:true});
 }
 // Invitations and signaling records are scoped to both call participants. WebRTC transport is not provided here.
 if(path==='/api/platform/calls'&&method==='POST'){
  const b=await write('call-create',30),callee=positive(b.callee_id),kind=b.kind;
  if(!['audio','video'].includes(kind))throw new ApiError(400,'نوع المكالمة غير صحيح.');
  if(callee===user.id)throw new ApiError(400,'لا يمكنك الاتصال بنفسك.');
  const target=await db.prepare("SELECT id,account_status FROM users WHERE id=? AND password_hash IS NOT NULL").bind(callee).first();
  if(!target||target.account_status!=='active')throw new ApiError(404,'العضو غير متاح.');
  const friends=await db.prepare('SELECT accepted FROM friendships WHERE low_id=? AND high_id=? AND accepted=1').bind(Math.min(user.id,callee),Math.max(user.id,callee)).first();
  if(!friends)throw new ApiError(403,'المكالمات متاحة للأصدقاء فقط.');
  const key=id();await db.prepare('INSERT INTO tn_call_sessions(id,caller_id,callee_id,kind,expires_at) VALUES(?,?,?,?,unixepoch()+120)').bind(key,user.id,callee,kind).run();
  return json({id:key,status:'invited',transport_connected:false},201);
 }
 if(path==='/api/platform/calls'&&method==='GET'){
  signed();const r=await db.prepare("SELECT id,caller_id,callee_id,kind,status,expires_at FROM tn_call_sessions WHERE (caller_id=? OR callee_id=?) AND expires_at>unixepoch() ORDER BY created_at DESC LIMIT 30").bind(user.id,user.id).all();return json({calls:r.results});
 }
 const callAction=path.match(/^\/api\/platform\/calls\/([0-9a-f-]{36})(?:\/(signals))?$/);
 if(callAction){const call=await participant(callAction[1]);
  if(callAction[2]==='signals'){
   if(method==='GET'){const cursor=Math.max(0,Number(url.searchParams.get('after')||0));if(!Number.isSafeInteger(cursor))throw new ApiError(400,'المؤشر غير صحيح.');const r=await db.prepare('SELECT id,sender_id,signal_kind,payload FROM tn_call_signals WHERE session_id=? AND id>? ORDER BY id ASC LIMIT 60').bind(call.id,cursor).all();return json({signals:r.results});}
   if(method==='POST'){const b=await write('call-signal',180);if(call.expires_at<=Math.floor(Date.now()/1000)||!['invited','accepted'].includes(call.status))throw new ApiError(409,'المكالمة منتهية.');
    if(!['offer','answer','candidate','bye'].includes(b.signal_kind))throw new ApiError(400,'نوع الإشارة غير صحيح.');
    const payload=textField(b.payload,1,16000,'رسالة الاتصال');
    await db.prepare('INSERT INTO tn_call_signals(session_id,sender_id,signal_kind,payload) VALUES(?,?,?,?)').bind(call.id,user.id,b.signal_kind,payload).run();return json({ok:true},201);
   }
  }else if(method==='PATCH'){
   const b=await write('call-state',60);
   if(!['accepted','declined','ended'].includes(b.status))throw new ApiError(400,'الحالة غير مدعومة.');
   if(call.expires_at<=Math.floor(Date.now()/1000))throw new ApiError(409,'انتهت الدعوة.');
   if(b.status==='accepted'&&(user.id!==call.callee_id||call.status!=='invited'))throw new ApiError(403,'لا يمكن قبول هذه الدعوة.');
   if(b.status==='declined'&&(user.id!==call.callee_id||call.status!=='invited'))throw new ApiError(403,'لا يمكن رفض هذه الدعوة.');
   if(b.status==='ended'&&!['accepted','invited'].includes(call.status))throw new ApiError(409,'المكالمة مغلقة.');
   await db.prepare("UPDATE tn_call_sessions SET status=?,expires_at=CASE WHEN ?='accepted' THEN unixepoch()+3600 ELSE expires_at END WHERE id=?").bind(b.status,b.status,call.id).run();return json({ok:true});
  }
 }
 // Independent reels catalog: media can only reference a video attached to a post owned by the member.
 if(path==='/api/platform/reels'&&method==='GET'){
  const rows=await db.prepare("SELECT r.id,r.title,r.caption,r.media_key,r.created_at,u.name author FROM tn_reels r JOIN users u ON u.id=r.owner_id WHERE r.status='published' AND r.visibility='public' AND EXISTS(SELECT 1 FROM post_files f JOIN posts p ON p.id=f.post_id WHERE r.media_key='/api/files/'||f.id AND f.mime='video/mp4' AND p.author_id=r.owner_id AND p.moderation_status='visible') ORDER BY r.id DESC LIMIT 40").all();
  return json({reels:rows.results});
 }
 if(path==='/api/platform/reels/mine'&&method==='GET'){
  signed();const rows=await db.prepare('SELECT id,title,caption,media_key,status,visibility FROM tn_reels WHERE owner_id=? ORDER BY id DESC LIMIT 100').bind(user.id).all();return json({reels:rows.results});
 }
 if(path==='/api/platform/reels'&&method==='POST'){
  const b=await write('reel-create',30),title=textField(b.title,3,160,'عنوان المقطع'),caption=textField(b.caption||'',0,1500,'الوصف');
  const key=String(b.media_key||'');
  if(!/^\/api\/files\/[0-9a-f-]{36}$/.test(key))throw new ApiError(400,'اختر فيديو محفوظاً ضمن منشوراتك.');
  const fileId=key.split('/').pop();
  const owned=await db.prepare("SELECT f.id FROM post_files f JOIN posts p ON p.id=f.post_id WHERE f.id=? AND f.mime='video/mp4' AND p.author_id=? AND p.moderation_status='visible'").bind(fileId,user.id).first();
  if(!owned)throw new ApiError(403,'الفيديو غير متاح في منشوراتك.');
  const visibility=['public','followers','private'].includes(b.visibility)?b.visibility:'private';
  const result=await db.prepare("INSERT INTO tn_reels(owner_id,title,caption,media_key,visibility,status) VALUES(?,?,?,?,?,'draft') RETURNING id").bind(user.id,title,caption,key,visibility).first();
  return json({id:result.id,status:'draft'},201);
 }
 const reel=path.match(/^\/api\/platform\/reels\/(\d+)$/);
 if(reel&&method==='PATCH'){
  const b=await write('reel-update',40);
  const row=await db.prepare('SELECT id,owner_id,status FROM tn_reels WHERE id=?').bind(positive(reel[1])).first();
  if(!row||row.owner_id!==user.id)throw new ApiError(404,'المقطع غير متاح.');
  if(!['draft','published','archived'].includes(b.status))throw new ApiError(400,'حالة المقطع غير صحيحة.');
  if(row.status==='archived'&&b.status!=='archived')throw new ApiError(409,'المقطع مؤرشف.');
  await db.prepare('UPDATE tn_reels SET status=? WHERE id=?').bind(b.status,row.id).run();return json({ok:true});
 }
 // Field-level profile privacy, with visibility enforced when data is read by others.
 if(path==='/api/platform/privacy'&&method==='GET'){
  signed();const row=await db.prepare('SELECT * FROM tn_profile_privacy WHERE user_id=?').bind(user.id).first();return json({privacy:row||{bio_scope:'public',birthday_scope:'only_me',events_scope:'only_me',professional_scope:'members',date_of_birth:null,private_events:[]}});
 }
 if(path==='/api/platform/privacy'&&method==='PUT'){
  const b=await write('privacy-update',30);
  const fields=['bio_scope','birthday_scope','events_scope','professional_scope'];
  for(const f of fields)if(!modes.includes(b[f]))throw new ApiError(400,'صلاحية عرض '+f+' غير صحيحة.');
  let dob=b.date_of_birth||null;
  if(dob&&(!/^\d{4}-\d{2}-\d{2}$/.test(dob)||Number.isNaN(Date.parse(dob))||dob>new Date().toISOString().slice(0,10)))throw new ApiError(400,'تاريخ الميلاد غير صحيح.');
  const events=b.private_events||[];
  if(!Array.isArray(events)||events.length>10||events.some(e=>typeof e!=='string'||e.length>100))throw new ApiError(400,'المناسبات غير صحيحة.');
  await db.prepare(`INSERT INTO tn_profile_privacy(user_id,bio_scope,birthday_scope,events_scope,professional_scope,date_of_birth,private_events)
   VALUES(?,?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET bio_scope=excluded.bio_scope,birthday_scope=excluded.birthday_scope,
   events_scope=excluded.events_scope,professional_scope=excluded.professional_scope,date_of_birth=excluded.date_of_birth,
   private_events=excluded.private_events,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')`).bind(user.id,...fields.map(f=>b[f]),dob,JSON.stringify(events)).run();
  return json({ok:true});
 }
 // Orders are internal drafts; money is never charged or marked paid by a client request.
 if(path==='/api/platform/payments/policy'){
  signed();
  if(user.role!=='admin')throw new ApiError(403,'سياسة العمولات من اختصاص الإدارة.');
  if(method==='GET'){
   const p=await db.prepare('SELECT commission_basis_points,fixed_commission_minor,updated_at FROM tn_payment_policies WHERE id=1').first();
   return json({policy:p});
  }
  if(method==='PUT'){
   const b=await write('commission-policy',10);
   const basis=Number(b.commission_basis_points),fixed=Number(b.fixed_commission_minor);
   if(!Number.isSafeInteger(basis)||basis<0||basis>5000||!Number.isSafeInteger(fixed)||fixed<0||fixed>10000000)throw new ApiError(400,'سياسة العمولة غير صحيحة.');
   await db.prepare("UPDATE tn_payment_policies SET commission_basis_points=?,fixed_commission_minor=?,updated_by=?,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=1").bind(basis,fixed,user.id).run();
   return json({ok:true,policy:{commission_basis_points:basis,fixed_commission_minor:fixed}});
  }
 }
 if(path==='/api/platform/payments/orders'&&method==='GET'){
  signed();const rows=await db.prepare('SELECT id,buyer_id,seller_id,subtotal_minor,commission_minor,currency,status,description,created_at FROM tn_checkout_orders WHERE buyer_id=? OR seller_id=? ORDER BY created_at DESC LIMIT 100').bind(user.id,user.id).all();
  return json({orders:rows.results});
 }
 if(path==='/api/platform/payments/orders'&&method==='POST'){
  const b=await write('order-draft',20),seller=positive(b.seller_id),amount=Number(b.subtotal_minor),description=textField(b.description||'',0,500,'وصف الطلب');
  if(seller===user.id)throw new ApiError(400,'لا يمكنك شراء منتجك.');
  if(!Number.isSafeInteger(amount)||amount<0||amount>100000000000)throw new ApiError(400,'القيمة غير صحيحة.');
  const valid=await db.prepare("SELECT id FROM users WHERE id=? AND password_hash IS NOT NULL AND account_status='active'").bind(seller).first();
  if(!valid)throw new ApiError(404,'البائع غير متاح.');
  const policy=await db.prepare('SELECT commission_basis_points,fixed_commission_minor FROM tn_payment_policies WHERE id=1').first();
  const commission=Math.min(amount,Math.floor(amount*policy.commission_basis_points/10000)+policy.fixed_commission_minor);
  const key=id();
  await db.prepare("INSERT INTO tn_checkout_orders(id,buyer_id,seller_id,subtotal_minor,commission_minor,description,status) VALUES(?,?,?,?,?,?,'draft')")
   .bind(key,user.id,seller,amount,commission,description).run();
  return json({id:key,status:'draft',charged:false,commission_minor:commission},201);
 }
 return null;
}

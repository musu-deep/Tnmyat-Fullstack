// Curated development information and moderated geospatial submissions.
// Nothing becomes public without an explicit published status.
const categories = new Set(['international_day','conference','local_event','program']);
const projectStages = new Set(['planned','active','completed']);
const knownCategories = new Set(['التعليم','البيئة','المجتمع','الاقتصاد','الصحة','البنية التحتية','المياه','الطاقة','التقنية','أخرى']);
const statuses = new Set(['published','rejected']);
const ymd=/^\d{4}-\d{2}-\d{2}$/;
function calendarDate(value, ApiError){
 if(typeof value!=='string'||!ymd.test(value))throw new ApiError(400,'أدخل التاريخ بصيغة YYYY-MM-DD.');
 const [y,m,d]=value.split('-').map(Number);
 const dt=new Date(Date.UTC(y,m-1,d));
 if(dt.getUTCFullYear()!==y||dt.getUTCMonth()!==m-1||dt.getUTCDate()!==d)throw new ApiError(400,'تاريخ غير صحيح.');
 return value;
}
function link(value,ApiError,optional=true){
 if(optional && !value)return '';
 if(typeof value!=='string'||value.length>1200)throw new ApiError(400,'رابط المصدر غير صالح.');
 try {const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password)throw Error();return u.href;}
 catch{throw new ApiError(400,'يجب إدخال رابط HTTPS صالح للمصدر.');}
}
function safeNumber(value,min,max,field,ApiError){
 const n=Number(value);if(value===null||value===undefined||value===''||!Number.isFinite(n)||n<min||n>max)throw new ApiError(400,field+' غير صالح.');return n;
}
const requireAdmin=(user,ApiError)=>{if(user?.role!=='admin')throw new ApiError(403,'هذا الإجراء مخصص لإدارة تنميات.');};
async function audit(db,user,verb,kind,id,reason){
 await db.prepare('INSERT INTO development_audit(actor_id,action,target_type,target_id,reason) VALUES(?,?,?,?,?)').bind(user.id,verb,kind,id,reason).run();
}
export async function developmentHubRoute(request,db,user,helpers){
 const {json,parseBody,textField,requireUser,ApiError,enforceLimit}=helpers;
 const url=new URL(request.url),path=url.pathname,method=request.method;
 if(!path.startsWith('/api/hub/'))return null;
 if(path==='/api/hub/events'&&method==='GET'){
   const year=safeNumber(url.searchParams.get('year')||new Date().getUTCFullYear(),2020,2100,'السنة',ApiError);
   const {results}=await db.prepare(`SELECT id,title,description,category,event_date,end_date,recurring,country,location,source_url FROM development_events
     WHERE status='published' AND (substr(event_date,1,4)=? OR recurring=1)
     ORDER BY substr(event_date,6,5),title LIMIT 500`).bind(String(year)).all();
   return json({events:results.map(e=>({...e,event_date:e.recurring?String(year)+e.event_date.slice(4):e.event_date,
     end_date:e.recurring&&e.end_date?String(year)+e.end_date.slice(4):e.end_date}))});
 }
 if(path==='/api/hub/projects'&&method==='GET'){
   const category=textField(url.searchParams.get('category')||'',0,40,'التصنيف');
   const country=textField(url.searchParams.get('country')||'',0,80,'الدولة');
   const {results}=await db.prepare(`SELECT p.id,p.title,p.summary,p.category,p.entity_name,p.country,p.city,p.latitude,p.longitude,
    p.beneficiaries,p.budget,p.stage,p.source_url,p.created_at,u.name AS owner FROM development_projects p
    JOIN users u ON u.id=p.owner_id WHERE p.status='published' AND (?='' OR p.category=?) AND (?='' OR p.country=?)
    ORDER BY p.id DESC LIMIT 500`).bind(category,category,country,country).all();
   return json({projects:results,summary:{total:results.length,beneficiaries:results.reduce((s,p)=>s+p.beneficiaries,0),
    active:results.filter(p=>p.stage==='active').length,countries:new Set(results.map(p=>p.country)).size}});
 }
 if(path==='/api/hub/news'&&method==='GET'){
   const {results}=await db.prepare(`SELECT id,headline,source_name,source_url,lane,category,published_at FROM development_news
      WHERE status='published' ORDER BY published_at DESC,id DESC LIMIT 50`).all();
   return json({news:results});
 }
 if(path==='/api/hub/projects/mine'&&method==='GET'){
   requireUser(user);const {results}=await db.prepare(`SELECT id,title,summary,category,country,city,stage,status,created_at
     FROM development_projects WHERE owner_id=? ORDER BY id DESC LIMIT 100`).bind(user.id).all();return json({projects:results});
 }
 if(path==='/api/hub/projects'&&method==='POST'){
   requireUser(user);await enforceLimit(db,'map-project',user.id,10,3600);
   const d=await parseBody(request),category=textField(d.category,2,40,'المجال');
   if(!knownCategories.has(category))throw new ApiError(400,'مجال المشروع غير مدعوم.');
   const title=textField(d.title,4,110,'اسم المشروع'),summary=textField(d.summary,20,1500,'وصف المشروع');
   const country=textField(d.country,2,80,'الدولة'),city=textField(d.city||'',0,80,'المدينة');
   const entity=textField(d.entity_name||'',0,120,'الجهة');
   const latitude=safeNumber(d.latitude,-90,90,'خط العرض',ApiError),longitude=safeNumber(d.longitude,-180,180,'خط الطول',ApiError);
   const beneficiaries=safeNumber(d.beneficiaries??0,0,1000000000,'عدد المستفيدين',ApiError);
   const budget=safeNumber(d.budget??0,0,1000000000000,'الميزانية',ApiError);
   if(!Number.isSafeInteger(beneficiaries))throw new ApiError(400,'عدد المستفيدين يجب أن يكون عدداً صحيحاً.');
   if(!projectStages.has(d.stage))throw new ApiError(400,'مرحلة المشروع غير صحيحة.');
   const source=link(d.source_url,ApiError);
   const row=await db.prepare(`INSERT INTO development_projects
    (owner_id,title,summary,category,entity_name,country,city,latitude,longitude,beneficiaries,budget,stage,source_url)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id`).bind(user.id,title,summary,category,entity,country,city,latitude,longitude,beneficiaries,budget,d.stage,source).first();
   return json({id:row.id,status:'pending',message:'استلمنا المشروع، وسيظهر بعد المراجعة الإدارية.'},201);
 }
 if(path==='/api/hub/admin/queue'&&method==='GET'){
   requireAdmin(user,ApiError);
   const {results}=await db.prepare(`SELECT p.id,p.title,p.summary,p.category,p.country,p.city,p.latitude,p.longitude,p.status,u.name AS owner
    FROM development_projects p JOIN users u ON u.id=p.owner_id WHERE p.status='pending' ORDER BY p.id LIMIT 100`).all();
   return json({projects:results});
 }
 const review=path.match(/^\/api\/hub\/admin\/projects\/(\d+)$/);
 if(review&&method==='PATCH'){
   requireAdmin(user,ApiError);const d=await parseBody(request);if(!statuses.has(d.status))throw new ApiError(400,'قرار المراجعة غير صالح.');
   const reason=textField(d.reason,8,500,'مبرر القرار');
   const result=await db.prepare(`UPDATE development_projects SET status=?,reviewed_by=?,reviewed_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE id=? AND status='pending'`).bind(d.status,user.id,Number(review[1])).run();
   if(!result.meta.changes)throw new ApiError(404,'لم نعثر على مشروع قيد المراجعة.');
   await audit(db,user,d.status==='published'?'publish':'reject','development_project',Number(review[1]),reason);
   return json({ok:true});
 }
 const hideEntry=path.match(/^\/api\/hub\/admin\/(events|news)\/(\d+)$/);
 if(hideEntry&&method==='PATCH'){
   requireAdmin(user,ApiError);
   const kind=hideEntry[1],id=Number(hideEntry[2]);
   const body=await parseBody(request);
   const reason=textField(body.reason,8,300,'مبرر السحب');
   const table=kind==='events'?'development_events':'development_news';
   const result=await db.prepare(`UPDATE ${table} SET status='rejected' WHERE id=? AND status='published'`).bind(id).run();
   if(!result.meta.changes)throw new ApiError(404,'السجل غير متاح للسحب.');
   await audit(db,user,'unpublish',kind==='events'?'development_event':'development_news',id,reason);
   return json({ok:true});
 }
 if(path==='/api/hub/admin/events'&&method==='POST'){
   requireAdmin(user,ApiError);const d=await parseBody(request);
   if(!categories.has(d.category))throw new ApiError(400,'فئة الفعالية غير صحيحة.');
   const day=calendarDate(d.event_date,ApiError),end=d.end_date?calendarDate(d.end_date,ApiError):null;
   if(end&&end<day)throw new ApiError(400,'تاريخ الانتهاء يسبق البداية.');
   const recurring=d.recurring===true?1:0;
   if(recurring&&end)throw new ApiError(400,'التكرار السنوي متاح لليوم الواحد فقط.');
   const row=await db.prepare(`INSERT INTO development_events(title,description,category,event_date,end_date,recurring,country,location,source_url,created_by)
     VALUES(?,?,?,?,?,?,?,?,?,?) RETURNING id`).bind(textField(d.title,3,160,'العنوان'),textField(d.description||'',0,1000,'الوصف'),d.category,
     day,end,recurring,textField(d.country||'',0,80,'الدولة'),textField(d.location||'',0,150,'الموقع'),link(d.source_url,ApiError),user.id).first();
   await audit(db,user,'publish','development_event',row.id,'نشر فعالية في التقويم');return json({id:row.id},201);
 }
 if(path==='/api/hub/admin/news'&&method==='POST'){
   requireAdmin(user,ApiError);const d=await parseBody(request);
   const lane=safeNumber(d.lane,1,2,'مسار الأخبار',ApiError),day=calendarDate(d.published_at,ApiError);
   const source=link(d.source_url,ApiError,false);
   const row=await db.prepare(`INSERT INTO development_news(headline,source_name,source_url,lane,category,published_at,created_by)
    VALUES(?,?,?,?,?,?,?) RETURNING id`).bind(textField(d.headline,8,180,'العنوان'),textField(d.source_name,2,90,'المصدر'),source,lane,
    textField(d.category||'تنمية',2,60,'المجال'),day,user.id).first();
   await audit(db,user,'publish','development_news',row.id,'نشر خبر موثق المصدر');return json({id:row.id},201);
 }
 return null;
}

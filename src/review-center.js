// A single status source for the member and admin; existing moderation decisions remain in their owning services.
export async function reviewCenterRoute(request,db,user,{json,requireUser,ApiError}){
 const url=new URL(request.url),path=url.pathname,method=request.method;
 if(!path.startsWith('/api/review-center/'))return null;
 requireUser(user);
 if(method!=='GET')return null;
 if(path==='/api/review-center/mine'){
  const uid=user.id;
  const parts=await Promise.all([
   db.prepare(`SELECT id,COALESCE(NULLIF(title,''),substr(body,1,110),'منشور') AS title,moderation_status AS status,created_at
     FROM posts WHERE author_id=? ORDER BY id DESC LIMIT 60`).bind(uid).all(),
   db.prepare('SELECT id,title,status,created_at FROM development_projects WHERE owner_id=? ORDER BY id DESC LIMIT 60').bind(uid).all(),
   db.prepare('SELECT id,title,status,created_at FROM development_opportunities WHERE owner_id=? ORDER BY id DESC LIMIT 60').bind(uid).all(),
   db.prepare('SELECT id,title,status,created_at FROM development_needs WHERE owner_id=? ORDER BY id DESC LIMIT 60').bind(uid).all(),
   db.prepare('SELECT id,name AS title,status,created_at FROM development_organizations WHERE owner_id=? ORDER BY id DESC LIMIT 60').bind(uid).all(),
   db.prepare(`SELECT a.opportunity_id AS id,o.title,a.status,a.created_at FROM opportunity_applications a
     JOIN development_opportunities o ON o.id=a.opportunity_id WHERE a.applicant_id=? ORDER BY a.created_at DESC LIMIT 60`).bind(uid).all()
  ]);
  const kinds=['post','project','opportunity','need','organization','application'];
  const items=parts.flatMap((part,i)=>part.results.map(r=>({...r,kind:kinds[i]})));
  items.sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')));
  return json({items:items.slice(0,140),summary:{pending:items.filter(x=>x.status==='pending'||x.status==='unverified').length}});
 }
 if(path==='/api/review-center/queue'){
  if(user.role!=='admin')throw new ApiError(403,'قائمة المراجعة للإدارة فقط.');
  const lists=await Promise.all([
   db.prepare(`SELECT p.id,p.title,p.summary AS description,p.created_at,u.name AS owner,'project' AS kind
      FROM development_projects p JOIN users u ON u.id=p.owner_id WHERE p.status='pending' ORDER BY p.id DESC LIMIT 100`).all(),
   db.prepare(`SELECT n.id,n.title,n.description,n.created_at,u.name AS owner,'need' AS kind
      FROM development_needs n JOIN users u ON u.id=n.owner_id WHERE n.status='pending' ORDER BY n.id DESC LIMIT 100`).all(),
   db.prepare(`SELECT o.id,o.title,o.description,o.created_at,u.name AS owner,'opportunity' AS kind
      FROM development_opportunities o JOIN users u ON u.id=o.owner_id WHERE o.status='pending' ORDER BY o.id DESC LIMIT 100`).all(),
   db.prepare(`SELECT o.id,o.name AS title,o.description,o.created_at,u.name AS owner,'organization' AS kind
      FROM development_organizations o JOIN users u ON u.id=o.owner_id WHERE o.status='unverified' ORDER BY o.id DESC LIMIT 100`).all(),
   db.prepare(`SELECT o.id,o.metric AS title,COALESCE(o.context,'') AS description,o.evidence_url,o.created_at,u.name AS owner,'outcome' AS kind
      FROM project_outcomes o JOIN users u ON u.id=o.created_by WHERE o.verification='self_reported' ORDER BY o.id DESC LIMIT 100`).all(),
   db.prepare(`SELECT p.id,COALESCE(NULLIF(p.title,''),substr(p.body,1,100),'منشور') AS title,
       substr(p.body,1,350) AS description,p.created_at,u.name AS owner,'post' AS kind
       FROM posts p JOIN users u ON u.id=p.author_id WHERE p.moderation_status='pending'
       ORDER BY p.id DESC LIMIT 100`).all()
  ]);
  const items=lists.flatMap(r=>r.results).sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')));
  const kinds=['project','need','opportunity','organization','outcome','post'];
  return json({items,counts:Object.fromEntries(kinds.map((k,i)=>[k,lists[i].results.length]))});
 }
 return null;
}

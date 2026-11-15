// Images are served as binary content. The API never returns large data URLs in feeds.
export function validateImage(value, ApiError, limit=250*1024) {
  if (value === null || value === undefined || value === '') return null;
  const invalid = () => new ApiError(400,'اختر صورة PNG أو JPEG أو WebP سليمة ضمن الحجم المسموح.');
  if (typeof value !== 'string' || value.length > Math.ceil(limit/3)*4+30) throw invalid();
  const match = /^data:image\/(jpeg|png|webp);base64,([a-zA-Z0-9+/]+={0,2})$/.exec(value);
  if (!match) throw invalid();
  let binary;
  try { binary=atob(match[2]); } catch { throw invalid(); }
  if (binary.length<22 || binary.length>limit) throw invalid();
  const bytes = new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
  const view = new DataView(bytes.buffer);
  let width = 0;
  let height = 0;
  if (match[1]==='png' && bytes.length>=45 && view.getUint32(0)===0x89504e47 &&
      view.getUint32(4)===0x0d0a1a0a && view.getUint32(8)===13 &&
      binary.slice(12,16)==='IHDR' && binary.slice(-8,-4)==='IEND') {
    width=view.getUint32(16); height=view.getUint32(20);
  } else if (match[1]==='jpeg' && view.getUint16(0)===0xffd8 && view.getUint16(bytes.length-2)===0xffd9) {
    // Read dimensions from a Start Of Frame segment before the compressed scan.
    let i=2;
    while (i+4<bytes.length && bytes[i]===0xff) {
      while (bytes[i]===0xff) i++;
      const marker=bytes[i++];
      if (marker===0xda || i+2>bytes.length) break;
      const size=view.getUint16(i);
      if (size<2 || i+size>bytes.length) break;
      if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker) && size>=8) {
        height=view.getUint16(i+3); width=view.getUint16(i+5); break;
      }
      i+=size;
    }
  } else if (match[1]==='webp' && binary.startsWith('RIFF') && binary.slice(8,12)==='WEBP' && view.getUint32(4,true)+8===bytes.length) {
    const chunk=binary.slice(12,16);
    if (chunk==='VP8X' && bytes.length>=30) {
      width=1+bytes[24]+256*bytes[25]+65536*bytes[26]; height=1+bytes[27]+256*bytes[28]+65536*bytes[29];
    } else if (chunk==='VP8L' && bytes.length>=25 && bytes[20]===0x2f) {
      const bits=view.getUint32(21,true);
      width=1+(bits & 0x3fff); height=1+((bits>>>14) & 0x3fff);
    } else if (chunk==='VP8 ' && bytes.length>=30 && binary.slice(23,26)==='\x9d\x01\x2a') {
      width=view.getUint16(26,true)&0x3fff; height=view.getUint16(28,true)&0x3fff;
    }
  }
  if (!width || !height || width>8192 || height>8192 || width*height>20000000) throw invalid();
  return {bytes,mime:'image/'+match[1]};
}

const personFields = `u.id,u.name,u.bio,u.cover_position,
  CASE WHEN u.cover_version IS NOT NULL THEN '/api/media/cover/'||u.id||'?v='||u.cover_version END AS cover,
  CASE WHEN u.avatar_version IS NOT NULL THEN '/api/media/avatar/'||u.id||'?v='||u.avatar_version END AS avatar,
  COALESCE(u.last_seen>unixepoch()-180,0) AS online,
  (u.password_hash IS NOT NULL AND viewer.id>0 AND viewer.id<>u.id) AS can_message,
  EXISTS(SELECT 1 FROM follows f WHERE f.follower=viewer.id AND f.followed=u.id) AS following,
  CASE WHEN fr.accepted=1 THEN 'friends' WHEN fr.requester=viewer.id THEN 'outgoing'
       WHEN fr.requester IS NOT NULL THEN 'incoming' ELSE 'none' END AS friend_status`;
const personFrom = ` FROM users u CROSS JOIN (SELECT ? AS id) viewer
  LEFT JOIN friendships fr ON fr.low_id=min(u.id,viewer.id) AND fr.high_id=max(u.id,viewer.id)`;
function personView(person) {
  return {...person,online:Boolean(person.online),following:Boolean(person.following),can_message:Boolean(person.can_message)};
}
async function profileFor(db,viewer,id) {
  const person = await db.prepare('SELECT '+personFields+`,
    (SELECT count(*) FROM posts p WHERE p.author_id=u.id) AS posts_count,
    (SELECT count(*) FROM comments c WHERE c.author_id=u.id) AS comments_count,
    (SELECT count(*) FROM likes l JOIN posts p ON p.id=l.post_id WHERE p.author_id=u.id) AS received_likes_count,
    (SELECT count(*) FROM reposts r WHERE r.user_id=u.id) AS reposts_count,
    (SELECT count(*) FROM follows f WHERE f.followed=u.id) AS followers_count,
    (SELECT count(*) FROM follows f WHERE f.follower=u.id) AS following_count,
    (SELECT count(*) FROM friendships s WHERE s.accepted=1 AND (s.low_id=u.id OR s.high_id=u.id)) AS friends_count`+
    personFrom+' WHERE u.id=?').bind(viewer,id).first();
  return person ? personView(person) : null;
}
const peerFields = `u.id,u.name,CASE WHEN u.avatar_version IS NOT NULL
  THEN '/api/media/avatar/'||u.id||'?v='||u.avatar_version END AS avatar`;

export async function socialRoute(request,db,user,helpers) {
  const {ApiError,json,parseBody,textField,requireUser,enforceLimit}=helpers;
  const url=new URL(request.url);
  const path=url.pathname;
  const method=request.method;
  const viewer=user?.id ?? 0;
  const media=path.match(/^\/api\/media\/(avatar|cover|post)\/(\d+)$/);
  if (media && (method==='GET' || method==='HEAD')) {
    const sql=media[1]==='avatar'?'SELECT avatar_bytes AS bytes,avatar_mime AS mime FROM users WHERE id=?':media[1]==='cover'?'SELECT cover_bytes AS bytes,cover_mime AS mime FROM users WHERE id=?':'SELECT image_bytes AS bytes,image_mime AS mime FROM posts WHERE id=?';
    const image=await db.prepare(sql).bind(media[2]).first();
    if (!image?.bytes) throw new ApiError(404,'لم نعثر على الصورة.');
    return new Response(method==='HEAD'?null:(image.bytes instanceof ArrayBuffer ? new Uint8Array(image.bytes) : Uint8Array.from(image.bytes)),{headers:{
      'Content-Type':image.mime,'Cache-Control':'public, max-age=300','X-Content-Type-Options':'nosniff',
      'Content-Security-Policy':"default-src 'none'; sandbox"
    }});
  }
  if (path==='/api/heartbeat' && method==='POST') {
    requireUser(user);
    await db.prepare('UPDATE users SET last_seen=unixepoch() WHERE id=? AND (last_seen IS NULL OR last_seen<unixepoch()-25)').bind(viewer).run();
    return json({ok:true});
  }
  if (path==='/api/me/profile' && method==='PATCH') {
    requireUser(user);
    await enforceLimit(db,'profile',viewer,40,3600);
    const data=await parseBody(request);
    const updates=[];
    const args=[];
    if ('name' in data) { updates.push('name=?'); args.push(textField(data.name,2,60,'الاسم')); }
    if ('bio' in data) { updates.push('bio=?'); args.push(textField(data.bio,0,500,'النبذة')); }
    if ('avatar' in data) {
      const image=validateImage(data.avatar,ApiError);
      updates.push('avatar_bytes=?','avatar_mime=?','avatar_version=?');
      args.push(image?.bytes ?? null,image?.mime ?? null,image?crypto.randomUUID():null);
    }
    if ('cover' in data) {
      const image=validateImage(data.cover,ApiError,350*1024);
      updates.push('cover_bytes=?','cover_mime=?','cover_version=?');
      args.push(image?.bytes ?? null,image?.mime ?? null,image?crypto.randomUUID():null);
    }
    if ('cover_position' in data) {
      const position=data.cover_position;
      if (!Number.isInteger(position)||position<0||position>100) throw new ApiError(400,'موضع الغلاف يجب أن يكون بين 0 و100.');
      updates.push('cover_position=?');args.push(position);
    }
    if (!updates.length) throw new ApiError(400,'حدد البيانات المطلوب تعديلها.');
    await db.prepare('UPDATE users SET '+updates.join(',')+' WHERE id=?').bind(...args,viewer).run();
    const profile=await profileFor(db,viewer,viewer);
    return json({user:{...profile,role:user.role}});
  }
  const profileMatch=path.match(/^\/api\/profiles\/(\d+)$/);
  if (profileMatch && method==='GET') {
    const profile=await profileFor(db,viewer,Number(profileMatch[1]));
    if (!profile) throw new ApiError(404,'لم نعثر على العضو.');
    return json({profile});
  }
  if (path==='/api/people' && method==='GET') {
    const filter=url.searchParams.get('filter') || 'all';
    const q=textField(url.searchParams.get('q') || '',0,160,'عبارة البحث');
    const page=Number(url.searchParams.get('page') || 1);
    if (!Number.isSafeInteger(page) || page<1 || page>1000000) throw new ApiError(400,'رقم الصفحة غير صالح.');
    const filters={
      all:'1',online:'u.last_seen>unixepoch()-180',friends:'fr.accepted=1',
      followers:'EXISTS(SELECT 1 FROM follows f WHERE f.follower=u.id AND f.followed=viewer.id)',
      following:'EXISTS(SELECT 1 FROM follows f WHERE f.follower=viewer.id AND f.followed=u.id)',
      requests:'fr.accepted=0 AND fr.requester=u.id'
    };
    if (!Object.hasOwn(filters,filter)) throw new ApiError(400,'تصفية الأعضاء غير معروفة.');
    if (filter!=='all' && filter!=='online') requireUser(user);
    const {results}=await db.prepare('SELECT '+personFields+personFrom+' WHERE u.id<>viewer.id AND '+filters[filter]+
      ' AND instr(lower(u.name),lower(?))>0 ORDER BY online DESC,u.id DESC LIMIT 25 OFFSET ?').bind(viewer,q,24*(page-1)).all();
    return json({people:results.slice(0,24).map(personView),hasMore:results.length>24});
  }
  const relation=path.match(/^\/api\/people\/(\d+)\/(follow|friend)$/);
  if (relation && method==='PUT') {
    requireUser(user);
    const target=Number(relation[1]);
    if (target===viewer) throw new ApiError(400,'اختر عضوًا آخر.');
    const person=await db.prepare('SELECT password_hash IS NOT NULL AS member FROM users WHERE id=?').bind(target).first();
    if (!person) throw new ApiError(404,'لم نعثر على العضو.');
    await enforceLimit(db,'relationships',viewer,160,3600);
    const data=await parseBody(request);
    if (relation[2]==='follow') {
      if (typeof data.following!=='boolean') throw new ApiError(400,'قيمة المتابعة غير صالحة.');
      await db.prepare(data.following?'INSERT INTO follows VALUES(?,?) ON CONFLICT DO NOTHING':'DELETE FROM follows WHERE follower=? AND followed=?').bind(viewer,target).run();
    } else {
      if (!person.member) throw new ApiError(400,'هذا الحساب لا يستقبل طلبات الصداقة.');
      const low=Math.min(viewer,target),high=Math.max(viewer,target);
      if (data.action==='remove') {
        await db.prepare('DELETE FROM friendships WHERE low_id=? AND high_id=?').bind(low,high).run();
      } else if (data.action==='request') {
        // Reciprocal requests become an accepted friendship atomically.
        await db.prepare(`INSERT INTO friendships(low_id,high_id,requester) VALUES(?,?,?)
          ON CONFLICT(low_id,high_id) DO UPDATE SET accepted=1 WHERE friendships.requester<>excluded.requester`).bind(low,high,viewer).run();
      } else if (data.action==='accept') {
        const row=await db.prepare('UPDATE friendships SET accepted=1 WHERE low_id=? AND high_id=? AND (requester=? OR accepted=1) RETURNING accepted').bind(low,high,target).first();
        if (!row) throw new ApiError(409,'لا يوجد طلب وارد لهذا العضو.');
      } else throw new ApiError(400,'إجراء الصداقة غير صالح.');
    }
    return json({ok:true});
  }
  if (path==='/api/messages' && method==='GET') {
    requireUser(user);
    // Rank inside each member pair. No other members' messages enter this query.
    const {results}=await db.prepare(`WITH mine AS (
      SELECT id,body,created_at,CASE WHEN sender_id=? THEN recipient_id ELSE sender_id END AS peer_id,
      CASE WHEN recipient_id=? AND seen=0 THEN 1 ELSE 0 END AS is_unread
      FROM messages WHERE sender_id=? OR recipient_id=?
    ), ranked AS (
      SELECT *, row_number() OVER(PARTITION BY peer_id ORDER BY id DESC) AS rank,
        sum(is_unread) OVER(PARTITION BY peer_id) AS unread FROM mine
    )
    SELECT `+peerFields+`,r.body AS last_body,r.created_at,r.unread FROM ranked r JOIN users u ON u.id=r.peer_id
    WHERE r.rank=1 ORDER BY r.id DESC`).bind(viewer,viewer,viewer,viewer).all();
    return json({conversations:results.map(({id,name,avatar,...latest})=>({peer:{id,name,avatar},...latest}))});
  }
  const convo=path.match(/^\/api\/messages\/(\d+)$/);
  if (convo && (method==='GET' || method==='POST')) {
    requireUser(user);
    const peerId=Number(convo[1]);
    if (peerId===viewer) throw new ApiError(400,'اختر عضوًا آخر.');
    const peer=await db.prepare('SELECT '+peerFields+' FROM users u WHERE id=? AND password_hash IS NOT NULL').bind(peerId).first();
    if (!peer) throw new ApiError(404,'هذا العضو غير متاح للمراسلة.');
    if (method==='POST') {
      const data=await parseBody(request);
      const body=textField(data.body,1,2000,'الرسالة');
      await enforceLimit(db,'message',viewer,180,3600);
      const message=await db.prepare('INSERT INTO messages(sender_id,recipient_id,body) VALUES(?,?,?) RETURNING id,sender_id,recipient_id,body,created_at').bind(viewer,peer.id,body).first();
      return json({message},201);
    }
    const before=Number(url.searchParams.get('before') || Number.MAX_SAFE_INTEGER);
    if (!Number.isSafeInteger(before) || before<=0) throw new ApiError(400,'مؤشر الرسائل غير صحيح.');
    const {results}=await db.prepare(`SELECT id,sender_id,recipient_id,body,created_at FROM messages
      WHERE ((sender_id=? AND recipient_id=?) OR (sender_id=? AND recipient_id=?)) AND id<? ORDER BY id DESC LIMIT 51`
    ).bind(viewer,peer.id,peer.id,viewer,before).all();
    const messages=results.slice(0,50).reverse();
    if (messages.length) await db.prepare('UPDATE messages SET seen=1 WHERE sender_id=? AND recipient_id=? AND seen=0 AND id BETWEEN ? AND ?')
      .bind(peer.id,viewer,messages[0].id,messages[messages.length-1].id).run();
    return json({peer,messages,hasMore:results.length>50});
  }
  return null;
}

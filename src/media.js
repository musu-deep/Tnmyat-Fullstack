// Store independently decodable slices below the D1 row-size limit.
const partBytes=192*1024;
const partChars=partBytes/3*4;
const maxFile=6*1024*1024;
const maxTotal=10*1024*1024;

function decodeFile(file,helpers) {
  const {ApiError,validateImage,textField}=helpers;
  const invalid=()=>new ApiError(400,'صيغة المرفق أو محتواه غير صالح.');
  if(!file||typeof file.data!=='string')throw invalid();
  const name=textField(file.name,1,150,'اسم الملف');
  if(/[\x00-\x1f\x7f\\/]/.test(name))throw invalid();
  const match=/^data:(image\/(?:png|jpeg|webp)|audio\/mpeg|video\/mp4|application\/pdf);base64,/.exec(file.data);
  if(!match)throw invalid();
  const mime=match[1],data=file.data.slice(match[0].length);
  if(data.length>Math.ceil(maxFile/3)*4)throw new ApiError(413,'الحد الأقصى للملف 6 ميغابايت.');
  if(data.length%4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(data))throw invalid();
  const size=data.length/4*3-(data.endsWith('==')?2:data.endsWith('=')?1:0);
  if(!size||size>maxFile)throw invalid();
  if(mime.startsWith('image/')){
    validateImage(file.data,ApiError,maxFile);
  }else{
    const head=atob(data.slice(0,128));
    const tail=atob(data.slice(-256));
    if(mime==='video/mp4' && !(head.slice(4,8)==='ftyp'&&size>=24))throw invalid();
    if(mime==='audio/mpeg' && !(head.startsWith('ID3') || (head.charCodeAt(0)===255 && (head.charCodeAt(1)&0xe0)===0xe0)))throw invalid();
    if(mime==='application/pdf' && !(head.startsWith('%PDF-') && tail.includes('%%EOF')))throw invalid();
  }
  return {id:crypto.randomUUID(),name,size,mime,data};
}

export async function writePost(request,db,user,existing,helpers){
  const {ApiError,parseBody,textField,enforceLimit,validateImage,topics}=helpers;
  if(existing&&existing.author_id!==user.id)throw new ApiError(403,'يمكن لصاحب المنشور وحده تعديله.');
  const data=await parseBody(request,14*1024*1024);
  if(existing&&data.version!==existing.version)throw new ApiError(409,'تغيّر المنشور. حدّث الصفحة ثم أعد التعديل.');
  const title=textField(data.title??existing?.title,0,160,'العنوان');
  const body=textField(data.body??existing?.body,0,24000,'نص المنشور');
  const topic=data.topic??existing?.topic??'المجتمع';
  const postKind=data.post_kind??existing?.post_kind??'post';
  if(!['post','article','initiative','question','announcement'].includes(postKind))throw new ApiError(400,'اختر نوع منشور صالحاً.');
  if(!topics.has(topic))throw new ApiError(400,'اختر مجالًا معتمدًا.');
  const old=existing?.attachments??[];
  const keep=data.keep??old.map(file=>file.id);
  if(!Array.isArray(keep)||new Set(keep).size!==keep.length||keep.some(id=>!old.some(file=>file.id===id)))throw new ApiError(400,'قائمة المرفقات المحتفظ بها غير صالحة.');
  const files=data.attachments??[];
  if(existing&&data.image)throw new ApiError(400,'استخدم قائمة المرفقات لتغيير الصورة.');
  const legacy=existing?null:validateImage(data.image,ApiError);
  if(!Array.isArray(files)||files.length+keep.length+Number(Boolean(legacy))>4)throw new ApiError(400,'يمكن إرفاق أربعة ملفات بالمنشور.');
  const additions=files.map(file=>decodeFile(file,helpers));
  const retained=old.filter(file=>keep.includes(file.id));
  const allBytes=[...retained,...additions].reduce((n,file)=>n+file.size,legacy?.bytes.length??0);
  if(allBytes>maxTotal)throw new ApiError(413,'إجمالي حجم المرفقات يتجاوز 10 ميغابايت.');
  if(!body&&!retained.length&&!additions.length&&!legacy)throw new ApiError(400,'أضف نصًا أو مرفقًا إلى المنشور.');
  await enforceLimit(db,existing?'edit-post':'post',user.id,existing?60:20,3600);
  // The unique token also guards every dependent statement in a losing edit.
  const token=crypto.randomUUID();
  const mutations=[];
  if(existing){
    const keepLegacy=keep.includes('legacy')?1:0;
    mutations.push(db.prepare(`UPDATE posts SET title=?,body=?,topic=?,post_kind=?,version=version+1,edit_token=?,
      image_bytes=CASE WHEN ? THEN image_bytes END,image_mime=CASE WHEN ? THEN image_mime END
      WHERE id=? AND author_id=? AND version=? RETURNING id`).bind(title,body,topic,postKind,token,keepLegacy,keepLegacy,existing.id,user.id,existing.version));
    for(const file of old){
      if(file.id!=='legacy'&&!keep.includes(file.id)){
        mutations.push(db.prepare('DELETE FROM post_files WHERE id=? AND post_id=(SELECT id FROM posts WHERE edit_token=?)').bind(file.id,token));
      }
    }
  }else{
    mutations.push(db.prepare('INSERT INTO posts(author_id,title,body,topic,post_kind,edit_token,image_bytes,image_mime) VALUES(?,?,?,?,?,?,?,?) RETURNING id')
      .bind(user.id,title,body,topic,postKind,token,legacy?.bytes??null,legacy?.mime??null));
  }
  for(const file of additions){
    mutations.push(db.prepare(`INSERT INTO post_files(id,post_id,name,mime,size,position)
      SELECT ?,p.id,?,?,?,COALESCE((SELECT MAX(f.position)+1 FROM post_files f WHERE f.post_id=p.id),0)
      FROM posts p WHERE edit_token=?`).bind(file.id,file.name,file.mime,file.size,token));
    for(let cursor=0;cursor<file.data.length;cursor+=partChars){
      mutations.push(db.prepare('INSERT INTO file_parts(file_id,part,data) SELECT id,?,? FROM post_files WHERE id=?')
        .bind(cursor/partChars,file.data.slice(cursor,cursor+partChars),file.id));
    }
  }
  const [change]=await db.batch(mutations);
  if(!change.results.length)throw new ApiError(409,'تغيّر المنشور. حدّث الصفحة ثم أعد التعديل.');
  return change.results[0].id;
}

export async function serveFile(request,db,id,helpers){
  const {ApiError}=helpers;
  const file=await db.prepare('SELECT name,mime,size FROM post_files WHERE id=?').bind(id).first();
  if(!file)throw new ApiError(404,'لم نعثر على المرفق.');
  const headers=new Headers({'Content-Type':file.mime,'Cache-Control':'private, no-cache','X-Content-Type-Options':'nosniff',
    'Accept-Ranges':'bytes','Content-Security-Policy':"default-src 'none'; sandbox",
    'Content-Disposition':(file.mime==='application/pdf'?'attachment':'inline')+"; filename*=UTF-8''"+encodeURIComponent(file.name).replace(/'/g,'%27')});
  let start=0,end=file.size-1,status=200;
  const range=request.headers.get('Range');
  if(range){
    const match=/^bytes=(\d*)-(\d*)$/.exec(range);
    if(match && (match[1]||match[2])){
      start=match[1]?Number(match[1]):Math.max(0,file.size-Number(match[2]));
      end=match[1]&&match[2]?Math.min(Number(match[2]),file.size-1):file.size-1;
    }
    if(!match||(!match[1]&&!match[2])||!Number.isSafeInteger(start)||start>end){
      headers.set('Content-Range','bytes */'+file.size);
      return new Response(null,{status:416,headers});
    }
    status=206;headers.set('Content-Range','bytes '+start+'-'+end+'/'+file.size);
  }
  headers.set('Content-Length',String(end-start+1));
  if(request.method==='HEAD')return new Response(null,{status,headers});
  const first=Math.floor(start/partBytes),last=Math.floor(end/partBytes);
  const {results}=await db.prepare('SELECT part,data FROM file_parts WHERE file_id=? AND part BETWEEN ? AND ? ORDER BY part').bind(id,first,last).all();
  if(results.length!==last-first+1)throw new ApiError(404,'المرفق غير متاح.');
  const buffer=new Uint8Array(end-start+1);
  for(const {part,data} of results){
    const offset=part*partBytes,binary=atob(data);
    const from=Math.max(0,start-offset),to=Math.min(binary.length,end-offset+1);
    for(let i=from;i<to;i++)buffer[offset+i-start]=binary.charCodeAt(i);
  }
  return new Response(buffer,{status,headers});
}

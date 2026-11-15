'use strict';
function groupItem(group) {
  return '<article class="group-tile"><small>مجموعة عامة · '+group.member_count+' عضو</small><h2><a href="/groups/'+group.id+'">'+esc(group.name)+'</a></h2><p>'+esc(group.description)+'</p><a class="plain" href="/groups/'+group.id+'">دخول المجموعة ←</a></article>';
}
function groupDiscussion(note, manager) {
  const canDelete=manager||user?.id===note.user_id;
  return '<article class="group-note">'+memberSignature({id:note.user_id,name:note.author,avatar:note.author_avatar,cover:note.author_cover},'tiny')+'<time>'+esc(date(note.created_at))+'</time><p>'+esc(note.body)+'</p>'+(canDelete?'<button class="plain" data-group-action="delete-note" data-id="'+note.id+'">حذف المشاركة</button>':'')+'</article>';
}
function memberControls(member) {
  const options=[['member','عضو'],['moderator','مشرف'],['blocked','عضوية موقوفة']];
  return '<form data-group-form="role" data-id="'+member.user_id+'" class="group-member">'+memberSignature({id:member.user_id,name:member.name,avatar:member.avatar,cover:member.cover},'tiny')+'<label>الصلاحية <select name="status">'+options.map(([v,label])=>'<option value="'+v+'" '+(v===member.status?'selected':'')+'>'+label+'</option>').join('')+'</select></label><button class="btn">حفظ</button></form>';
}
async function renderGroups(token) {
  const match=location.pathname.match(/^\/groups\/(\d+)$/);
  main.innerHTML='<div class="status">جارٍ تحميل المجموعات…</div>';
  const data=await api(match?'groups/'+match[1]:'groups');
  if(token!==version)return;
  if(!match){
    document.title='المجموعات | تنميات';
    main.innerHTML='<section class="group-page"><div class="group-title"><div><a href="/wall" class="plain">الحائط التفاعلي</a><h1>المجموعات</h1></div><button class="btn primary" data-group-action="create">إنشاء مجموعة</button></div><div class="group-grid">'+(data.groups.length?data.groups.map(groupItem).join(''):'<div class="panel"><h2>ابدأ أول مجموعة</h2><p>اجمع المهتمين بموضوع تنموي في مساحة مشتركة للنقاش.</p></div>')+'</div></section>';
    return;
  }
  const g=data.group,manager=['owner','moderator'].includes(g.membership);
  const member=manager||g.membership==='member';
  document.title=g.name+' | تنميات';
  const membershipUI=g.membership==='owner'?'<small>مالك المجموعة</small>':g.membership==='blocked'?'<small>العضوية موقوفة</small>':'<button class="btn" data-group-action="'+(member?'leave':'join')+'">'+(member?'مغادرة المجموعة':'انضمام للمجموعة')+'</button>';
  main.innerHTML='<section class="group-page" data-group="'+g.id+'"><a href="/groups" class="plain">← المجموعات</a><div class="group-summary"><small>مجموعة عامة · '+g.member_count+' عضو</small><h1>'+esc(g.name)+'</h1><p>'+esc(g.description)+'</p><div class="group-by">'+memberSignature({id:g.owner_id,name:g.owner,avatar:g.owner_avatar,cover:g.owner_cover},'tiny')+''+membershipUI+'</div></div>'+
    (g.membership==='owner'&&data.members.length?'<details class="group-manage"><summary>إدارة أعضاء المجموعة ('+data.members.length+')</summary>'+data.members.map(memberControls).join('')+'</details>':'')+
    (member?'<form data-group-form="note" class="fields group-compose"><label>مشاركة في المجموعة<textarea name="body" required maxlength="3000" rows="3"></textarea></label><button class="btn primary">نشر</button></form>':'')+
    '<h2>نقاش المجموعة</h2><div id="group-notes">'+(data.notes.length?data.notes.map(n=>groupDiscussion(n,manager)).join(''):'<p>لم تبدأ المناقشة بعد.</p>')+'</div>'+
    (data.hasMore?'<button class="btn" data-group-action="more" data-before="'+data.notes.at(-1).id+'">عرض مشاركات أقدم</button>':'')+'</section>';
}
function createGroupDialog(){
  showModal('إنشاء مجموعة عامة','<form class="fields" data-group-form="create"><label>اسم المجموعة<input name="name" required minlength="2" maxlength="80"></label><label>موضوع المجموعة<textarea name="description" required minlength="3" maxlength="500" rows="3"></textarea></label><button class="btn primary">إنشاء المجموعة</button></form>');
}
document.addEventListener('click',async event=>{
  const button=event.target.closest('[data-group-action]');if(!button)return;
  const action=button.dataset.groupAction;
  if(action==='create'){requireUser(createGroupDialog);return;}
  const id=main.querySelector('[data-group]')?.dataset.group;
  if(!id)return;
  if(action==='join'&&!user){requireUser(async()=>{
    try { await api('groups/'+id+'/join','POST');await route(); }
    catch(error){ notify(error.message); }
  });return;}
  button.disabled=true;
  try {
    if(action==='more'){
      const token=version,data=await api('groups/'+id+'?before='+button.dataset.before);
      if(version!==token)return;
      const manager=['owner','moderator'].includes(data.group.membership);
      document.querySelector('#group-notes').insertAdjacentHTML('beforeend',data.notes.map(n=>groupDiscussion(n,manager)).join(''));
      if(data.hasMore)button.dataset.before=data.notes.at(-1).id;else button.remove();
    }else if(action==='delete-note'){
      showModal('حذف مشاركة المجموعة','<form class="fields" data-group-form="delete" data-id="'+button.dataset.id+'"><p>هل تريد حذف هذه المشاركة؟</p><button class="btn primary">حذف</button></form>');
    }else{
      await api('groups/'+id+'/'+action,'POST');
      if(location.pathname==='/groups/'+id)await route();
    }
  }catch(error){notify(error.message);}finally{button.disabled=false;}
});
document.addEventListener('submit',async event=>{
  const form=event.target;
  if(!form.hasAttribute('data-group-form'))return;
  event.preventDefault();
  const btn=form.querySelector('button');if(btn.disabled)return;btn.disabled=true;
  const kind=form.dataset.groupForm;
  const id=main.querySelector('[data-group]')?.dataset.group;
  const data=Object.fromEntries(new FormData(form));
  try {
    if(kind==='create'){
      const group=await api('groups','POST',data);dialog.close();go('/groups/'+group.id);
    }else{
      if(kind==='note')await api('groups/'+id+'/notes','POST',data);
      if(kind==='role')await api('groups/'+id+'/members/'+form.dataset.id,'PUT',data);
      if(kind==='delete'){await api('groups/'+id+'/notes/'+form.dataset.id,'DELETE');dialog.close();}
      if(location.pathname==='/groups/'+id)await route();
    }
  }catch(error){notify(error.message);}finally{btn.disabled=false;}
});

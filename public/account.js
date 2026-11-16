'use strict';
function closeAccountMenu(focus=false){
  const button=document.getElementById('accountSwitch'),panel=document.getElementById('accountPanel');
  if(!button||!panel||panel.hidden)return;
  panel.hidden=true;button.setAttribute('aria-expanded','false');
  if(focus)button.focus();
}
function accountRow(content, glyph, color, attributes){
  const tag=attributes.startsWith('href=')?'a':'button';
  return '<'+tag+' '+attributes+' class="accountRow"><span class="rowGlyph '+color+'" aria-hidden="true">'+glyph+'</span><span>'+content+'</span></'+tag+'>';
}
function signedAccountMenu(){
  const profile='/profile/'+encodeURIComponent(user.id);
  return '<button id="accountSwitch" class="accountSwitch" aria-expanded="false" aria-controls="accountPanel" data-act="accountmenu">'+face(user)+'<span>'+esc(user.name)+'</span><b aria-hidden="true">⌄</b></button>'+
    '<section id="accountPanel" class="accountPanel" aria-label="قائمة الحساب" hidden>'+
    '<a href="'+profile+'" class="accountSummary accountSummaryCover"><span class="accountCoverRibbon"'+coverStyle(user)+'></span>'+face(user,'medium')+'<span><strong>'+esc(user.name)+'</strong><small>عرض الملف الشخصي</small></span></a>'+
    '<div class="accountSet">'+accountRow('مشاركاتي','▤','peach','href="'+profile+'"')+accountRow('الأصدقاء وطلبات الصداقة','♧','lilac','href="/people?filter=requests"')+accountRow('الرسائل الخاصة','✉','sky','href="/messages"')+'</div>'+
    '<div class="accountSet">'+accountRow('مساحتي التنموية','◈','mint','href="/my-space"')+accountRow('تنبيهاتي','◉','sky','href="/my-alerts"')+accountRow('شبكتي المهنية','♧','mint','href="/my-people"')+accountRow('علاقاتي المهنية','◇','sky','href="/network"')+accountRow('مشاريعي ومهامي','▣','sky','href="/my-projects"')+accountRow('الإعدادات والتفضيلات','✎','mint','href="/onboarding"')+accountRow('تعديل بياناتي','✎','mint','data-act="editprofile"')+accountRow('اختصارات لوحة المفاتيح','⌨','sky','data-act="shortcuts"')+
    accountRow('الوضع الليلي','☾','lilac','data-act="night" aria-pressed="'+(document.documentElement.dataset.theme==='dark')+'"')+
    (user.role==='admin'?accountRow('مركز إدارة تنميات','⚑','peach','href="/admin"'):'')+'</div>'+
    accountRow('تسجيل الخروج','↪','rose','data-act="logout"')+'</section>';
}
function setNight(on){
  document.documentElement.dataset.theme=on?'dark':'light';
  try{localStorage.setItem('tnmyat-theme',on?'dark':'light');}catch{}
}
try{document.documentElement.dataset.theme=localStorage.getItem('tnmyat-theme')||'light';}catch{}
document.addEventListener('click',event=>{
  if(!event.target.closest('#accountSwitch')&&(!event.target.closest('#accountPanel')||event.target.closest('button,a')))closeAccountMenu();
});
document.addEventListener('focusin',event=>{if(!event.target.closest('#account'))closeAccountMenu();});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'){closeAccountMenu(true);return;}
  if(!user||event.isComposing||dialog.open||event.target.closest('input,textarea,select,[contenteditable=true]'))return;
  if(event.altKey&&!event.shiftKey&&!event.ctrlKey&&!event.metaKey){
    if(event.code==='KeyN'){event.preventDefault();composer();}
    if(event.code==='KeyM'){event.preventDefault();go('/messages');}
  }
});

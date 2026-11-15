'use strict';

function renderWelcome() {
  document.title = 'تنميات | مرحباً بك في مجتمع التنمية';
  const signedIn = Boolean(user);
  const accessPanel = signedIn
    ? `<div class="welcome-login-content welcome-signed-in"><div class="welcome-status-icon" aria-hidden="true">✓</div><h2>مرحباً، ${esc(user.name)}</h2><p>يمكنك متابعة التفاعل مع الأعضاء ومجموعات التنمية.</p><a class="welcome-submit" href="/wall">دخول المجتمع <span aria-hidden="true">←</span></a><button class="welcome-text-button" type="button" data-act="logout">تسجيل الخروج</button></div>`
    : `<div class="welcome-login-content" id="welcome-login"><div class="welcome-form-intro"><span class="welcome-kicker">مساحتك في مجتمع التنمية</span><h2>تسجيل الدخول</h2><p>أهلاً بعودتك، سجّل الدخول لمتابعة مجتمعك.</p></div>
       <form id="auth" class="welcome-auth-form" data-mode="login">
         <label for="welcome-email">البريد الإلكتروني</label>
         <input id="welcome-email" name="email" type="email" inputmode="email" autocomplete="email" required maxlength="254" placeholder="name@example.com" dir="ltr">
         <div class="welcome-password-label"><label for="welcome-password">كلمة المرور</label></div>
         <input id="welcome-password" name="password" type="password" autocomplete="current-password" required placeholder="أدخل كلمة المرور">
         <div class="welcome-form-options"><label class="welcome-remember"><input type="checkbox" checked disabled aria-describedby="welcome-session-note"> الجلسة محفوظة تلقائياً</label><span id="welcome-session-note">وفق إعدادات الأمان المعتمدة</span></div>
         <div class="error" role="alert" aria-live="polite"></div>
         <button class="welcome-submit" type="submit">تسجيل الدخول <span aria-hidden="true">←</span></button>
       </form>
       <p class="welcome-switch">ليس لديك حساب؟ <button type="button" data-act="register">أنشئ حساباً جديداً</button></p></div>`;

  main.innerHTML = `<section class="welcome-page" aria-labelledby="welcome-heading">
    <div class="welcome-hero">
      <div class="welcome-wave welcome-wave-top" aria-hidden="true"></div>
      <div class="welcome-wave welcome-wave-bottom" aria-hidden="true"></div>
      <div class="welcome-shell">
        <div class="welcome-heading-row">
          <div class="welcome-brand-lockup"><img src="/mark.svg" alt="تنميات" width="116" height="70"><span>مجتمع تنميات</span></div>
          <div class="welcome-heading-description"><span class="welcome-small-label">مجتمع التنمية</span><h1 id="welcome-heading">معاً نصنع مساحة أوسع للتواصل والتعاون</h1></div>
        </div>
        <nav class="welcome-links" aria-label="روابط الترحيب">
          <a href="/wall">استكشف المجتمع</a>
          <a href="/people">الأعضاء</a>
          <a href="/groups">المجموعات</a>
          ${signedIn ? '<a href="/wall">دخول المجتمع</a>' : '<a href="#welcome-login">تسجيل الدخول</a>'}
        </nav>
        <div class="welcome-card">
          <section class="welcome-visual" aria-labelledby="welcome-visual-heading">
            <div class="welcome-visual-orbit welcome-visual-orbit-one" aria-hidden="true"></div>
            <div class="welcome-visual-orbit welcome-visual-orbit-two" aria-hidden="true"></div>
            <div class="welcome-visual-copy"><span>شبكة المعرفة والعلاقات</span><h2 id="welcome-visual-heading">تواصل مع مجتمعك</h2><p>شارك خبراتك، تعرّف على المبادرات، وابنِ علاقات مهنية تصنع أثراً.</p></div>
            <div class="welcome-people-art" aria-hidden="true">
              <svg viewBox="0 0 540 350" xmlns="http://www.w3.org/2000/svg" role="presentation">
                <circle cx="270" cy="180" r="154" fill="#ffffff" opacity=".12"/>
                <circle cx="270" cy="180" r="109" fill="#ffffff" opacity=".14"/>
                <path d="M60 312C116 230 172 272 227 245S342 222 390 260s87 21 105 53" fill="none" stroke="#ffffff" opacity=".3" stroke-width="3" stroke-dasharray="7 13"/>
                <g transform="translate(52 130)"><rect x="0" y="80" width="132" height="167" rx="52" fill="#eab970"/><circle cx="66" cy="51" r="44" fill="#f8d4aa"/><path d="M22 49c-3-47 80-61 89-12l-9 9-15-23-43 5-15 26z" fill="#233e73"/><path d="M18 117q48-21 98 0" stroke="#e9a85e" stroke-width="7" fill="none"/></g>
                <g transform="translate(187 80)"><rect x="0" y="100" width="168" height="198" rx="65" fill="#5bc4c1"/><circle cx="84" cy="61" r="52" fill="#f3c3a6"/><path d="M32 54c0-70 106-78 111-10-20-10-38-19-47-43-9 31-37 43-64 53" fill="#233e73"/><path d="M50 119l34 52 34-52" fill="#ffffff" opacity=".7"/></g>
                <g transform="translate(353 147)"><rect x="0" y="77" width="131" height="169" rx="52" fill="#ef7690"/><circle cx="65" cy="49" r="43" fill="#e9af93"/><path d="M22 45c1-49 81-58 90-7-17-5-26-18-35-28-10 22-35 35-55 35" fill="#162c59"/></g>
                <g fill="#fff"><circle cx="119" cy="51" r="9"/><circle cx="426" cy="66" r="9"/><circle cx="466" cy="126" r="5"/><circle cx="79" cy="100" r="5"/></g>
                <g fill="none" stroke="#fff" stroke-width="3" opacity=".6"><path d="m128 56 69 43M398 77l-51 36M420 123l-27 41"/></g>
              </svg>
            </div>
            <div class="welcome-visual-tags"><span>تواصل</span><span>معرفة</span><span>مبادرات</span></div>
          </section>
          <section class="welcome-auth" aria-label="الدخول إلى مجتمع تنميات">${accessPanel}</section>
        </div>
        <div class="welcome-bottom-line"><span>تنميات · شبكة مهنية للتنمية والمبادرات</span><span>© ${new Date().getFullYear()} تنميات</span></div>
      </div>
    </div>
  </section>`;
}

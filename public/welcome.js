'use strict';

function renderWelcome() {
  document.title = 'مجتمع تنميات | شبكة معرفة وعلاقات تنموية';
  main.innerHTML = `<section class="welcome-page" aria-labelledby="welcome-heading">
    <header class="welcome-topbar">
      <div class="welcome-topinner">
        <a class="welcome-topbrand" href="/welcome" aria-label="تنميات - الصفحة الرئيسية"><img src="/mark.svg" width="104" height="65" alt="تنميات"></a>
        <nav class="welcome-topactions" aria-label="خيارات العضوية">
          <a href="#welcome-login">دخول</a>
          <button type="button" data-act="register" class="welcome-create">إنشاء حساب</button>
        </nav>
      </div>
    </header>
    <div class="welcome-landscape">
      <div class="welcome-landscape-shade" aria-hidden="true"></div>
      <div class="welcome-stage">
        <div class="welcome-hero-copy">
          <p class="welcome-eyebrow">شبكة معرفة وعلاقات تنموية</p>
          <h1 id="welcome-heading">مجتمع تنميات</h1>
          <p class="welcome-description">فضاء مهني يجمع خبرات وكفاءات ومبادرات، ويعزز تبادل المعرفة والتعاون المؤسسي وبناء شراكات ذات أثر تنموي.</p>
          <div class="welcome-hero-actions"><a href="#welcome-login" class="welcome-primary-link">انضم إلى تنميات <span aria-hidden="true">←</span></a><button type="button" class="welcome-secondary-link" data-act="register">إنشاء حساب جديد</button></div>
        </div>
        <section class="welcome-glass-card" id="welcome-login" aria-label="تسجيل الدخول إلى مجتمع تنميات">
          <div class="welcome-glass-heading"><span>عضويتك في مجتمع تنميات</span><h2>تسجيل الدخول</h2><p>مرحباً بعودتك. واصل التواصل مع مجتمعك.</p></div>
          <form id="auth" class="welcome-auth-form" data-mode="login">
            <label for="welcome-email">البريد الإلكتروني</label>
            <input id="welcome-email" name="email" type="email" inputmode="email" autocomplete="email" required maxlength="254" placeholder="name@example.com" dir="ltr">
            <label for="welcome-password">كلمة المرور</label>
            <input id="welcome-password" name="password" type="password" autocomplete="current-password" required placeholder="أدخل كلمة المرور">
            <div class="error" role="alert" aria-live="polite"></div>
            <button type="submit" class="welcome-submit">دخول المجتمع <span aria-hidden="true">←</span></button>
          </form>
          <p class="welcome-switch">ليس لديك حساب؟ <button type="button" data-act="register">أنشئ حساباً جديداً</button></p>
        </section>
      </div>
    </div>
    <section class="welcome-features" aria-label="مجالات المجتمع">
      <div class="welcome-features-inner">
        <div class="welcome-feature"><span aria-hidden="true" class="welcome-feature-icon">♧</span><div><h3>شبكة الأعضاء</h3><p>تواصل مع أصحاب الاهتمامات المشتركة وتعرّف إلى خبراتهم.</p></div></div>
        <div class="welcome-feature"><span aria-hidden="true" class="welcome-feature-icon">▣</span><div><h3>مجموعات التنمية</h3><p>انضم إلى مجموعة متخصصة أو أنشئ مجموعة لمبادرتك.</p></div></div>
        <div class="welcome-feature"><span aria-hidden="true" class="welcome-feature-icon">▧</span><div><h3>مشاركة المعرفة</h3><p>انشر خبراتك الميدانية ووثّق أعمالك بالنص والصورة والوسائط.</p></div></div>
      </div>
    </section>
    <div class="welcome-foot"><span>© ${new Date().getFullYear()} تنميات</span><span>مجتمع التنمية</span></div>
  </section>`;
}

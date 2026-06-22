// Page-specific logic for LAWSSA UNIBEN
// Handles dues WhatsApp receipt flow, page filters, and Supabase data loading.

const WHATSAPP_DUES_NUMBER = '2347057705284';
const WHATSAPP_DUES_DISPLAY = '+234 705 770 5284';

function formatWhatsAppNumber(value) {
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('0')) return `234${digits.slice(1)}`;
  if (digits.startsWith('234')) return digits;
  return digits;
}

function buildDuesWhatsAppMessage({ name, matric, level, email, phone, amount, ref }) {
  return `Hello LAWSA Admin,%0A%0A` +
    `I have completed payment for Faculty Dues.%0A` +
    `Name: ${name}%0A` +
    `Matric No: ${matric}%0A` +
    `Level: ${level}L%0A` +
    `Email: ${email}%0A` +
    `Phone: ${phone}%0A` +
    `Amount: ₦${amount.toLocaleString()}%0A` +
    `Account: 6060197309 (Fidelity Bank)%0A` +
    `Reference: ${ref}%0A%0A` +
    `Please confirm receipt and update my membership status. I have attached my payment receipt to this message.`;
}

const dummyPosts = [
  {
    title: '2025/2026 Dues Payment Now Open',
    category: 'Announcements',
    published_at: '2026-01-15',
    cover_image_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&q=80',
    content: '<p>The LAWSA Financial Secretary announces that association dues payment for the 2025/2026 academic session is now open on this digital platform. All members are urged to pay promptly to enjoy full membership benefits.</p>'
  },
  {
    title: 'Law Week 2026 — Call for Participants',
    category: 'Events',
    published_at: '2026-02-03',
    cover_image_url: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=600&q=80',
    content: '<p>LAWSA UNIBEN proudly announces the commencement of Law Week 2026. All law students are encouraged to register and participate in debates, moot court sessions, and the annual legal quiz competition.</p>'
  },
  {
    title: 'LAWSA Launches Official Digital Platform',
    category: 'Press',
    published_at: '2026-03-01',
    cover_image_url: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=600&q=80',
    content: '<p>In a landmark move, LAWSA UNIBEN has officially launched its digital platform — the first of its kind among law student associations in Edo State. The platform enables online dues payment, resource access, and news distribution.</p>'
  }
];

function openWhatsAppDues({ name, matric, level, email, phone, type, amount, ref }) {
  const whatsappPhone = formatWhatsAppNumber(WHATSAPP_DUES_NUMBER);
  const msg = buildDuesWhatsAppMessage({ name, matric, level, email, phone, type, amount, ref });
  window.open(`https://wa.me/${whatsappPhone}?text=${msg}`, '_blank');
}

function validateDuesForm(name, matric, email) {
  const errors = {};
  if (!name) errors.name = 'Full name is required.';
  if (!matric) errors.matric = 'Matric number is required.';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'A valid email address is required.';
  return errors;
}

async function handleDuesSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('payBtn');
  const name = document.getElementById('payName').value.trim();
  const matric = document.getElementById('payMatric').value.trim();
  const level = document.getElementById('payLevel').value;
  const email = document.getElementById('payEmail').value.trim();
  const phone = document.getElementById('payPhone').value.trim();
  const amount = 3000;
  const ref = `LAWSA-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

  const errors = validateDuesForm(name, matric, email);
  document.getElementById('payNameErr').textContent = errors.name || '';
  document.getElementById('payMatricErr').textContent = errors.matric || '';
  document.getElementById('payEmailErr').textContent = errors.email || '';

  if (Object.keys(errors).length) {
    btn.disabled = false;
    btn.textContent = 'Send Receipt via WhatsApp →';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Opening WhatsApp...';

  if (window.supabase) {
    await supabase.from('payments').insert([{
      transaction_ref: ref,
      full_name: name,
      matric_number: matric,
      academic_level: parseInt(level, 10) || null,
      email,
      phone,
      dues_type: 'faculty',
      amount,
      status: 'receipt_sent',
      created_at: new Date().toISOString()
    }]);
  }

  openWhatsAppDues({ name, matric, level, email, phone, amount, ref });

  openModal('noticeModal');
  document.getElementById('noticeTitle').textContent = 'Receipt Request Sent';
  document.getElementById('noticeBody').innerHTML = `We have opened WhatsApp to send your payment receipt to <strong>${WHATSAPP_DUES_DISPLAY}</strong>.<br><br>After sending the receipt, keep a copy for your records.`;

  btn.disabled = false;
  btn.textContent = 'Send Receipt via WhatsApp →';
}

function openBlogDummy(idx) {
  const post = dummyPosts[idx];
  if (!post) return;
  const el = document.getElementById('blogModalContent');
  el.innerHTML = `
    <div class="blog-modal__cover"><img src="${post.cover_image_url}" alt="${post.title}"></div>
    <div class="blog-modal__body">
      <div class="blog-modal__cat">${post.category}</div>
      <h1 class="blog-modal__title display">${post.title}</h1>
      <div class="blog-modal__meta">By LAWSA UNIBEN Executive Council · ${new Date(post.published_at).toLocaleDateString('en-NG', { dateStyle: 'long' })}</div>
      <div class="blog-modal__content">${post.content}</div>
    </div>`;
  openModal('blogModal');
}

function initDuesForm() {
  const form = document.getElementById('paymentForm');
  if (!form) return;
  form.addEventListener('submit', handleDuesSubmit);
}

function initNewsFilter() {
  document.querySelectorAll('#newsFilterBar .filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#newsFilterBar .filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;
      if (state.posts.length > 0) {
        const filtered = filter === 'all' ? state.posts : state.posts.filter(p => p.category === filter);
        renderAllNews(filtered);
      } else {
        document.querySelectorAll('#allNewsGrid .news-card').forEach(card => {
          const cat = card.querySelector('.news-card__cat')?.textContent.trim();
          card.style.display = (filter === 'all' || cat === filter) ? '' : 'none';
        });
      }
    });
  });
}

function initResourceFilter() {
  document.querySelectorAll('#levelTabs .level-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#levelTabs .level-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const level = tab.dataset.level;
      if (state.resources.length > 0) {
        const filtered = level === 'all' ? state.resources : state.resources.filter(r => String(r.academic_level) === level);
        renderResources(filtered);
      } else {
        document.querySelectorAll('#resourcesGrid .resource-card').forEach(card => {
          const badge = card.querySelector('.resource-badge');
          if (!badge) return;
          const cardLevel = badge.textContent.replace('L', '').trim();
          card.style.display = (level === 'all' || cardLevel === level) ? '' : 'none';
        });
      }
    });
  });
}

async function loadData() {
  if (!window.supabase) return;
  try {
    const [posts, resources, leaders, settings, calendar] = await Promise.all([
      supabase.from('blog_posts').select('*').order('published_at', { ascending: false }),
      supabase.from('resources').select('*').order('created_at', { ascending: false }),
      supabase.from('leadership').select('*').order('hierarchy_order'),
      supabase.from('system_settings').select('*').single(),
      supabase.from('academic_calendar').select('*').order('event_date').limit(5)
    ]);

    if (posts.data) state.posts = posts.data;
    if (resources.data) state.resources = resources.data;
    if (leaders.data) state.leadership = leaders.data;
    if (settings.data) state.settings = settings.data;
    if (calendar.data) state.calendar = calendar.data;

    if (state.settings.notice_is_active && !sessionStorage.getItem('notice_shown')) {
      document.getElementById('noticeTitle').textContent = state.settings.notice_title || 'Notice';
      document.getElementById('noticeBody').innerHTML = state.settings.notice_body || '';
      openModal('noticeModal');
      sessionStorage.setItem('notice_shown', '1');
    }

    if (state.settings.ticker_text) {
      const txt = (state.settings.ticker_text + '  ●  ').repeat(8);
      document.getElementById('tickerTrack').innerHTML = `<div class="ticker__item">${txt}</div><div class="ticker__item">${txt}</div>`;
    }

    const pres = state.leadership.find(l => l.hierarchy_order === 1);
    if (pres) {
      document.getElementById('presImage').src = pres.image_url;
      document.getElementById('presImgLeader').src = pres.image_url;
      document.getElementById('presName').textContent = pres.name;
      document.getElementById('presSigName').textContent = pres.name;
      document.getElementById('presNameLeader').textContent = pres.name;
      document.getElementById('presText').innerHTML = pres.bio || '';
      document.querySelector('.leader-featured__name').innerHTML = pres.name.replace(' ', '<br>');
    }

    if (state.posts.length) {
      renderAllNews(state.posts);
      const grid = document.getElementById('recentNewsGrid');
      if (grid) {
        grid.innerHTML = state.posts.slice(0, 3).map(p => `
          <article class="news-card" onclick="openBlog('${p.id}')" style="cursor:pointer">
            <div class="news-card__img"><img src="${p.cover_image_url || 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&q=80'}" alt="" loading="lazy"></div>
            <div class="news-card__body">
              <div class="news-card__cat">${p.category || 'News'}</div>
              <h3 class="news-card__title display">${p.title}</h3>
              <p class="news-card__excerpt">${p.excerpt || ''}</p>
              <div class="news-card__meta"><span>${new Date(p.published_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</span><span class="news-card__arrow">→</span></div>
            </div>
          </article>`).join('');
      }
    }

    if (state.leadership.length) {
      const others = state.leadership.filter(l => l.hierarchy_order !== 1);
      const previewGrid = document.getElementById('leaderPreviewGrid');
      if (previewGrid) previewGrid.innerHTML = others.slice(0, 4).map(l => `
        <div class="leader-card">
          <div class="leader-card__portrait"><img src="${l.image_url}" alt="${l.name}" loading="lazy"></div>
          <div class="leader-card__role">${l.position}</div>
          <div class="leader-card__name display">${l.name}</div>
          <div class="leader-card__socials">
            ${l.ig_link ? `<a href="${l.ig_link}" class="leader-card__social" target="_blank">ig</a>` : ''}
            ${l.linkedin_link ? `<a href="${l.linkedin_link}" class="leader-card__social" target="_blank">in</a>` : ''}
          </div>
        </div>`).join('');

      const fullGrid = document.getElementById('leaderFullGrid');
      if (fullGrid) fullGrid.innerHTML = others.map(l => `
        <div class="leader-card">
          <div class="leader-card__portrait"><img src="${l.image_url}" alt="${l.name}" loading="lazy"></div>
          <div class="leader-card__role">${l.position}</div>
          <div class="leader-card__name display">${l.name}</div>
          <p style="font-size:var(--t-xs);color:var(--text-m);margin-top:var(--s2)">${l.bio || ''}</p>
          <div class="leader-card__socials">
            ${l.ig_link ? `<a href="${l.ig_link}" class="leader-card__social" target="_blank">ig</a>` : ''}
            ${l.linkedin_link ? `<a href="${l.linkedin_link}" class="leader-card__social" target="_blank">in</a>` : ''}
          </div>
        </div>`).join('');
    }

    if (state.resources.length) renderResources(state.resources);

    if (state.calendar.length) {
      document.getElementById('calendarGrid').innerHTML = state.calendar.map(ev => {
        const d = new Date(ev.event_date + 'T00:00:00');
        return `<div class="cal-item">
          <div class="cal-item__date display">${String(d.getDate()).padStart(2, '0')}</div>
          <div class="cal-item__month">${d.toLocaleDateString('en-NG', { month: 'short', year: 'numeric' })}</div>
          <div class="cal-item__title">${ev.event_title}</div>
          <div class="cal-item__desc">${ev.description || ''}</div>
        </div>`;
      }).join('');
    }
  } catch (err) {
    console.warn('Supabase load failed, using dummy data.', err);
  }
}

function attachDummyNewsClicks() {
  document.querySelectorAll('#recentNewsGrid .news-card').forEach((card, i) => {
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => openBlogDummy(i));
  });
}

function initPage() {
  if (window.Router) Router.init();
  initNewsFilter();
  initResourceFilter();
  initDuesForm();
  attachDummyNewsClicks();
  loadData();
  if (window.ScrollTrigger) requestAnimationFrame(() => ScrollTrigger.refresh());
}

window.addEventListener('DOMContentLoaded', initPage);

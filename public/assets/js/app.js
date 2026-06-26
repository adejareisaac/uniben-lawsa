// ====================================
// LAWSA UNIBEN — COMPLETE APP
// Router, UI, API, Store, GSAP
// ====================================

// --- SUPABASE CONFIG ---
const SUPABASE_URL = 'https://zexamxpnccxsrxlcgosh.supabase.co';
const SUPABASE_ANON = 'sb_publishable_6GeUzm1SYyFgvaWBOJGKeA_MmZMtSJl';

try {
    if (window.supabase && window.supabase.createClient) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
        console.log('✅ Supabase connected');
    } else {
        console.warn('⚠️ Supabase SDK not loaded — using dummy data');
    }
} catch (e) {
    console.error('Supabase init error:', e.message);
}

// --- STATE ---
const state = {
    posts: [],
    resources: [],
    leadership: [],
    storeItems: [],
    calendar: [],
    settings: {}
};
window.state = state;

// --- STORE DATA (default merch) ---
let STORE_ITEMS = [
    { id: 's1', title: 'LAWSA Tote Bag', price: 5000, image: 'public/assets/images/merchandise/totebag.webp', sku: 'TOTEBAG-01' },
    { id: 's2', title: 'LAWSA T-Shirt', price: 6000, image: 'public/assets/images/merchandise/tshirt.webp', sku: 'TSHIRT-01' },
    { id: 's3', title: 'LAWSA Lanyard', price: 2500, image: 'public/assets/images/merchandise/lanyard.webp', sku: 'LANYARD-01' }
];

// ==========================================
// ROUTER
// ==========================================
const Router = (() => {
    function navigate(target, replaceState = false) {
        document.querySelectorAll('[data-section]').forEach(s => {
            s.classList.remove('section--active');
            s.style.display = 'none';
        });
        document.querySelectorAll('[data-nav]').forEach(l => l.classList.remove('nav-link--active'));

        const sec = document.querySelector(`[data-section="${target}"]`);
        const link = document.querySelector(`.nav-link[data-nav="${target}"]`);

        if (sec) { sec.classList.add('section--active'); sec.style.display = 'block'; }
        if (link) link.classList.add('nav-link--active');

        if (replaceState) {
            window.history.replaceState({ page: target }, '', `#${target}`);
        } else {
            window.history.pushState({ page: target }, '', `#${target}`);
        }
        window.scrollTo(0, 0);
        setTimeout(() => { if (window.ScrollTrigger) ScrollTrigger.refresh(); }, 100);
    }

    function init() {
        document.querySelectorAll('[data-nav]').forEach(l => {
            l.addEventListener('click', () => {
                navigate(l.dataset.nav);
                const mobileNav = document.getElementById('mobileNav');
                if (mobileNav) mobileNav.classList.remove('open');
            });
        });
        window.addEventListener('popstate', (event) => {
            const target = event.state?.page || window.location.hash.replace('#', '') || 'home';
            navigate(target, true);
        });
        const initialTarget = window.location.hash.replace('#', '') || 'home';
        navigate(initialTarget, true);
    }

    return { init, navigate };
})();
window.Router = Router;

// ==========================================
// UI HELPERS
// ==========================================
function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('modal--active');
    document.body.classList.remove('no-scroll');
    if (id === 'resourceModal') {
        const frame = document.getElementById('resourceFrame');
        if (frame) frame.src = '';
    }
}

function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('modal--active');
    document.body.classList.add('no-scroll');
}

document.addEventListener('click', e => {
    if (e.target.classList.contains('modal-overlay') && e.target.classList.contains('modal--active')) {
        closeModal(e.target.id);
    }
});

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.modal--active').forEach(m => closeModal(m.id));
    }
});

function toggleMobile() {
    document.getElementById('mobileNav')?.classList.toggle('open');
}

function toggleFaq(el) {
    const item = el.parentElement;
    const wasOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
    if (!wasOpen) item.classList.add('open');
}

function setLeaderBranch(branch, pill) {
    document.querySelectorAll('.branch-pill').forEach(p => p.classList.remove('active'));
    if (pill) pill.classList.add('active');
    ['executives', 'legislative', 'judiciary', 'lsba', 'previous'].forEach(p => {
        const el = document.getElementById(p + 'Panel');
        if (el) el.style.display = p === branch ? '' : 'none';
    });
}

function viewResource(link) {
    if (!link || link === '#' || link.includes('example')) {
        alert('Resource link not available yet. Check back soon!');
        return;
    }
    let url = link.trim();
    if (url.includes('drive.google.com/file/d/')) url = url.replace(/\/view.*$/, '/preview');
    if (url.includes('docs.google.com/document/d/')) url = url.replace(/\/edit.*$/, '/preview');
    const frame = document.getElementById('resourceFrame');
    if (frame) frame.src = url;
    openModal('resourceModal');
}

async function handleContact(e) {
    e.preventDefault();
    const form = e.target;
    if (supabase) {
        await supabase.from('contact_messages').insert({
            full_name: form.querySelector('[type="text"]')?.value || '',
            email: form.querySelector('[type="email"]')?.value || '',
            subject: form.querySelector('[placeholder*="regarding"]')?.value || '',
            message: form.querySelector('textarea')?.value || ''
        });
    }
    openModal('noticeModal');
    document.getElementById('noticeTitle').textContent = 'Message Sent!';
    document.getElementById('noticeBody').textContent = 'Thank you for reaching out. We will respond within 48 hours.';
    form.reset();
}

// ==========================================
// API — DATA FETCHING
// ==========================================
async function fetchNewsPosts() {
    if (!supabase) return getDummyNews();
    const { data, error } = await supabase.from('news_posts').select('*').order('published_at', { ascending: false });
    if (error) { console.error(error); return getDummyNews(); }
    state.posts = data || [];
    return data;
}

async function fetchResources() {
    if (!supabase) return getDummyResources();
    const { data, error } = await supabase.from('resources').select('*').order('created_at', { ascending: false });
    if (error) { console.error(error); return getDummyResources(); }
    state.resources = data || [];
    return data;
}

async function fetchLeadership() {
    if (!supabase) return [];
    const { data } = await supabase.from('leadership').select('*').order('display_order', { ascending: true });
    state.leadership = data || [];
    return data;
}

async function fetchStoreItems() {
    if (!supabase) return;
    const { data } = await supabase.from('store_items').select('*').eq('is_active', true);
    if (data && data.length > 0) {
        data.forEach(item => {
            if (!STORE_ITEMS.find(s => s.sku === item.sku)) {
                STORE_ITEMS.push({
                    id: item.id,
                    title: item.name || item.title,
                    price: item.price,
                    image: item.image_url || 'https://images.unsplash.com/photo-1520975917650-4e1e0b10b3b0?w=600&q=80',
                    sku: item.sku || ''
                });
            }
        });
    }
    state.storeItems = STORE_ITEMS;
}

// ==========================================
// PAYMENT (Dues)
// ==========================================
function buildWhatsAppMessage({ name, matric, level, email, phone, amount }) {
    return `LAWSA Dues Payment%0A%0A*Name:* ${name}%0A*Matric:* ${matric}%0A*Level:* ${level}L%0A*Email:* ${email}%0A*Phone:* ${phone}%0A*Amount:* ₦${amount.toLocaleString()}%0A*Account:* 6060197309 (Fidelity Bank)`;
}

async function handleDuesPayment(e) {
    e.preventDefault();
    const btn = document.getElementById('payBtn');
    const name = document.getElementById('payName')?.value?.trim() || '';
    const matric = document.getElementById('payMatric')?.value?.trim() || '';
    const level = document.getElementById('payLevel')?.value || '';
    const email = document.getElementById('payEmail')?.value?.trim() || '';
    const phone = document.getElementById('payPhone')?.value?.trim() || '';
    const amount = 3000;
    const ref = 'LAWSA-' + Date.now().toString(36).toUpperCase();

    if (!name || !matric || !email) {
        alert('Please fill in all required fields.');
        return;
    }

    if (btn) { btn.textContent = 'Opening WhatsApp...'; btn.disabled = true; }

    if (supabase) {
        await supabase.from('payments').insert({
            full_name: name,
            matric_number: matric,
            academic_level: parseInt(level) || null,
            email,
            phone,
            amount,
            transaction_ref: ref,
            status: 'pending'
        });
    }

    const msg = buildWhatsAppMessage({ name, matric, level, email, phone, amount });
    window.open(`https://wa.me/2347057705284?text=${msg}`, '_blank');

    if (btn) { btn.textContent = 'Send Receipt via WhatsApp →'; btn.disabled = false; }
}

// ==========================================
// STORE — Product Modal & WhatsApp
// ==========================================
function openProduct(id) {
    const p = STORE_ITEMS.find(s => s.id === id);
    if (!p) return;
    document.getElementById('productModalContent').innerHTML = `
        <div class="product-modal__img"><img src="${p.image}" alt="${p.title}"></div>
        <div class="product-modal__body">
            <h2 class="product-modal__title">${p.title}</h2>
            <div class="product-modal__price">₦${p.price.toLocaleString()}</div>
            <p class="product-modal__sku"><strong>SKU:</strong> ${p.sku}</p>
            <p class="product-modal__desc">Make a bank transfer and send your receipt via WhatsApp.</p>
            <div class="bank-details">
                <div><strong>Bank:</strong> Fidelity Bank</div>
                <div><strong>Account Name:</strong> Law Students Association</div>
                <div><strong>Account Number:</strong> 6060197309</div>
            </div>
            <button class="btn btn--gold" onclick="openStoreWhatsApp('${p.title}', ${p.price})" style="width:100%;margin-top:12px;">Send Receipt via WhatsApp</button>
            <button class="btn btn--outline" onclick="closeModal('productModal')" style="width:100%;margin-top:8px;">Close</button>
        </div>`;
    openModal('productModal');
}

function openStoreWhatsApp(title, price) {
    const text = encodeURIComponent(`Hello LAWSA, I have paid for ${title} (₦${price}). Name: [Your Name]. Phone: [Your Phone]. Please confirm receipt.`);
    window.open(`https://wa.me/2347057705284?text=${text}`, '_blank');
}

// ==========================================
// RENDER FUNCTIONS
// ==========================================
function renderAllNews(posts) {
    const grid = document.getElementById('allNewsGrid');
    if (!grid) return;
    if (!posts?.length) { grid.innerHTML = '<div class="news-empty">No posts yet.</div>'; return; }
    grid.innerHTML = posts.map(p => `
        <article class="news-card" onclick="openBlog('${p.id}')">
            <div class="news-card__img"><img src="${p.cover_image_url || 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&q=80'}" alt="${p.title}" loading="lazy"></div>
            <div class="news-card__body">
                <div class="news-card__cat">${p.category || 'News'}</div>
                <h3 class="news-card__title display">${p.title}</h3>
                <p class="news-card__excerpt">${p.excerpt || ''}</p>
                <div class="news-card__meta"><span>${new Date(p.published_at).toLocaleDateString('en-NG',{day:'numeric',month:'short',year:'numeric'})}</span><span class="news-card__arrow">→</span></div>
            </div>
        </article>
    `).join('');
}

function renderRecentNews(posts) {
    const grid = document.getElementById('recentNewsGrid');
    if (!grid) return;
    const recent = (posts || []).slice(0, 3);
    if (!recent.length) return;
    grid.innerHTML = recent.map(p => `
        <article class="news-card" onclick="openBlog('${p.id}')">
            <div class="news-card__img"><img src="${p.cover_image_url || 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&q=80'}" alt="${p.title}" loading="lazy"></div>
            <div class="news-card__body">
                <div class="news-card__cat">${p.category || 'News'}</div>
                <h3 class="news-card__title display">${p.title}</h3>
                <p class="news-card__excerpt">${p.excerpt || ''}</p>
                <div class="news-card__meta"><span>${new Date(p.published_at).toLocaleDateString('en-NG',{day:'numeric',month:'short',year:'numeric'})}</span><span class="news-card__arrow">→</span></div>
            </div>
        </article>
    `).join('');
}

function renderResources(items) {
    const grid = document.getElementById('resourcesGrid');
    if (!grid) return;
    if (!items?.length) { grid.innerHTML = '<p style="padding:var(--s7);color:var(--text-m);text-align:center">No resources yet.</p>'; return; }
    grid.innerHTML = items.map(r => `
        <div class="resource-card" onclick="viewResource('${r.drive_link || '#'}')">
            <div class="resource-badge">${r.academic_level > 0 ? r.academic_level + 'L' : 'GEN'}</div>
            <div class="resource-card__title display">${r.title}</div>
            <div class="resource-card__type">${r.resource_type || ''}</div>
            <div class="resource-card__arrow">→</div>
        </div>
    `).join('');
}

function renderStoreGrid(containerId) {
    const grid = document.getElementById(containerId);
    if (!grid) return;
    grid.innerHTML = STORE_ITEMS.map(item => `
        <article class="store-card" onclick="openProduct('${item.id}')">
            <div class="store-card__img-wrapper">
                <img src="${item.image}" alt="${item.title}" loading="lazy" class="store-card__img">
                <div class="store-card__overlay"></div>
            </div>
            <div class="store-card__body">
                <h3 class="store-card__title">${item.title}</h3>
                <p class="store-card__price">₦${item.price.toLocaleString()}</p>
                <div class="store-card__sku">SKU: ${item.sku}</div>
                <div class="store-card__action">View Details →</div>
            </div>
        </article>
    `).join('');
}

function openBlog(id) {
    const post = state.posts.find(p => p.id === id);
    if (!post) return;
    document.getElementById('blogModalContent').innerHTML = `
        <div class="blog-modal__cover"><img src="${post.cover_image_url || ''}" alt="${post.title}"></div>
        <div class="blog-modal__body">
            <div class="blog-modal__cat">${post.category || ''}</div>
            <h1 class="blog-modal__title">${post.title}</h1>
            <div class="blog-modal__meta">${new Date(post.published_at).toLocaleDateString('en-NG',{dateStyle:'long'})}</div>
            <div class="blog-modal__content">${post.content || ''}</div>
        </div>`;
    openModal('blogModal');
}

// ==========================================
// DUMMY DATA
// ==========================================
function getDummyNews() {
    return [
        { id: 'd1', title: '2025/2026 Dues Payment Now Open', category: 'Announcements', excerpt: 'Association dues payment is now open.', cover_image_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&q=80', published_at: '2026-01-15' },
        { id: 'd2', title: 'Law Week 2026 — Call for Participants', category: 'Events', excerpt: 'LAWSA UNIBEN announces Law Week 2026.', cover_image_url: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=600&q=80', published_at: '2026-02-03' },
        { id: 'd3', title: 'LAWSA Launches Official Digital Platform', category: 'Press', excerpt: 'First of its kind in Edo State.', cover_image_url: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=600&q=80', published_at: '2026-06-22' }
    ];
}

function getDummyResources() {
    return [
        { academic_level: 100, title: 'Law of Contract — Past Questions 2022', resource_type: 'Past Question', drive_link: '#' },
        { academic_level: 100, title: 'Constitutional Law — Lecture Notes', resource_type: 'Lecture Note', drive_link: '#' },
        { academic_level: 200, title: 'Law of Torts — Past Questions 2023', resource_type: 'Past Question', drive_link: '#' },
        { academic_level: 200, title: 'Criminal Law Textbook — Smith & Hogan', resource_type: 'Textbook', drive_link: '#' },
        { academic_level: 300, title: 'Company Law — Past Questions 2022–2024', resource_type: 'Past Question', drive_link: '#' },
        { academic_level: 300, title: 'Evidence Act — Annotated Notes', resource_type: 'Lecture Note', drive_link: '#' },
        { academic_level: 400, title: 'Commercial Law — Past Questions 2023', resource_type: 'Past Question', drive_link: '#' },
        { academic_level: 400, title: 'Jurisprudence — Complete Study Guide', resource_type: 'Reference', drive_link: '#' },
        { academic_level: 500, title: 'Professional Ethics — Bar Prep Notes', resource_type: 'Lecture Note', drive_link: '#' },
        { academic_level: 500, title: 'International Law — Past Questions 2024', resource_type: 'Past Question', drive_link: '#' },
        { academic_level: 0, title: 'Legal Writing Handbook', resource_type: 'Guide', resource_category: 'general', drive_link: '#' }
    ];
}

// ==========================================
// INIT
// ==========================================
async function initApp() {
    console.log('🚀 Initializing LAWSA UNIBEN...');

    // Init router
    Router.init();

    // Footer
    const tpl = document.getElementById('siteFooterTemplate');
    const container = document.getElementById('siteFooterContainer');
    if (tpl && container) {
        container.appendChild(tpl.content.cloneNode(true));
        document.querySelectorAll('.footer-nav a[data-nav]').forEach(a => {
            a.addEventListener('click', e => {
                const nav = e.target.getAttribute('data-nav');
                if (nav) Router.navigate(nav);
            });
        });
    }

    // Load data
    const [posts, resources, leaders] = await Promise.all([
        fetchNewsPosts(),
        fetchResources(),
        fetchLeadership(),
        fetchStoreItems()
    ]);

    // Render
    renderAllNews(posts);
    renderRecentNews(posts);
    renderResources(resources);
    renderStoreGrid('storePreviewGrid');
    renderStoreGrid('storeGrid');

    // Payment form
    const paymentForm = document.getElementById('paymentForm');
    if (paymentForm) {
        paymentForm.addEventListener('submit', handleDuesPayment);
    }

    // Resource filter tabs
    document.querySelectorAll('[data-level]').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('[data-level]').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            const level = this.dataset.level;
            let filtered = state.resources;
            if (level !== 'all') filtered = filtered.filter(r => r.academic_level === parseInt(level));
            renderResources(filtered);
        });
    });

    // Resource category buttons
    document.querySelectorAll('[data-category]').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('[data-category]').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const cat = this.dataset.category;
            let filtered = state.resources;
            if (cat !== 'all') filtered = filtered.filter(r => r.resource_category === cat);
            renderResources(filtered);
        });
    });

    // News filter buttons
    document.querySelectorAll('#newsFilterBar [data-filter]').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('#newsFilterBar [data-filter]').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const filter = this.dataset.filter;
            document.querySelectorAll('.news-full-grid .news-card').forEach(card => {
                const cat = card.querySelector('.news-card__cat')?.textContent?.trim();
                card.style.display = (filter === 'all' || cat === filter) ? '' : 'none';
            });
        });
    });

    // Scroll reveal
    const observer = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('revealed'); });
    }, { threshold: 0.08 });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

    console.log(`✅ ${posts.length} posts | ${resources.length} resources | ${leaders.length} leaders | ${STORE_ITEMS.length} store items`);
}

// ==========================================
// EXPORT EVERYTHING TO WINDOW
// ==========================================
window.closeModal = closeModal;
window.openModal = openModal;
window.toggleMobile = toggleMobile;
window.toggleFaq = toggleFaq;
window.setLeaderBranch = setLeaderBranch;
window.viewResource = viewResource;
window.handleContact = handleContact;
window.handleDuesPayment = handleDuesPayment;
window.openProduct = openProduct;
window.openStoreWhatsApp = openStoreWhatsApp;
window.openBlog = openBlog;
window.renderAllNews = renderAllNews;
window.renderResources = renderResources;
window.renderStoreGrid = renderStoreGrid;
window.Router = Router;

// ==========================================
// GSAP (if loaded)
// ==========================================
if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    window.addEventListener('load', () => {
        gsap.utils.toArray('.wwd-item, .news-card, .stat-cell, .leader-card').forEach(el => {
            gsap.from(el, {
                opacity: 0, y: 30, duration: 0.6, ease: 'power4.out',
                scrollTrigger: { trigger: el, start: 'top 90%', once: true }
            });
        });
    });
}

// ==========================================
// START
// ==========================================
document.addEventListener('DOMContentLoaded', initApp);

console.log('📦 LAWSA app.js loaded — Supabase:', supabase ? '✅' : '⚠️ Dummy mode');
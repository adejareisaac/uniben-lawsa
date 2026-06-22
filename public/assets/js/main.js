// =============================
// LAWSSA UNIBEN MAIN JS (CLEAN)
// =============================

// --- CONFIG ---
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON = 'YOUR_SUPABASE_ANON_KEY';
let supabase = null;
try {
    if (SUPABASE_URL !== 'YOUR_SUPABASE_URL' && window.supabase) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
    }
} catch (e) { }
const state = { posts: [], resources: [], leadership: [], settings: {}, calendar: [] };

// --- UI HELPERS ---
function closeModal(id) {
    document.getElementById(id).classList.remove('modal--active');
    document.body.classList.remove('no-scroll');
    if (id === 'resourceModal') document.getElementById('resourceFrame').src = '';
}
function openModal(id) {
    document.getElementById(id).classList.add('modal--active');
    document.body.classList.add('no-scroll');
}
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
        if (e.target === overlay) closeModal(overlay.id);
    });
});
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.modal--active').forEach(m => closeModal(m.id));
    }
});
globalThis.mobileOpen = false;
function toggleMobile() {
    mobileOpen = !mobileOpen;
    document.getElementById('mobileNav').classList.toggle('open', mobileOpen);
}
function toggleFaq(qEl) {
    const item = qEl.parentElement;
    const wasOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
    if (!wasOpen) item.classList.add('open');
}
function setLeaderBranch(branch, pill) {
    document.querySelectorAll('.branch-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    document.getElementById('executivesPanel').style.display = branch === 'executives' ? '' : 'none';
    document.getElementById('legislativePanel').style.display = branch === 'legislative' ? '' : 'none';
    document.getElementById('judiciaryPanel').style.display = branch === 'judiciary' ? '' : 'none';
    document.getElementById('lsbaPanel').style.display = branch === 'lsba' ? '' : 'none';
    document.getElementById('previousPanel').style.display = branch === 'previous' ? '' : 'none';
}
function viewResource(link) {
    if (!link || link.includes('example')) {
        alert('This resource link is a placeholder. Please contact the admin.');
        return;
    }

    let preview = link.trim();
    if (/drive\.google\.com\/file\/d\//.test(preview)) {
        preview = preview.replace(/\/view.*$/, '/preview');
    } else if (/docs\.google\.com\/document\/d\//.test(preview)) {
        preview = preview.replace(/\/edit.*$/, '/preview');
    } else if (/drive\.google\.com\/open\?id=/.test(preview)) {
        preview = preview.replace(/.*id=([^&]+).*/, 'https://drive.google.com/file/d/$1/preview');
    }

    document.getElementById('resourceFrame').src = preview;
    openModal('resourceModal');
}
function handleContact(e) {
    e.preventDefault();
    openModal('noticeModal');
    document.getElementById('noticeTitle').textContent = 'Message Sent!';
    document.getElementById('noticeBody').textContent = 'Thank you for reaching out. The LAWSSA Executive Council will respond within 48 hours.';
    e.target.reset();
}
// Scroll reveal (for .reveal utility class)
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('revealed'); } });
}, { threshold: 0.08 });
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
// Export helpers
window.closeModal = closeModal;
window.openModal = openModal;
window.toggleMobile = toggleMobile;
window.toggleFaq = toggleFaq;
window.setLeaderBranch = setLeaderBranch;
window.viewResource = viewResource;
window.handleContact = handleContact;
window.state = state;
window.supabase = supabase;

// Inject unified footer from template
document.addEventListener('DOMContentLoaded', () => {
  const tpl = document.getElementById('siteFooterTemplate');
  const container = document.getElementById('siteFooterContainer');
  if (tpl && container) container.appendChild(tpl.content.cloneNode(true));
  // wire footer nav links
  document.querySelectorAll('.footer-nav a[data-nav]').forEach(a => a.addEventListener('click', e => { const nav = e.target.getAttribute('data-nav'); if (nav) Router.navigate(nav); }));
});

// --- GSAP ANIMATIONS ---
// --- GSAP ANIMATIONS ---
if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);

    // HERO ENTRANCE & PARALLAX
    function animateHero() {
        const targets = '.hero__title span, .hero__subtitle, .hero__actions .btn';

        gsap.set(targets, { opacity: 0, y: 40 });

        gsap.timeline({ defaults: { ease: 'power4.out' } })
            .to('.hero__title span', {
                opacity: 1,
                y: 0,
                stagger: 0.08,
                duration: 0.7
            })
            .to('.hero__subtitle', {
                opacity: 1,
                y: 0,
                duration: 0.6
            }, '-=0.3')
            .to('.hero__actions .btn', {
                opacity: 1,
                y: 0,
                stagger: 0.1,
                duration: 0.5
            }, '-=0.4');

        gsap.to('.hero__big-word', {
            y: -60,
            scale: 1.12,
            opacity: 0.12,
            ease: 'none',
            scrollTrigger: {
                trigger: '.hero',
                start: 'top top',
                end: 'bottom top',
                scrub: true
            }
        });
    }

    // TICKERS: Infinite Loop
    function animateTickers() {
        const isMobile = window.innerWidth < 768;
        
        const ticker = document.querySelector('.ticker__track');
        if (ticker) {
            const width = ticker.scrollWidth / 2;
            const duration = (width / 1200) * 35;
            gsap.to(ticker, { x: -width, duration: duration, ease: 'none', repeat: -1, paused: false, overwrite: true });
        }
        const heroTicker = document.querySelector('.hero__bottom-track');
        if (heroTicker) {
            const width = heroTicker.scrollWidth / 2;
            const duration = (width / 1200) * 40;
            gsap.to(heroTicker, { x: -width, duration: duration, ease: 'none', repeat: -1, paused: false, overwrite: true });
        }
    }

    // REVEALS: Fade-in-up Stagger
    function animateReveals() {
        // WHAT WE DO: fly in from left
        gsap.utils.toArray('.wwd-item').forEach((el) => {
            gsap.from(el, {
                opacity: 0,
                x: -100,
                duration: 0.7,
                ease: 'power4.out',
                scrollTrigger: {
                    trigger: el,
                    start: 'top 85%',
                    once: true
                },
            });
        });
        // NEWS: fade in up (classic)
        gsap.utils.toArray('.news-card').forEach((el) => {
            gsap.from(el, {
                opacity: 0,
                y: 40,
                duration: 0.7,
                ease: 'power4.out',
                scrollTrigger: {
                    trigger: el,
                    start: 'top 85%',
                    toggleActions: 'play none none none',
                    once: true
                },
            });
        });
        // LEADERS: alternate angles
        gsap.utils.toArray('.leader-card').forEach((el, i) => {
            gsap.from(el, {
                opacity: 0,
                x: i % 2 === 0 ? 50 : -50,
                duration: 0.7,
                ease: 'power4.out',
                scrollTrigger: {
                    trigger: el,
                    start: 'top 85%',
                    once: true
                },
            });
        });
        // STATS: scale up
        gsap.utils.toArray('.stat-cell').forEach((el) => {
            gsap.from(el, {
                opacity: 0,
                scale: 0.8,
                duration: 0.7,
                ease: 'power4.out',
                scrollTrigger: {
                    trigger: el,
                    start: 'top 85%',
                    once: true
                },
            });
        });
    }

    // STATS: Number Counting
    function animateStats() {
        document.querySelectorAll('.stat-cell__num').forEach(cell => {
            const end = parseInt(cell.textContent.replace(/\D/g, '')) || 0;
            if (!end) return;
            ScrollTrigger.create({
                trigger: cell, 
                start: 'top 85%', 
                once: true,
                onEnter: () => {
                    gsap.fromTo(
                        { val: 0 },
                        {
                            val: end, 
                            duration: 1.2, 
                            ease: 'power4.out',
                            onUpdate: function () {
                                cell.textContent = end > 99 ? Math.floor(this.targets()[0].val) + '+' : Math.floor(this.targets()[0].val);
                            }
                        }
                    );
                }
            });
        });
    }

    // PRESIDENT: Image Reveal & Text Stagger
    function animatePresident() {
        gsap.from('.pres-image-col img', {
            scale: 1.12, clipPath: 'inset(30% 0 30% 0)', opacity: 0, duration: 0.8, ease: 'power4.out',
            scrollTrigger: { trigger: '.pres-image-col', start: 'top 85%', toggleActions: 'play none none none', once: true }
        });
        const presText = document.querySelector('.pres-message-text');
        if (presText) {
            const originalHtml = presText.innerHTML;
            const fragments = originalHtml.split(/(<br\s*\/?>)/gi);
            presText.innerHTML = fragments.map(fragment => {
                if (/^<br/i.test(fragment)) return fragment;
                return fragment
                    .trim()
                    .split(/\s+/)
                    .filter(Boolean)
                    .map(word => `<span class='pres-word'>${word}</span>`)
                    .join(' ');
            }).join(' ');
            gsap.set('.pres-word', { opacity: 0, y: 24 });
            gsap.to('.pres-word', {
                opacity: 1,
                y: 0,
                stagger: 0.008,
                duration: 0.3,
                ease: 'power4.out',
                scrollTrigger: { trigger: presText, start: 'top 85%', toggleActions: 'play none none none', once: true }
            });
        }
    }

    // FORCE ANIMATIONS TO TRIGGER ON LOAD
    function triggerVisibleAnimations() {
        // Get all elements that should animate
        const revealElements = document.querySelectorAll('.wwd-item, .news-card, .leader-card, .stat-cell');
        
        revealElements.forEach(el => {
            const rect = el.getBoundingClientRect();
            // If element is in viewport, manually trigger animation
            if (rect.top < window.innerHeight && rect.bottom > 0) {
                el.style.opacity = '1';
                el.style.transform = 'none';
            }
        });
    }

    // INIT ALL
    window.addEventListener('DOMContentLoaded', () => {
        animateHero();
        animateTickers();
        animateReveals();
        animateStats();
        animatePresident();
        
        // Wait a bit then refresh scroll triggers
        setTimeout(() => {
            if (window.ScrollTrigger) {
                ScrollTrigger.refresh();
            }
            triggerVisibleAnimations();
        }, 100);
    });

    window.addEventListener('pageshow', () => {
        if (window.ScrollTrigger) {
            requestAnimationFrame(() => {
                ScrollTrigger.refresh();
                triggerVisibleAnimations();
            });
        }
    });
}

// Ensure GSAP is loaded in your project
// <script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js"></script>

document.addEventListener('DOMContentLoaded', function () {
    const marquee = document.getElementById('heroMarquee');
    if (marquee && window.gsap) {
        const marqueeContent = marquee.innerHTML;
        marquee.innerHTML += marqueeContent;
        const marqueeWidth = marquee.scrollWidth / 2;
        gsap.to(marquee, {
            x: -marqueeWidth,
            duration: 18,
            ease: "none",
            repeat: -1,
            modifiers: {
                x: gsap.utils.unitize(x => parseFloat(x) % marqueeWidth)
            }
        });
    }

    // Ensure store preview and resources filters are wired
    if (window.renderStoreGrid) renderStoreGrid('storePreviewGrid');
    if (window.renderStoreGrid) renderStoreGrid('storeGrid');

    const defaultResources = [
        { title: 'Law of Contract — Past Questions 2022', academic_level: 100, resource_type: 'Past Question', resource_category: 'faculty', drive_link: 'https://drive.google.com/file/d/example/view' },
        { title: 'Constitutional Law — Lecture Notes', academic_level: 100, resource_type: 'Lecture Note', resource_category: 'faculty', drive_link: 'https://drive.google.com/file/d/example/view' },
        { title: 'General Study Guide — Legal Writing', academic_level: 0, resource_type: 'Reference', resource_category: 'general', drive_link: 'https://drive.google.com/file/d/example/view' },
        { title: 'Law of Torts — Past Questions 2023', academic_level: 200, resource_type: 'Past Question', resource_category: 'faculty', drive_link: 'https://drive.google.com/file/d/example/view' },
        { title: 'Criminal Law Textbook — Smith & Hogan', academic_level: 200, resource_type: 'Textbook', resource_category: 'faculty', drive_link: 'https://drive.google.com/file/d/example/view' },
        { title: 'Student Life Handbook — Campus Success', academic_level: 0, resource_type: 'Guide', resource_category: 'general', drive_link: 'https://drive.google.com/file/d/example/view' },
        { title: 'Company Law — Past Questions 2022–2024', academic_level: 300, resource_type: 'Past Question', resource_category: 'faculty', drive_link: 'https://drive.google.com/file/d/example/view' },
        { title: 'Jurisprudence — Complete Study Guide', academic_level: 300, resource_type: 'Reference', resource_category: 'faculty', drive_link: 'https://drive.google.com/file/d/example/view' },
        { title: 'Professional Ethics — Bar Prep Notes', academic_level: 500, resource_type: 'Lecture Note', resource_category: 'faculty', drive_link: 'https://drive.google.com/file/d/example/view' },
        { title: 'Taxation Law — Past Questions 2022–2024', academic_level: 500, resource_type: 'Past Question', resource_category: 'faculty', drive_link: 'https://drive.google.com/file/d/example/view' }
    ];

    if (window.state.resources.length === 0) {
        window.state.resources = defaultResources;
    }
    if (window.renderResources) renderResources(window.state.resources);

    const levelTabs = document.querySelectorAll('[data-level]');
    const categoryBtns = document.querySelectorAll('[data-category]');
    const levelTabWrapper = document.querySelector('.resources-level-tabs');

    function updateLevelTabVisibility(category) {
        if (!levelTabWrapper) return;
        if (category === 'faculty') {
            levelTabWrapper.classList.add('visible');
        } else {
            levelTabWrapper.classList.remove('visible');
            document.querySelectorAll('[data-level]').forEach(t => t.classList.remove('active'));
            document.querySelector('[data-level="all"]')?.classList.add('active');
        }
    }

    function applyResourceFilters() {
        const category = document.querySelector('[data-category].active')?.getAttribute('data-category') || 'all';
        const level = document.querySelector('[data-level].active')?.getAttribute('data-level') || 'all';
        let filtered = window.state.resources;
        if (category !== 'all') filtered = filtered.filter(r => r.resource_category === category);
        if (category === 'faculty' && level !== 'all') filtered = filtered.filter(r => r.academic_level === parseInt(level, 10));
        if (window.renderResources) renderResources(filtered);
    }

    if (categoryBtns) {
        categoryBtns.forEach(btn => {
            btn.addEventListener('click', function () {
                categoryBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                updateLevelTabVisibility(this.getAttribute('data-category'));
                applyResourceFilters();
            });
        });
    }

    if (levelTabs) {
        levelTabs.forEach(tab => {
            tab.addEventListener('click', function () {
                levelTabs.forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                applyResourceFilters();
            });
        });
    }

    updateLevelTabVisibility('all');

    const newsFilterBtns = document.querySelectorAll('#newsFilterBar [data-filter]');
    if (newsFilterBtns) {
        newsFilterBtns.forEach(btn => {
            btn.addEventListener('click', function () {
                newsFilterBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                const filter = this.getAttribute('data-filter');
                document.querySelectorAll('.news-full-grid .news-card').forEach(card => {
                    const category = card.querySelector('.news-card__cat')?.textContent?.trim();
                    card.style.display = filter === 'all' || category === filter ? '' : 'none';
                });
            });
        });
    }
});
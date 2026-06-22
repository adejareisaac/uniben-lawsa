// API and data rendering logic for LAWSSA UNIBEN
// Handles Supabase data, rendering, and payment

function renderAllNews(posts) {
  const g = document.getElementById('allNewsGrid');
  if (!posts.length) { g.innerHTML = '<div class="news-empty">No posts found.</div>'; return; }
  g.innerHTML = posts.map(p => `
    <article class="news-card" onclick="openBlog('${p.id}')" style="cursor:pointer">
      <div class="news-card__img"><img src="${p.cover_image_url || 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&q=80'}" alt="" loading="lazy"></div>
      <div class="news-card__body">
        <div class="news-card__cat">${p.category || 'News'}</div>
        <h3 class="news-card__title display">${p.title}</h3>
        <p class="news-card__excerpt">${p.excerpt || ''}</p>
        <div class="news-card__meta"><span>${new Date(p.published_at).toLocaleDateString('en-NG',{day:'numeric',month:'short',year:'numeric'})}</span><span class="news-card__arrow">→</span></div>
      </div>
    </article>`).join('');
}

function renderResources(items) {
  const g = document.getElementById('resourcesGrid');
  if (!items.length) { g.innerHTML = '<p style="padding:var(--s7);color:var(--text-m);">No resources found for this level.</p>'; return; }
  g.innerHTML = items.map(r => `
    <div class="resource-card" data-level="${r.academic_level}" data-type="${r.resource_type || ''}" onclick="viewResource('${r.drive_link}')">
      <div class="resource-badge">${r.academic_level}L</div>
      <div class="resource-card__title display">${r.title}</div>
      <div class="resource-card__type">${r.resource_type || ''}</div>
      <div class="resource-card__arrow">→</div>
    </div>`).join('');
}

function openBlog(id) {
  const post = window.state.posts.find(p => p.id === id);
  if (!post) return;
  const el = document.getElementById('blogModalContent');
  el.innerHTML = `
    <div class="blog-modal__cover"><img src="${post.cover_image_url || ''}" alt="${post.title}"></div>
    <div class="blog-modal__body">
      <div class="blog-modal__cat">${post.category || 'News'}</div>
      <h1 class="blog-modal__title">${post.title}</h1>
      <div class="blog-modal__meta">By ${post.author || 'LAWSSA UNIBEN'} · ${new Date(post.published_at).toLocaleDateString('en-NG',{dateStyle:'long'})}</div>
      <div class="blog-modal__content">${DOMPurify.sanitize(post.content)}</div>
    </div>`;
  openModal('blogModal');
}

window.renderAllNews = renderAllNews;
window.renderResources = renderResources;
window.openBlog = openBlog;

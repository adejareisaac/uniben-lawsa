console.log("RUNNING FILE:", location.href);
console.log("VERSION: 2026-06-26 16:30");

// ═══════════════ SUPABASE INITIALIZATION ═══════════════

if (!window.supabase) {
    throw new Error(
        "Supabase library was not found.\n" +
        "Check that the CDN script is loaded before admin.js"
    );
}

const SUPABASE_URL = "https://zexamxpnccxsrxlcgosh.supabase.co";
const SUPABASE_ANON = "sb_publishable_6GeUzm1SYyFgvaWBOJGKeA_MmZMtSJl";
const STORAGE_BUCKET = "lawsa-assets";

// Renamed instance to supabaseClient to permanently avoid global naming collisions
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// ═══════════════ SECURITY & SESSION SHIELD ═══════════════
// Enforces that users must be logged in to access this workspace
async function enforceSecureSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        console.warn("Unauthorized – routing to login");
        window.location.href = 'login.html';
    } else {
        console.log("Session verified for:", session.user.email);
        // Update sidebar user info
        updateSidebarUser(session.user);
    }
}

async function updateSidebarUser(user) {
    const userEmail = user.email;
    // Get admin role
    const { data: adminData } = await supabaseClient
        .from('admin_users')
        .select('role, full_name')
        .eq('email', userEmail)
        .single();

    // Get leader info (if exists)
    const { data: leaderData } = await supabaseClient
        .from('leadership')
        .select('image_url, full_name')
        .eq('email', userEmail)
        .single();

    const userName = adminData?.full_name || leaderData?.full_name || userEmail;
    const avatarImg = leaderData?.image_url || null;
    const role = adminData?.role || 'viewer';

    // Update sidebar
    const sidebarUserName = document.getElementById('sidebarUserName');
    const sidebarUserRole = document.getElementById('sidebarUserRole');
    const sidebarAvatar = document.getElementById('sidebarAvatar');

    if (sidebarUserName) sidebarUserName.textContent = userName;
    if (sidebarUserRole) sidebarUserRole.textContent = role.replace('_', ' ');
    if (sidebarAvatar) {
        if (avatarImg) {
            sidebarAvatar.innerHTML = `<img src="${avatarImg}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;">`;
        } else {
            sidebarAvatar.textContent = userName.charAt(0).toUpperCase();
        }
    }

    // Store role globally for permission checks
    window.currentUserRole = role;
}
enforceSecureSession();



// Connection Test
(async () => {
    try {
        const { error } = await supabaseClient.from("academic_sessions").select("id").limit(1);
        if (error) {
            console.error("Database connection failed:", error);
        } else {
            console.log("✅ Database core connected successfully");
        }
    } catch (err) {
        console.error("System connection fault:", err);
    }
})();

// ═══════════════ STATE ═══════════════
let currentPage = 'dashboard';
let paymentPasscodeVerified = false;   // for the passcode gate
const pageRenderers = {};
const pageLoaders = {};

function registerPage(name, renderer, loader) {
    pageRenderers[name] = renderer;
    if (loader) pageLoaders[name] = loader;
}

// ═══════════════ NAVIGATION ═══════════════
window.navigateTo = function (pageName) {
    currentPage = pageName;
    document.querySelectorAll('.sidebar-link').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === pageName);
    });
    if (pageRenderers[pageName]) {
        document.getElementById('mainContent').innerHTML = pageRenderers[pageName]();
    }
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.remove('open');
    const toggle = document.getElementById('mobileToggle');
    if (toggle) {
        toggle.classList.remove('open');
        toggle.innerHTML = '☰';
    }
    document.getElementById('mainContent').scrollTop = 0;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (pageLoaders[pageName]) {
        setTimeout(() => pageLoaders[pageName](), 100);
    }
};

window.toggleSidebar = function () {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.getElementById('mobileToggle');
    const isOpen = sidebar.classList.toggle('open');

    if (toggle) {
        toggle.classList.toggle('open', isOpen);
        toggle.innerHTML = isOpen ? '✕' : '☰';
    }
};

async function logout() {
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
        showToast("Logout failed: " + error.message, 'error');
    } else {
        window.location.href = 'login.html';
    }
}

// ═══════════════ HELPERS ═══════════════
window.closeModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.remove();
};

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.style.cssText = `
    position: fixed; bottom: 24px; right: 24px; z-index: 999;
    background: ${type === 'success' ? 'var(--success)' : 'var(--danger)'};
    color: white; padding: 12px 24px; border-radius: 40px;
    font-weight: 600; font-size: 0.85rem; box-shadow: 0 8px 24px rgba(0,0,0,0.2);
    animation: slideUp 0.3s ease;
  `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ═══════════════ LOADING BUTTON HELPER ═══════════════
function setButtonLoading(btn, isLoading) {
    if (!btn) return;
    if (isLoading) {
        btn.disabled = true;
        btn.classList.add('is-loading');
        // Store original text if not already stored
        if (!btn.dataset.originalText) {
            btn.dataset.originalText = btn.innerHTML;
        }
        btn.innerHTML = `<span class="spinner"></span> Saving…`;
    } else {
        btn.disabled = false;
        btn.classList.remove('is-loading');
        if (btn.dataset.originalText) {
            btn.innerHTML = btn.dataset.originalText;
            delete btn.dataset.originalText;
        }
    }
}

async function verifyPaymentPasscode(input) {
    const { data, error } = await supabaseClient
        .from('site_settings')
        .select('value')
        .eq('key', 'dues_passcode')
        .single();
    if (error || !data) return false;
    return data.value === input;
}

async function uploadImage(file) {
    if (!file) return null;
    const ext = file.name.split('.').pop();
    const path = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { data, error } = await supabaseClient.storage.from(STORAGE_BUCKET).upload(path, file);
    if (error) {
        console.error('Upload error:', error);
        showToast("Storage upload failed: " + error.message, 'error');
        return null;
    }
    const { data: urlData } = supabaseClient.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    return urlData.publicUrl;
}

function previewImage(file, previewElementId) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        const el = document.getElementById(previewElementId);
        if (el) el.innerHTML = `<img src="${e.target.result}" style="max-width:200px;max-height:200px;border-radius:8px;">`;
    };
    reader.readAsDataURL(file);
}

function setupDragDrop(dropZoneId, fileInputId, previewId, fileVarName) {
    const dropZone = document.getElementById(dropZoneId);
    if (!dropZone) return;
    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.style.borderColor = 'var(--gold)'; });
    dropZone.addEventListener('dragleave', () => dropZone.style.borderColor = '');
    dropZone.addEventListener('drop', e => {
        e.preventDefault();
        dropZone.style.borderColor = '';
        const file = e.dataTransfer.files[0];
        if (file) {
            window[fileVarName] = file;
            previewImage(file, previewId);
        }
    });
}

// ═══════════════ 1. DASHBOARD ═══════════════
registerPage('dashboard', () => `
  <div class="page-header">
    <div class="page-title-group">
      <div class="page-breadcrumb">Home / Overview</div>
      <div class="page-title">Dash<span class="gold">board</span></div>
    </div>
    <div class="header-actions">
      <button class="btn btn-outline" onclick="navigateTo('sessions')">📅 Manage Sessions</button>
      <button class="btn btn-gold" onclick="navigateTo('content')">✏️ New Post</button>
    </div>
  </div>
  <div class="stats-grid" id="dashboardStats">
    <div class="stat-card"><div class="stat-icon navy">📅</div><div class="stat-content"><span class="stat-label">Academic Sessions</span><span class="stat-value" id="statSessions">—</span></div></div>
    <div class="stat-card"><div class="stat-icon gold">👥</div><div class="stat-content"><span class="stat-label">Leadership Members</span><span class="stat-value" id="statLeaders">—</span></div></div>
    <div class="stat-card"><div class="stat-icon green">📰</div><div class="stat-content"><span class="stat-label">News Posts</span><span class="stat-value" id="statNews">—</span></div></div>
    <div class="stat-card"><div class="stat-icon blue">📚</div><div class="stat-content"><span class="stat-label">Resources</span><span class="stat-value" id="statResources">—</span></div></div>
    <div class="stat-card"><div class="stat-icon gold">💰</div><div class="stat-content"><span class="stat-label">Payments</span><span class="stat-value" id="statPayments">—</span></div></div>
    <div class="stat-card"><div class="stat-icon navy">🛒</div><div class="stat-content"><span class="stat-label">Store Items</span><span class="stat-value" id="statStore">—</span></div></div>
  </div>
  <div class="card">
    <div class="card-header"><div class="card-title">Quick Actions</div></div>
    <div style="display:flex;gap:var(--s3);flex-wrap:wrap;">
      <button class="btn btn-primary" onclick="navigateTo('sessions')">📅 Add Session</button>
      <button class="btn btn-gold" onclick="navigateTo('leadership')">👤 Add Leader</button>
      <button class="btn btn-outline" onclick="navigateTo('content')">📝 Write Post</button>
      <button class="btn btn-outline" onclick="navigateTo('resources')">📚 Upload Resource</button>
      <button class="btn btn-outline" onclick="navigateTo('store')">🛒 Add Product</button>
    </div>
  </div>
`, async () => {
    const tables = ['academic_sessions', 'leadership', 'news_posts', 'resources', 'payments', 'store_items'];
    const counts = await Promise.all(tables.map(t => supabaseClient.from(t).select('id', { count: 'exact', head: true })));
    const ids = ['statSessions', 'statLeaders', 'statNews', 'statResources', 'statPayments', 'statStore'];
    ids.forEach((id, i) => {
        const el = document.getElementById(id);
        if (el) el.textContent = counts[i]?.count ?? '—';
    });
});

// ═══════════════ 2. SESSIONS ═══════════════
registerPage('sessions', () => `
  <div class="page-header">
    <div class="page-title-group"><div class="page-breadcrumb">Management / Academic</div><div class="page-title">Academic <span class="gold">Sessions</span></div></div>
    <div class="header-actions"><button class="btn btn-gold" onclick="openSessionModal()">+ Add New Session</button></div>
  </div>
  <div class="card">
    <div class="card-header"><div class="card-title">All Sessions</div></div>
    <div class="table-wrapper"><table><thead><tr><th>Session Name</th><th>Start Date</th><th>End Date</th><th>Status</th><th>Actions</th></tr></thead><tbody id="sessionsTableBody"></tbody></table></div>
  </div>
`, async () => {
    const { data, error } = await supabaseClient.from('academic_sessions').select('*').order('created_at', { ascending: false });
    if (error) return console.error(error);
    const tbody = document.getElementById('sessionsTableBody');
    if (!data?.length) {
        tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-state-icon">📅</div><div class="empty-state-title">No Sessions Yet</div><button class="btn btn-gold" onclick="openSessionModal()">+ Create First Session</button></div></td></tr>`;
        return;
    }
    tbody.innerHTML = data.map(s => `
    <tr><td><strong>${s.name}</strong></td><td>${s.start_date || '—'}</td><td>${s.end_date || '—'}</td>
    <td><span class="badge ${s.is_active ? 'badge-success' : 'badge-default'}">${s.is_active ? 'Active' : 'Inactive'}</span></td>
    <td><button class="btn btn-outline btn-sm" onclick="openSessionModal('${s.id}')">Edit</button> <button class="btn btn-danger btn-sm" onclick="deleteSession('${s.id}')">Delete</button></td></tr>
  `).join('');
});

window.openSessionModal = function (id = null) {
    document.getElementById('modalContainer').innerHTML = `
    <div class="modal-overlay" id="sessionModal"><div class="modal-box">
      <div class="modal-header"><div class="modal-title">${id ? 'Edit' : 'New'} Session</div><button class="modal-close" onclick="closeModal('sessionModal')">✕</button></div>
      <form onsubmit="saveSession(event, '${id || ''}')">
        <div class="form-group"><label class="form-label">Session Name *</label><input class="form-input" id="sessName" required></div>
        <div class="form-group"><label class="form-label">Start Date</label><input class="form-input" type="date" id="sessStart"></div>
        <div class="form-group"><label class="form-label">End Date</label><input class="form-input" type="date" id="sessEnd"></div>
        <div class="form-group"><label><input type="checkbox" id="sessActive"> Mark as Active</label></div>
        <div style="display:flex;gap:var(--s3);"><button type="submit" class="btn btn-gold">💾 Save</button><button type="button" class="btn btn-outline" onclick="closeModal('sessionModal')">Cancel</button></div>
      </form>
    </div></div>`;
    if (id) {
        supabaseClient.from('academic_sessions').select('*').eq('id', id).single().then(({ data }) => {
            if (data) {
                document.getElementById('sessName').value = data.name || '';
                document.getElementById('sessStart').value = data.start_date || '';
                document.getElementById('sessEnd').value = data.end_date || '';
                document.getElementById('sessActive').checked = data.is_active || false;
            }
        });
    }
};

window.saveSession = async function (event, id) {
    event.preventDefault();
    const payload = { name: document.getElementById('sessName').value, start_date: document.getElementById('sessStart').value, end_date: document.getElementById('sessEnd').value, is_active: document.getElementById('sessActive').checked };

    const { error } = id
        ? await supabaseClient.from('academic_sessions').update(payload).eq('id', id)
        : await supabaseClient.from('academic_sessions').insert(payload);

    if (error) {
        console.error("Database save exception:", error);
        showToast("Failed to save: " + error.message, 'error');
    } else {
        closeModal('sessionModal');
        showToast(id ? 'Updated successfully!' : 'Created successfully!');
        navigateTo('sessions');
    }
};

window.deleteSession = async function (id) {
    if (!confirm('Delete this session?')) return;
    const { error } = await supabaseClient.from('academic_sessions').delete().eq('id', id);
    if (error) {
        showToast("Deletion failed: " + error.message, 'error');
    } else {
        showToast('Deleted item!', 'error');
        navigateTo('sessions');
    }
};

// ═══════════════ 3. LEADERSHIP ═══════════════
registerPage('leadership', () => `
  <div class="page-header">
    <div class="page-title-group"><div class="page-breadcrumb">Management / People</div><div class="page-title">Leader<span class="gold">ship</span></div></div>
    <div class="header-actions"><button class="btn btn-gold" onclick="openLeaderModal()">+ Add Leader</button></div>
  </div>
  <div class="card">
    <div class="card-header"><div class="card-title">Leadership Directory</div></div>
    <div class="table-wrapper"><table><thead><tr><th></th><th>Name</th><th>Role</th><th>Branch</th><th>Actions</th></tr></thead><tbody id="leadersTableBody"></tbody></table></div>
  </div>
`, async () => {
    const { data, error } = await supabaseClient.from('leadership').select('*').order('display_order');
    if (error) return console.error(error);
    const tbody = document.getElementById('leadersTableBody');
    if (!data?.length) {
        tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-state-icon">👥</div><div class="empty-state-title">No Leaders</div><button class="btn btn-gold" onclick="openLeaderModal()">+ Add First Leader</button></div></td></tr>`;
        return;
    }
    tbody.innerHTML = data.map(l => `
    <tr>
      <td>${l.image_url ? `<img src="${l.image_url}" class="preview-thumb">` : '—'}</td>
      <td><strong>${l.full_name}</strong></td><td>${l.role}</td>
      <td><span class="badge badge-info">${l.branch}</span></td>
      <td><button class="btn btn-outline btn-sm" onclick="openLeaderModal('${l.id}')">Edit</button> <button class="btn btn-danger btn-sm" onclick="deleteLeader('${l.id}')">Delete</button></td>
    </tr>
  `).join('');
});

window.openLeaderModal = function (id = null) {
    document.getElementById('modalContainer').innerHTML = `
    <div class="modal-overlay" id="leaderModal"><div class="modal-box">
      <div class="modal-header"><div class="modal-title">${id ? 'Edit' : 'New'} Leader</div><button class="modal-close" onclick="closeModal('leaderModal')">✕</button></div>
      <form onsubmit="saveLeader(event, '${id || ''}')">
        <div class="form-group"><label class="form-label">Photo</label>
          <div class="image-upload-area" id="leaderDropZone" onclick="document.getElementById('leaderFileInput').click()">
            <div id="leaderPreview">📷 Click or drag photo here</div>
            <input type="file" id="leaderFileInput" accept="image/*" style="display:none" onchange="handleLeaderFile(event)">
          </div>
        </div>
        <div class="form-group"><label class="form-label">Full Name *</label><input class="form-input" id="lname" required></div>
        <div class="form-group">
  <label class="form-label">Role *</label>
  <select class="form-select" id="lroleSelect" onchange="handleRoleChange()">
    <option value="">— Select Role —</option>
    <option value="President">President</option>
    <option value="Vice President">Vice President</option>
    <option value="Secretary General">Secretary General</option>
    <option value="Assistant Secretary General">Assistant Secretary General</option>
    <option value="Attorney General">Attorney General</option>
    <option value="Public Relations Officer">Public Relations Officer</option>
    <option value="Director of Finance">Director of Finance</option>
    <option value="Assistant Director of Finance">Assistant Director of Finance</option>
    <option value="Director of Sports">Director of Sports</option>
    <option value="Director of Socials">Director of Socials</option>
    <option value="Provost">Provost</option>
    <option value="Chief Whip">Chief Whip</option>
    <option value="Other">Other (specify)</option>
  </select>
  <input class="form-input" id="lroleCustom" placeholder="Enter custom role" style="display:none; margin-top:var(--s2);">
</div>
        <div class="form-group"><label class="form-label">Branch</label><select class="form-select" id="lbranch"><option value="executive">Executive</option><option value="legislative">Legislative</option><option value="judiciary">Judiciary</option><option value="lsba">LSBA</option><option value="previous">Previous Presidents</option></select></div>
        <div class="form-group"><label class="form-label">Session</label><input class="form-input" id="lsession"></div>
        <div class="form-group"><label class="form-label">Instagram URL</label><input class="form-input" id="lig"></div>
        <div class="form-group"><label class="form-label">Display Order</label><input class="form-input" type="number" id="lorder" value="0"></div>
        <div class="form-group"><label class="form-label">Bio</label><textarea class="form-textarea" id="lbio" rows="3"></textarea></div>
        <div class="form-group" id="presMessageGroup" style="display:none;">
  <label class="form-label">President's Welcome Message</label>
  <textarea class="form-textarea" id="lpresmsg" rows="4" placeholder="This message appears on the homepage..."></textarea>
</div>
        <div style="display:flex;gap:var(--s3);"><button type="submit" class="btn btn-gold">💾 Save</button><button type="button" class="btn btn-outline" onclick="closeModal('leaderModal')">Cancel</button></div>
      </form>
    </div></div>`;
    window._leaderFile = null;
    setupDragDrop('leaderDropZone', 'leaderFileInput', 'leaderPreview', '_leaderFile');
    if (id) {
        supabaseClient.from('leadership').select('*').eq('id', id).single().then(({ data }) => {
            if (data) {
                document.getElementById('lname').value = data.full_name || '';
                // After setting other fields, handle role dropdown
                const roleSelect = document.getElementById('lroleSelect');
                const customInput = document.getElementById('lroleCustom');
                const existingRole = data.role || '';
                if (roleSelect.querySelector(`option[value="${existingRole}"]`)) {
                    roleSelect.value = existingRole;
                    customInput.style.display = 'none';
                } else {
                    roleSelect.value = 'Other';
                    customInput.style.display = 'block';
                    customInput.value = existingRole;
                }
                document.getElementById('lbranch').value = data.branch || 'executive';
                document.getElementById('lsession').value = data.session || '';
                document.getElementById('lig').value = data.instagram_url || '';
                document.getElementById('lorder').value = data.display_order || 0;
                document.getElementById('lbio').value = data.bio || '';
                // President's message
                if (document.getElementById('lpresmsg')) {
                    document.getElementById('lpresmsg').value = data.president_message || '';
                }
                // Trigger role change to show/hide the field
                if (typeof handleRoleChange === 'function') handleRoleChange();
                if (data.image_url) document.getElementById('leaderPreview').innerHTML = `<img src="${data.image_url}" style="max-width:200px;border-radius:8px;">`;
            }
        });

        const roleSelect = document.getElementById('lroleSelect');
        const customInput = document.getElementById('lroleCustom');
        const existingRole = data.role || '';
        if (roleSelect.querySelector(`option[value="${existingRole}"]`)) {
            roleSelect.value = existingRole;
            customInput.style.display = 'none';
        } else {
            roleSelect.value = 'Other';
            customInput.style.display = 'block';
            customInput.value = existingRole;
        }
    }
};

window.handleLeaderFile = function (event) {
    const file = event.target.files[0];
    if (file) { window._leaderFile = file; previewImage(file, 'leaderPreview'); }
};

window.saveLeader = async function (event, id) {
    event.preventDefault();
    const payload = {
        full_name: document.getElementById('lname').value,
        role: document.getElementById('lroleSelect').value === 'Other'
            ? document.getElementById('lroleCustom').value
            : document.getElementById('lroleSelect').value,
        branch: document.getElementById('lbranch').value,
        session: document.getElementById('lsession').value,
        instagram_url: document.getElementById('lig').value,
        display_order: parseInt(document.getElementById('lorder').value) || 0,
        bio: document.getElementById('lbio').value,
        president_message: document.getElementById('lpresmsg')?.value || '',
    };
    if (window._leaderFile) {
        const url = await uploadImage(window._leaderFile);
        if (url) payload.image_url = url;
        window._leaderFile = null;
    }

    const { error } = id
        ? await supabaseClient.from('leadership').update(payload).eq('id', id)
        : await supabaseClient.from('leadership').insert(payload);

    if (error) {
        showToast("Failed to save leader: " + error.message, 'error');
    } else {
        closeModal('leaderModal');
        showToast(id ? 'Updated directory!' : 'Added member!');
        navigateTo('leadership');
    }
};

window.deleteLeader = async function (id) {
    if (!confirm('Delete this leader?')) return;
    const { error } = await supabaseClient.from('leadership').delete().eq('id', id);
    if (error) {
        showToast("Delete failed: " + error.message, 'error');
    } else {
        showToast('Deleted!', 'error');
        navigateTo('leadership');
    }
};

// ═══════════════ 4. NEWS & CONTENT ═══════════════
registerPage('content', () => `
  <div class="page-header">
    <div class="page-title-group"><div class="page-breadcrumb">Management / Content</div><div class="page-title">News & <span class="gold">Content</span></div></div>
    <div class="header-actions"><button class="btn btn-gold" onclick="openNewsModal()">+ New Post</button></div>
  </div>
  <div class="card">
    <div class="card-header"><div class="card-title">All Posts</div></div>
    <div class="table-wrapper"><table><thead><tr><th></th><th>Title</th><th>Category</th><th>Date</th><th>Actions</th></tr></thead><tbody id="newsTableBody"></tbody></table></div>
  </div>
`, async () => {
    const { data, error } = await supabaseClient.from('news_posts').select('*').order('published_at', { ascending: false });
    if (error) return console.error(error);
    const tbody = document.getElementById('newsTableBody');
    if (!data?.length) {
        tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-state-icon">📰</div><div class="empty-state-title">No Posts</div><button class="btn btn-gold" onclick="openNewsModal()">+ Write First Post</button></div></td></tr>`;
        return;
    }
    tbody.innerHTML = data.map(n => `
    <tr>
      <td>${n.cover_image_url ? `<img src="${n.cover_image_url}" class="preview-thumb">` : '—'}</td>
      <td><strong>${n.title}</strong></td><td>${n.category}</td>
      <td>${new Date(n.published_at).toLocaleDateString()}</td>
      <td><button class="btn btn-outline btn-sm" onclick="openNewsModal('${n.id}')">Edit</button> <button class="btn btn-danger btn-sm" onclick="deleteNews('${n.id}')">Delete</button></td>
    </tr>
  `).join('');
});

window.openNewsModal = function (id = null) {
    document.getElementById('modalContainer').innerHTML = `
    <div class="modal-overlay" id="newsModal"><div class="modal-box">
      <div class="modal-header"><div class="modal-title">${id ? 'Edit' : 'New'} Post</div><button class="modal-close" onclick="closeModal('newsModal')">✕</button></div>
      <form onsubmit="saveNews(event, '${id || ''}')">
        <div class="form-group"><label class="form-label">Cover Image</label>
          <div class="image-upload-area" id="newsDropZone" onclick="document.getElementById('newsFileInput').click()">
            <div id="newsPreview">📷 Click to upload cover image</div>
            <input type="file" id="newsFileInput" accept="image/*" style="display:none" onchange="handleNewsFile(event)">
          </div>
        </div>
        <div class="form-group"><label class="form-label">Title *</label><input class="form-input" id="ntitle" required></div>
        <div class="form-group"><label class="form-label">Category</label><select class="form-select" id="ncat"><option>Announcements</option><option>Events</option><option>Press</option></select></div>
        <div class="form-group"><label class="form-label">Excerpt</label><input class="form-input" id="nexcerpt"></div>
        <div class="form-group"><label class="form-label">Content *</label><textarea class="form-textarea" id="nbody" rows="8" required></textarea></div>
        <button type="submit" class="btn btn-gold">📝 Publish</button>
      </form>
    </div></div>`;
    window._newsFile = null;
    setupDragDrop('newsDropZone', 'newsFileInput', 'newsPreview', '_newsFile');
    if (id) {
        supabaseClient.from('news_posts').select('*').eq('id', id).single().then(({ data }) => {
            if (data) {
                document.getElementById('ntitle').value = data.title || '';
                document.getElementById('ncat').value = data.category || 'Announcements';
                document.getElementById('nexcerpt').value = data.excerpt || '';
                document.getElementById('nbody').value = data.content || '';
                if (data.cover_image_url) document.getElementById('newsPreview').innerHTML = `<img src="${data.cover_image_url}" style="max-width:200px;border-radius:8px;">`;
            }
        });
    }
};

window.handleNewsFile = function (event) {
    const file = event.target.files[0];
    if (file) { window._newsFile = file; previewImage(file, 'newsPreview'); }
};

window.saveNews = async function (event, id) {
    event.preventDefault();
    const payload = {
        title: document.getElementById('ntitle').value,
        category: document.getElementById('ncat').value,
        excerpt: document.getElementById('nexcerpt').value,
        content: document.getElementById('nbody').value,
    };
    if (window._newsFile) {
        const url = await uploadImage(window._newsFile);
        if (url) payload.cover_image_url = url;
        window._newsFile = null;
    }

    const { error } = id
        ? await supabaseClient.from('news_posts').update(payload).eq('id', id)
        : (payload.published_at = new Date().toISOString(), await supabaseClient.from('news_posts').insert(payload));

    if (error) {
        showToast("Publish fault: " + error.message, 'error');
    } else {
        closeModal('newsModal');
        showToast(id ? 'Updated article!' : 'Published news entry!');
        navigateTo('content');
    }
};

window.deleteNews = async function (id) {
    if (!confirm('Delete this post?')) return;
    const { error } = await supabaseClient.from('news_posts').delete().eq('id', id);
    if (error) {
        showToast("Failed to remove: " + error.message, 'error');
    } else {
        showToast('Deleted!', 'error');
        navigateTo('content');
    }
};

// ═══════════════ 5. RESOURCES ═══════════════
registerPage('resources', () => `
  <div class="page-header">
    <div class="page-title-group"><div class="page-breadcrumb">Management / Academic</div><div class="page-title"><span class="gold">Resources</span></div></div>
    <div class="header-actions"><button class="btn btn-gold" onclick="openResourceModal()">+ Add Resource</button></div>
  </div>
  <div class="card"><div class="card-header"><div class="card-title">Resource Library</div></div>
    <div class="table-wrapper"><table><thead><tr><th>Title</th><th>Level</th><th>Type</th><th>Category</th><th>Actions</th></tr></thead><tbody id="resourcesTableBody"></tbody></table></div>
  </div>
`, async () => {
    const { data, error } = await supabaseClient.from('resources').select('*').order('created_at', { ascending: false });
    if (error) return console.error(error);
    const tbody = document.getElementById('resourcesTableBody');
    if (!data?.length) {
        tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-state-icon">📚</div><div class="empty-state-title">No Resources</div><button class="btn btn-gold" onclick="openResourceModal()">+ Add First Resource</button></div></td></tr>`;
        return;
    }
    tbody.innerHTML = data.map(r => `
    <tr><td><strong>${r.title}</strong></td><td>${r.academic_level}L</td><td>${r.resource_type}</td><td>${r.resource_category}</td>
    <td><button class="btn btn-outline btn-sm" onclick="openResourceModal('${r.id}')">Edit</button> <button class="btn btn-danger btn-sm" onclick="deleteResource('${r.id}')">Delete</button></td></tr>
  `).join('');
});

window.openResourceModal = function (id = null) {
    document.getElementById('modalContainer').innerHTML = `
    <div class="modal-overlay" id="resourceModal"><div class="modal-box">
      <div class="modal-header"><div class="modal-title">${id ? 'Edit' : 'New'} Resource</div><button class="modal-close" onclick="closeModal('resourceModal')">✕</button></div>
      <form onsubmit="saveResource(event, '${id || ''}')">
        <div class="form-group"><label class="form-label">Title *</label><input class="form-input" id="rtitle" required></div>
        <div class="form-group"><label class="form-label">Level</label><select class="form-select" id="rlevel"><option value="100">100</option><option value="200">200</option><option value="300">300</option><option value="400">400</option><option value="500">500</option><option value="0">General</option></select></div>
        <div class="form-group"><label class="form-label">Type</label><input class="form-input" id="rtype"></div>
        <div class="form-group"><label class="form-label">Category</label><select class="form-select" id="rcat"><option value="faculty">Faculty</option><option value="general">General</option></select></div>
        <div class="form-group"><label class="form-label">Google Drive Link</label><input class="form-input" id="rlink"></div>
        <button type="submit" class="btn btn-gold">💾 Save</button>
      </form>
    </div></div>`;
    if (id) {
        supabaseClient.from('resources').select('*').eq('id', id).single().then(({ data }) => {
            if (data) {
                document.getElementById('rtitle').value = data.title || '';
                document.getElementById('rlevel').value = data.academic_level || 100;
                document.getElementById('rtype').value = data.resource_type || '';
                document.getElementById('rcat').value = data.resource_category || 'faculty';
                document.getElementById('rlink').value = data.drive_link || '';
            }
        });
    }
};

window.saveResource = async function (event, id) {
    event.preventDefault();
    const payload = { title: document.getElementById('rtitle').value, academic_level: parseInt(document.getElementById('rlevel').value), resource_type: document.getElementById('rtype').value, resource_category: document.getElementById('rcat').value, drive_link: document.getElementById('rlink').value };

    const { error } = id
        ? await supabaseClient.from('resources').update(payload).eq('id', id)
        : await supabaseClient.from('resources').insert(payload);

    if (error) {
        showToast("Resource save error: " + error.message, 'error');
    } else {
        closeModal('resourceModal');
        showToast(id ? 'Updated index!' : 'Added catalog items!');
        navigateTo('resources');
    }
};

window.deleteResource = async function (id) {
    if (!confirm('Delete?')) return;
    const { error } = await supabaseClient.from('resources').delete().eq('id', id);
    if (error) {
        showToast("Deleter fault: " + error.message, 'error');
    } else {
        showToast('Deleted!', 'error');
        navigateTo('resources');
    }
};

// ═══════════════ 6. PAYMENTS ═══════════════
let paymentsFilter = 'all';   // 'all', 'confirmed', 'pending'

registerPage('payments', () => `
  <div class="page-header">
    <div class="page-title-group">
      <div class="page-breadcrumb">Management / Finance</div>
      <div class="page-title">Dues & <span class="gold">Payments</span></div>
    </div>
  </div>
  <div id="paymentsContentArea">
    ${!paymentPasscodeVerified ? `
      <div class="card" style="text-align:center;">
        <div class="empty-state-icon">🔐</div>
        <h3 style="font-family:var(--font-d); color:var(--text-h);">Finance Access Passcode</h3>
        <div class="form-group" style="max-width:300px; margin: var(--s4) auto; position: relative;">
          <input type="password" id="paymentsPasscodeInput" class="form-input" placeholder="Enter passcode" style="padding-right: 48px;">
          <button type="button" onclick="togglePasscodeVisibility()" style="position:absolute; right:8px; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; font-size:1.2rem; color:var(--text-m); padding:4px 8px;">👁️</button>
        </div>
        <button class="btn btn-gold" onclick="submitPaymentsPasscode()">Unlock</button>
        <p id="paymentsPasscodeError" style="color:var(--danger); margin-top: var(--s3); display:none;">Invalid passcode</p>
      </div>
    ` : `
      <div class="card">
        <div class="card-header">
          <div class="card-title">Payment Records</div>
          <div style="display:flex; gap:var(--s2);">
            <button class="filter-btn ${paymentsFilter==='all'?'active':''}" onclick="setPaymentsFilter('all')">All</button>
            <button class="filter-btn ${paymentsFilter==='confirmed'?'active':''}" onclick="setPaymentsFilter('confirmed')">✅ Confirmed</button>
            <button class="filter-btn ${paymentsFilter==='pending'?'active':''}" onclick="setPaymentsFilter('pending')">⏳ Pending</button>
          </div>
        </div>
        <div class="table-wrapper">
          <table><thead><tr><th>Student</th><th>Matric</th><th>Amount</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody id="paymentsTableBody"></tbody></table>
        </div>
      </div>
    `}
  </div>
`, async () => {
    if (!paymentPasscodeVerified) return;

    let query = supabaseClient.from('payments').select('*').order('created_at', { ascending: false });
    if (paymentsFilter === 'confirmed') query = query.eq('status', 'confirmed');
    else if (paymentsFilter === 'pending') query = query.neq('status', 'confirmed');

    const { data, error } = await query;
    if (error) return console.error(error);
    const tbody = document.getElementById('paymentsTableBody');
    if (!data?.length) {
        tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-state-icon">💰</div><div class="empty-state-title">No ${paymentsFilter === 'all' ? 'payments' : paymentsFilter} found</div></div></td></tr>`;
        return;
    }
    tbody.innerHTML = data.map(p => `
    <tr>
      <td>${p.full_name}</td>
      <td>${p.matric_number || ''}</td>
      <td>₦${p.amount}</td>
      <td><span class="badge ${p.status === 'confirmed' ? 'badge-success' : 'badge-warning'}">${p.status || 'pending'}</span></td>
      <td>${new Date(p.created_at).toLocaleDateString()}</td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="togglePaymentStatus('${p.id}', '${p.status}')">
          ${p.status === 'confirmed' ? '❌ Unconfirm' : '✅ Confirm'}
        </button>
      </td>
    </tr>
  `).join('');
});

// Filter setter
window.setPaymentsFilter = function(filter) {
    paymentsFilter = filter;
    navigateTo('payments');   // re-render the list
};

// (keep your existing submitPaymentsPasscode, togglePasscodeVisibility, togglePaymentStatus unchanged)

// Helper for the passcode prompt
window.submitPaymentsPasscode = async function () {
    const input = document.getElementById('paymentsPasscodeInput').value;
    const valid = await verifyPaymentPasscode(input);
    if (valid) {
        paymentPasscodeVerified = true;
        navigateTo('payments');   // reload the page without passcode prompt
    } else {
        document.getElementById('paymentsPasscodeError').style.display = 'block';
    }
};

window.togglePasscodeVisibility = function () {
    const input = document.getElementById('paymentsPasscodeInput');
    const btn = input?.nextElementSibling;
    if (!input || !btn) return;
    if (input.type === 'password') {
        input.type = 'text';
        btn.innerHTML = '🙈';
    } else {
        input.type = 'password';
        btn.innerHTML = '👁️';
    }
};

// Toggle payment status (confirm / unconfirm)
window.togglePaymentStatus = async function (paymentId, currentStatus) {
    const newStatus = currentStatus === 'confirmed' ? 'pending' : 'confirmed';
    const { error } = await supabaseClient
        .from('payments')
        .update({ status: newStatus })
        .eq('id', paymentId);
    if (error) {
        showToast("Update failed: " + error.message, 'error');
    } else {
        showToast(`Payment ${newStatus === 'confirmed' ? 'confirmed' : 'marked as pending'}`, 'success');
        navigateTo('payments');   // refresh the list
    }
};

// ═══════════════ 7. STORE ═══════════════
registerPage('store', () => `
  <div class="page-header">
    <div class="page-title-group"><div class="page-breadcrumb">Management / Commerce</div><div class="page-title"><span class="gold">Store</span></div></div>
    <div class="header-actions"><button class="btn btn-gold" onclick="openStoreModal()">+ Add Product</button></div>
  </div>
  <div class="card"><div class="card-header"><div class="card-title">Products</div></div>
    <div class="table-wrapper"><table><thead><tr><th></th><th>Product</th><th>Price</th><th>SKU</th><th>Actions</th></tr></thead><tbody id="storeTableBody"></tbody></table></div>
  </div>
`, async () => {
    const { data, error } = await supabaseClient.from('store_items').select('*').order('created_at', { ascending: false });
    if (error) return console.error(error);
    const tbody = document.getElementById('storeTableBody');
    if (!data?.length) {
        tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-state-icon">🛒</div><div class="empty-state-title">No Products</div><button class="btn btn-gold" onclick="openStoreModal()">+ Add First Product</button></div></td></tr>`;
        return;
    }
    tbody.innerHTML = data.map(s => `
    <tr>
      <td>${s.image_url ? `<img src="${s.image_url}" class="preview-thumb">` : '—'}</td>
      <td><strong>${s.name}</strong></td><td>₦${Number(s.price).toLocaleString()}</td><td>${s.sku || ''}</td>
      <td><button class="btn btn-outline btn-sm" onclick="openStoreModal('${s.id}')">Edit</button> <button class="btn btn-danger btn-sm" onclick="deleteStore('${s.id}')">Delete</button></td>
    </tr>
  `).join('');
});

window.openStoreModal = function (id = null) {
    document.getElementById('modalContainer').innerHTML = `
    <div class="modal-overlay" id="storeModal"><div class="modal-box">
      <div class="modal-header"><div class="modal-title">${id ? 'Edit' : 'New'} Product</div><button class="modal-close" onclick="closeModal('storeModal')">✕</button></div>
      <form onsubmit="saveStore(event, '${id || ''}')">
        <div class="form-group"><label class="form-label">Product Image</label>
          <div class="image-upload-area" id="storeDropZone" onclick="document.getElementById('storeFileInput').click()">
            <div id="storePreview">📷 Click to upload</div>
            <input type="file" id="storeFileInput" accept="image/*" style="display:none" onchange="handleStoreFile(event)">
          </div>
        </div>
        <div class="form-group"><label class="form-label">Name *</label><input class="form-input" id="pname" required></div>
        <div class="form-group"><label class="form-label">Price (₦) *</label><input class="form-input" type="number" id="pprice" required></div>
        <div class="form-group"><label class="form-label">SKU</label><input class="form-input" id="psku"></div>
        <div class="form-group"><label class="form-label">Description</label><textarea class="form-textarea" id="pdesc" rows="3"></textarea></div>
        <button type="submit" class="btn btn-gold">💾 Save</button>
      </form>
    </div></div>`;
    window._storeFile = null;
    setupDragDrop('storeDropZone', 'storeFileInput', 'storePreview', '_storeFile');
    if (id) {
        supabaseClient.from('store_items').select('*').eq('id', id).single().then(({ data }) => {
            if (data) {
                document.getElementById('pname').value = data.name || '';
                document.getElementById('pprice').value = data.price || '';
                document.getElementById('psku').value = data.sku || '';
                document.getElementById('pdesc').value = data.description || '';
                if (data.image_url) document.getElementById('storePreview').innerHTML = `<img src="${data.image_url}" style="max-width:200px;border-radius:8px;">`;
            }
        });
    }
};

window.handleStoreFile = function (event) {
    const file = event.target.files[0];
    if (file) { window._storeFile = file; previewImage(file, 'storePreview'); }
};

window.saveStore = async function (event, id) {
    event.preventDefault();
    const payload = { name: document.getElementById('pname').value, price: parseFloat(document.getElementById('pprice').value), sku: document.getElementById('psku').value, description: document.getElementById('pdesc').value };
    if (window._storeFile) { const url = await uploadImage(window._storeFile); if (url) payload.image_url = url; window._storeFile = null; }

    const { error } = id
        ? await supabaseClient.from('store_items').update(payload).eq('id', id)
        : await supabaseClient.from('store_items').insert(payload);

    if (error) {
        showToast("Inventory update failed: " + error.message, 'error');
    } else {
        closeModal('storeModal');
        showToast(id ? 'Updated product metrics!' : 'Item indexed!');
        navigateTo('store');
    }
};

window.deleteStore = async function (id) {
    if (!confirm('Delete?')) return;
    const { error } = await supabaseClient.from('store_items').delete().eq('id', id);
    if (error) {
        showToast("Commerce deletion error: " + error.message, 'error');
    } else {
        showToast('Deleted item!', 'error');
        navigateTo('store');
    }
};

// ═══════════════ 8. EVENTS ═══════════════
registerPage('events', () => `
  <div class="page-header"><div class="page-title-group"><div class="page-breadcrumb">Management / Activities</div><div class="page-title"><span class="gold">Events</span></div></div></div>
  <div class="card"><div class="empty-state"><div class="empty-state-icon">🎉</div><div class="empty-state-title">Events Calendar</div><div class="empty-state-text">Coming soon.</div></div></div>
`);

// ═══════════════ FACULTY ADVISORS ═══════════════
registerPage('advisors', () => `
  <div class="page-header">
    <div class="page-title-group"><div class="page-breadcrumb">Administration / Faculty</div><div class="page-title"><span class="gold">Advisors</span></div></div>
    <div class="header-actions"><button class="btn btn-gold" onclick="openAdvisorModal()">+ Add Advisor</button></div>
  </div>
  <div class="card">
    <div class="card-header"><div class="card-title">Dean & Staff Advisor</div></div>
    <div class="table-wrapper"><table><thead><tr><th></th><th>Name</th><th>Title</th><th>Order</th><th>Actions</th></tr></thead><tbody id="advisorsTableBody"></tbody></table></div>
  </div>
`, async () => {
    const { data, error } = await supabaseClient.from('faculty_advisors').select('*').order('display_order');
    if (error) return console.error(error);
    const tbody = document.getElementById('advisorsTableBody');
    if (!data?.length) {
        tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-state-icon">🎓</div><div class="empty-state-title">No Advisors</div><button class="btn btn-gold" onclick="openAdvisorModal()">+ Add First Advisor</button></div></td></tr>`;
        return;
    }
    tbody.innerHTML = data.map(a => `
    <tr>
      <td>${a.image_url ? `<img src="${a.image_url}" class="preview-thumb">` : '—'}</td>
      <td><strong>${a.full_name}</strong></td><td>${a.title}</td><td>${a.display_order || 0}</td>
      <td><button class="btn btn-outline btn-sm" onclick="openAdvisorModal('${a.id}')">Edit</button> <button class="btn btn-danger btn-sm" onclick="deleteAdvisor('${a.id}')">Delete</button></td>
    </tr>
  `).join('');
});

window.openAdvisorModal = function (id = null) {
    document.getElementById('modalContainer').innerHTML = `
    <div class="modal-overlay" id="advisorModal"><div class="modal-box">
      <div class="modal-header"><div class="modal-title">${id ? 'Edit' : 'New'} Advisor</div><button class="modal-close" onclick="closeModal('advisorModal')">✕</button></div>
      <form onsubmit="saveAdvisor(event, '${id || ''}')">
        <div class="form-group"><label class="form-label">Photo</label>
          <div class="image-upload-area" id="advisorDropZone" onclick="document.getElementById('advisorFileInput').click()">
            <div id="advisorPreview">📷 Click or drag photo here</div>
            <input type="file" id="advisorFileInput" accept="image/*" style="display:none" onchange="handleAdvisorFile(event)">
          </div>
        </div>
        <div class="form-group"><label class="form-label">Full Name *</label><input class="form-input" id="aname" required></div>
        <div class="form-group"><label class="form-label">Title *</label><input class="form-input" id="atitle" placeholder="e.g. Dean, Faculty of Law" required></div>
        <div class="form-group"><label class="form-label">Display Order</label><input class="form-input" type="number" id="aorder" value="0"></div>
        <div style="display:flex;gap:var(--s3);"><button type="submit" class="btn btn-gold">💾 Save</button><button type="button" class="btn btn-outline" onclick="closeModal('advisorModal')">Cancel</button></div>
      </form>
    </div></div>`;
    window._advisorFile = null;
    setupDragDrop('advisorDropZone', 'advisorFileInput', 'advisorPreview', '_advisorFile');
    if (id) {
        supabaseClient.from('faculty_advisors').select('*').eq('id', id).single().then(({ data }) => {
            if (data) {
                document.getElementById('aname').value = data.full_name || '';
                document.getElementById('atitle').value = data.title || '';
                document.getElementById('aorder').value = data.display_order || 0;
                if (data.image_url) document.getElementById('advisorPreview').innerHTML = `<img src="${data.image_url}" style="max-width:200px;border-radius:8px;">`;
            }
        });
    }
};

window.handleAdvisorFile = function (event) {
    const file = event.target.files[0];
    if (file) { window._advisorFile = file; previewImage(file, 'advisorPreview'); }
};

window.saveAdvisor = async function (event, id) {
    event.preventDefault();
    const payload = {
        full_name: document.getElementById('aname').value,
        title: document.getElementById('atitle').value,
        display_order: parseInt(document.getElementById('aorder').value) || 0,
    };
    if (window._advisorFile) {
        const url = await uploadImage(window._advisorFile);
        if (url) payload.image_url = url;
        window._advisorFile = null;
    }
    const { error } = id
        ? await supabaseClient.from('faculty_advisors').update(payload).eq('id', id)
        : await supabaseClient.from('faculty_advisors').insert(payload);
    if (error) {
        showToast("Save failed: " + error.message, 'error');
    } else {
        closeModal('advisorModal');
        showToast(id ? 'Updated!' : 'Added!');
        navigateTo('advisors');
    }
};

window.deleteAdvisor = async function (id) {
    if (!confirm('Delete this advisor?')) return;
    const { error } = await supabaseClient.from('faculty_advisors').delete().eq('id', id);
    if (error) {
        showToast("Delete failed: " + error.message, 'error');
    } else {
        showToast('Deleted!', 'error');
        navigateTo('advisors');
    }
};

// ═══════════════ 9. USERS ═══════════════
registerPage('users', () => `
  <div class="page-header">
    <div class="page-title-group"><div class="page-breadcrumb">Administration / Access</div><div class="page-title">Users & <span class="gold">Roles</span></div></div>
    <div class="header-actions">
      ${window.currentUserRole === 'super_admin' ? '<button class="btn btn-gold" onclick="openUserModal()">+ Add User</button>' : ''}
    </div>
  </div>
  <div class="card"><div class="card-header"><div class="card-title">Admin Users</div></div>
    <div class="table-wrapper"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead><tbody id="usersTableBody"></tbody></table></div>
  </div>
`, async () => {
    const { data, error } = await supabaseClient.from('admin_users').select('*').order('created_at', { ascending: false });
    if (error) return console.error(error);
    const tbody = document.getElementById('usersTableBody');
    if (!data?.length) {
        tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-state-icon">🔑</div><div class="empty-state-title">No Users</div><button class="btn btn-gold" onclick="openUserModal()">+ Add First User</button></div></td></tr>`;
        return;
    }
    tbody.innerHTML = data.map(u => `
<tr><td><strong>${u.full_name}</strong></td><td>${u.email}</td>
<td><span class="badge ${u.role === 'super_admin' ? 'badge-success' : u.role === 'admin' ? 'badge-info' : 'badge-warning'}">${u.role}</span></td>
<td>${u.is_active ? '✅' : '❌'}</td>
<td>
  ${window.currentUserRole === 'super_admin' ? `<button class="btn btn-outline btn-sm" onclick="openUserModal('${u.id}')">Edit</button> <button class="btn btn-danger btn-sm" onclick="deleteUser('${u.id}')">Delete</button>` : ''}
</td></tr>
`).join('');
});

window.openUserModal = function (id = null) {
    document.getElementById('modalContainer').innerHTML = `
    <div class="modal-overlay" id="userModal"><div class="modal-box">
      <div class="modal-header"><div class="modal-title">${id ? 'Edit' : 'New'} User</div><button class="modal-close" onclick="closeModal('userModal')">✕</button></div>
      <form onsubmit="saveUser(event, '${id || ''}')">
        <div class="form-group"><label class="form-label">Full Name *</label><input class="form-input" id="uname" required></div>
        <div class="form-group"><label class="form-label">Email *</label><input class="form-input" type="email" id="uemail" required></div>
        ${!id ? '<div class="form-group"><label class="form-label">Temporary Password *</label><input class="form-input" type="password" id="upassword" required></div>' : ''}
        <div class="form-group"><label class="form-label">Role</label><select class="form-select" id="urole"><option value="editor">Editor</option><option value="admin">Admin</option><option value="viewer">Viewer</option><option value="super_admin">Super Admin</option></select></div>
        <div class="form-group"><label class="form-label">Link to Leader (optional)</label>
          <select class="form-select" id="uleader">
            <option value="">— None —</option>
          </select>
        </div>
        <div class="form-group"><label><input type="checkbox" id="uactive" checked> Active</label></div>
        <button type="submit" class="btn btn-gold">💾 Save</button>
      </form>
    </div></div>`;

    // Populate leader dropdown (fetch all leaders not yet linked)
    supabaseClient.from('leadership').select('id, full_name, email').then(({ data: leaders }) => {
        const select = document.getElementById('uleader');
        if (select && leaders) {
            leaders.forEach(l => {
                select.innerHTML += `<option value="${l.id}">${l.full_name} (${l.email || 'no email'})</option>`;
            });
        }
    });

    if (id) {
        supabaseClient.from('admin_users').select('*').eq('id', id).single().then(({ data }) => {
            if (data) {
                document.getElementById('uname').value = data.full_name || '';
                document.getElementById('uemail').value = data.email || '';
                document.getElementById('urole').value = data.role || 'editor';
                document.getElementById('uactive').checked = data.is_active !== false;
                // Optionally set linked leader if there's a field
            }
        });
    }
};

window.saveUser = async function (event, id) {
    event.preventDefault();
    const email = document.getElementById('uemail').value;
    const password = document.getElementById('upassword')?.value; // only for new users
    const full_name = document.getElementById('uname').value;
    const role = document.getElementById('urole').value;
    const is_active = document.getElementById('uactive').checked;
    const leader_id = document.getElementById('uleader')?.value || null;

    if (!id) {
        // Create new auth user
        const { data: authData, error: authError } = await supabaseClient.auth.signUp({
            email,
            password,
        });
        if (authError) {
            showToast("Auth error: " + authError.message, 'error');
            return;
        }
        // Insert into admin_users
        const { error: insertError } = await supabaseClient.from('admin_users').insert({
            email,
            full_name,
            role,
            is_active,
            leader_id,
        });
        if (insertError) {
            showToast("Insert error: " + insertError.message, 'error');
            return;
        }
    } else {
        const { error } = await supabaseClient.from('admin_users').update({
            full_name,
            role,
            is_active,
            leader_id,
        }).eq('id', id);
        if (error) {
            showToast("Update error: " + error.message, 'error');
            return;
        }
    }

    closeModal('userModal');
    showToast(id ? 'User updated!' : 'User created! A confirmation email has been sent.');
    navigateTo('users');
};

window.deleteUser = async function (id) {
    if (!confirm('Delete this user?')) return;
    const { error } = await supabaseClient.from('admin_users').delete().eq('id', id);
    if (error) {
        showToast("Role removal error: " + error.message, 'error');
    } else {
        showToast('Deleted configuration reference!', 'error');
        navigateTo('users');
    }
};

// ═══════════════ 10. SETTINGS ═══════════════
registerPage('settings', () => `
  <div class="page-header"><div class="page-title-group"><div class="page-breadcrumb">Administration / Config</div><div class="page-title"><span class="gold">Settings</span></div></div></div>
  <div class="card">
    <p style="color:var(--text-m);">✅ Supabase Connected</p>
    <p style="color:var(--text-m);">Storage Bucket: <strong>${STORAGE_BUCKET}</strong></p>
    <p style="color:var(--text-m);">Project: <strong>${SUPABASE_URL}</strong></p>
  </div>
`);

// ═══════════════ INIT ═══════════════
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.sidebar-link[data-page]').forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const page = this.dataset.page;
            if (page) navigateTo(page);
        });
    });
    navigateTo('dashboard');
});

console.log('🚀 LAWSA Admin Ready | Supabase Client Instance Secured ✅');

// ═══════════════ AUTO‑WRAP SAVE FUNCTIONS FOR LOADING STATE ═══════════════
(function patchSaveFunctions() {
    const saveFunctions = ['saveSession', 'saveLeader', 'saveNews', 'saveResource', 'saveStore', 'saveUser', 'saveAdvisor'];

    saveFunctions.forEach(fnName => {
        if (typeof window[fnName] !== 'function') return;
        const originalFn = window[fnName];

        window[fnName] = async function (event, ...args) {
            if (event && event.preventDefault) event.preventDefault();

            // Find the submit button inside the form
            const form = event?.target;
            const btn = form ? form.querySelector('button[type="submit"]') : document.querySelector(`#${fnName}Btn`);

            setButtonLoading(btn, true);
            try {
                await originalFn.call(this, event, ...args);
            } catch (err) {
                console.error(err);
                showToast('An error occurred. Please try again.', 'error');
            } finally {
                setButtonLoading(btn, false);
            }
        };
    });
})();

window.handleRoleChange = function () {
    const select = document.getElementById('lroleSelect');
    const customInput = document.getElementById('lroleCustom');
    const presMsgGroup = document.getElementById('presMessageGroup');

    // Handle custom role input
    if (select.value === 'Other') {
        customInput.style.display = 'block';
        customInput.required = true;
    } else {
        customInput.style.display = 'none';
        customInput.required = false;
        customInput.value = '';
    }

    // Show President's Message only when "President" is chosen
    if (presMsgGroup) {
        presMsgGroup.style.display = select.value === 'President' ? 'block' : 'none';
    }
};
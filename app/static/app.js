// Feel & Film - Autonomous Agentic Orchestrator & Collaborative Memory Client

let currentUser = null;
let currentSessionData = null;
let allArchiveRecords = [];
let activeArchiveDrawer = 'ALL';
let currentRating = 5;
let selectedFeedbackTags = [];
let isArchiveExpanded = false;

// ---------------------------------------------------------------------------
// Cinémathèque Archive Management (ClickHouse Cloud)
// ---------------------------------------------------------------------------

async function loadCinematheque() {
    try {
        const userEmail = (currentUser && currentUser.email) ? encodeURIComponent(currentUser.email) : '';
        const response = await fetch(`/api/cinematheque?user_email=${userEmail}`);
        const data = await response.json();
        
        allArchiveRecords = (data.status === 'success' && data.records) ? data.records : [];
        
        // Synchronize all archived films to guarantee they are never repeated
        window.excludedFilms = window.excludedFilms || [];
        allArchiveRecords.forEach(r => {
            if (r.title && !window.excludedFilms.includes(r.title)) {
                window.excludedFilms.push(r.title);
            }
        });

        // Update count badge
        const countBadge = document.getElementById('archive-records-count');
        if (countBadge) {
            countBadge.innerText = `${allArchiveRecords.length} Curation${allArchiveRecords.length === 1 ? '' : 's'} Preserved`;
        }
        
        renderCinematheque();
    } catch (e) {
        console.error("Failed to load Cinémathèque archive", e);
    }
}

function matchesDrawer(record, drawer) {
    if (drawer === 'ALL') return true;
    const target = drawer.toLowerCase();
    
    if (record.primary_mood && record.primary_mood.toLowerCase().includes(target)) return true;
    if (record.detected_tags && Array.isArray(record.detected_tags)) {
        if (record.detected_tags.some(tag => tag.toLowerCase().includes(target))) return true;
    }
    if (record.user_input && record.user_input.toLowerCase().includes(target)) return true;
    
    return false;
}

function renderCinematheque() {
    const grid = document.getElementById('archive-grid');
    const emptyState = document.getElementById('archive-empty-state');
    const expandWrapper = document.getElementById('archive-expand-wrapper');
    const expandBtn = document.getElementById('archive-expand-btn');
    if (!grid) return;
    
    grid.innerHTML = '';
    const filtered = allArchiveRecords.filter(r => matchesDrawer(r, activeArchiveDrawer));
    
    if (filtered.length === 0) {
        if (expandWrapper) expandWrapper.classList.add('hidden');
        if (emptyState) {
            emptyState.classList.remove('hidden');
            const emptyTitle = document.getElementById('empty-title');
            const emptyDesc = document.getElementById('empty-desc');
            if (activeArchiveDrawer === 'ALL') {
                if (emptyTitle) emptyTitle.innerText = "Your Film Vault is Empty";
                if (emptyDesc) emptyDesc.innerText = "Discover your first film using the emotional curator above to begin filing your personal cinémathèque records.";
            } else {
                if (emptyTitle) emptyTitle.innerText = `No Films in [${activeArchiveDrawer}] Drawer`;
                if (emptyDesc) emptyDesc.innerText = `You haven't archived any films matching "${activeArchiveDrawer}" yet. Describe how you feel above to file one here!`;
            }
        }
        return;
    }
    
    if (emptyState) emptyState.classList.add('hidden');
    
    // Manage top-3 limit vs show-all toggle
    let displayedRecords = filtered;
    if (filtered.length > 3) {
        if (expandWrapper) expandWrapper.classList.remove('hidden');
        if (!isArchiveExpanded) {
            displayedRecords = filtered.slice(0, 3);
            if (expandBtn) {
                expandBtn.innerHTML = `<i class="fas fa-chevron-down"></i> Show All Curations (${filtered.length})`;
            }
        } else {
            displayedRecords = filtered;
            if (expandBtn) {
                expandBtn.innerHTML = `<i class="fas fa-chevron-up"></i> Show Less (Top 3)`;
            }
        }
    } else {
        if (expandWrapper) expandWrapper.classList.add('hidden');
    }

    displayedRecords.forEach(record => {
        const card = document.createElement('div');
        card.className = 'archive-record-card';
        
        const posterSrc = record.poster_url || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=300&q=80';
        const tagsHtml = (record.detected_tags && record.detected_tags.length > 0)
            ? record.detected_tags.map(t => `<span class="tag-pill">#${t}</span>`).join('')
            : `<span class="tag-pill">#${record.primary_mood || 'Curated'}</span>`;
            
        const userQuoteHtml = record.user_input 
            ? `<div class="archive-quote-box"><i class="fas fa-quote-left"></i> "${record.user_input}"</div>`
            : '';
            
        card.innerHTML = `
            <div class="archive-card-top">
                <img class="archive-poster" src="${posterSrc}" alt="${record.title}" onerror="this.src='https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=300&q=80'">
                <div class="archive-meta">
                    <div>
                        <div class="archive-meta-header">
                            <h4 class="archive-title">${record.title}</h4>
                            <button type="button" class="archive-delete-btn" data-session-id="${record.session_id}" title="Remove from vault">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                        <div class="archive-director">${record.director ? 'Dir. ' + record.director : ''}</div>
                    </div>
                    <div>
                        <div class="archive-date"><i class="far fa-clock"></i> ${record.timestamp}</div>
                        <div class="archive-tags">${tagsHtml}</div>
                    </div>
                </div>
            </div>
            ${userQuoteHtml}
            <div class="archive-reasoning">${record.reasoning || ''}</div>
        `;
        
        // Attach deletion handler
        const deleteBtn = card.querySelector('.archive-delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const sid = deleteBtn.dataset.sessionId;
                if (!sid) return;
                
                // Animate card removal
                card.style.opacity = '0.4';
                card.style.transform = 'scale(0.95)';
                
                try {
                    await fetch(`/api/cinematheque/${encodeURIComponent(sid)}`, { method: 'DELETE' });
                    allArchiveRecords = allArchiveRecords.filter(r => r.session_id !== sid);
                    
                    const countBadge = document.getElementById('archive-records-count');
                    if (countBadge) {
                        countBadge.innerText = `${allArchiveRecords.length} Curation${allArchiveRecords.length === 1 ? '' : 's'} Preserved`;
                    }
                    renderCinematheque();
                } catch (err) {
                    console.error("Failed to delete record:", err);
                    card.style.opacity = '1';
                }
            });
        }

        grid.appendChild(card);
    });
}

// ---------------------------------------------------------------------------
// Authentication & Memory Sync
// ---------------------------------------------------------------------------

function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}

function getAvatarUrl(user) {
    if (user && user.picture && user.picture.startsWith('http') && !user.picture.includes('default-user')) {
        return user.picture;
    }
    const name = (user && user.name) ? user.name : 'C';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=d4af37&color=1a1714&bold=true&rounded=true`;
}

function updateAuthUI() {
    const loggedOutView = document.getElementById('logged-out-view');
    const loggedInView = document.getElementById('logged-in-view');
    const avatar = document.getElementById('user-avatar');
    const userName = document.getElementById('user-name');
    const userEmail = document.getElementById('user-email');
    const archiveGuestBanner = document.getElementById('archive-guest-banner');
    const memoryBadge = document.getElementById('memory-count-badge');

    if (currentUser && currentUser.email) {
        loggedOutView.classList.add('hidden');
        loggedInView.classList.remove('hidden');
        if (archiveGuestBanner) archiveGuestBanner.classList.add('hidden');
        if (avatar) {
            avatar.onerror = () => {
                avatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name || 'C')}&background=d4af37&color=1a1714&bold=true&rounded=true`;
            };
            avatar.src = getAvatarUrl(currentUser);
        }
        if (userName) userName.innerText = currentUser.name || 'Cinephile';
        if (userEmail) userEmail.innerText = currentUser.email;
        if (memoryBadge) memoryBadge.innerText = 'Memory Active';
    } else {
        loggedOutView.classList.remove('hidden');
        loggedInView.classList.add('hidden');
        if (archiveGuestBanner) archiveGuestBanner.classList.remove('hidden');
    }
}

function openAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.remove('hidden');
}

function closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.add('hidden');
}

async function handleGoogleCredentialResponse(response) {
    const payload = parseJwt(response.credential);
    if (!payload) return;

    currentUser = {
        email: payload.email,
        name: payload.name,
        picture: payload.picture
    };
    localStorage.setItem('feelandfilm_user', JSON.stringify(currentUser));
    updateAuthUI();
    closeAuthModal();
    loadCinematheque();

    try {
        await fetch('/api/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential: response.credential })
        });
    } catch (e) {
        console.error("Google Auth verification failed:", e);
    }
}

window.handleGoogleCredentialResponse = handleGoogleCredentialResponse;
window.openAuthModal = openAuthModal;

function signOut() {
    currentUser = null;
    localStorage.removeItem('feelandfilm_user');
    if (window.google && google.accounts && google.accounts.id) {
        google.accounts.id.disableAutoSelect();
    }
    updateAuthUI();
    loadCinematheque();
}

async function initAuth() {
    try {
        const stored = localStorage.getItem('feelandfilm_user');
        if (stored) {
            currentUser = JSON.parse(stored);
            updateAuthUI();
        }
    } catch (e) {}

    const signOutBtn = document.getElementById('sign-out-btn');
    if (signOutBtn) signOutBtn.addEventListener('click', signOut);

    const customGoogleBtn = document.getElementById('custom-google-btn');
    if (customGoogleBtn) customGoogleBtn.addEventListener('click', openAuthModal);

    const closeModalBtn = document.getElementById('close-modal-btn');
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeAuthModal);

    const modalOverlay = document.getElementById('auth-modal');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) closeAuthModal();
        });
    }

    const quickForm = document.getElementById('quick-login-form');
    if (quickForm) {
        quickForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const emailInput = document.getElementById('login-email');
            const nameInput = document.getElementById('login-name');
            if (emailInput && emailInput.value) {
                const email = emailInput.value.trim();
                const name = (nameInput && nameInput.value.trim()) ? nameInput.value.trim() : email.split('@')[0].toUpperCase();
                currentUser = {
                    email: email,
                    name: name,
                    picture: "https://lh3.googleusercontent.com/a/default-user"
                };
                localStorage.setItem('feelandfilm_user', JSON.stringify(currentUser));
                updateAuthUI();
                closeAuthModal();
                loadCinematheque();
            }
        });
    }

    try {
        const res = await fetch('/api/auth/config');
        const config = await res.json();
        const clientId = config.google_client_id;

        if (clientId && window.google && google.accounts && google.accounts.id) {
            google.accounts.id.initialize({
                client_id: clientId,
                callback: handleGoogleCredentialResponse,
                auto_select: false
            });

            const headerGsiWrapper = document.getElementById('google-btn-wrapper');
            if (headerGsiWrapper) {
                headerGsiWrapper.innerHTML = '';
                google.accounts.id.renderButton(headerGsiWrapper, {
                    theme: 'filled_black',
                    size: 'medium',
                    shape: 'pill',
                    text: 'signin_with'
                });
            }

            const modalGsiWrapper = document.getElementById('modal-gsi-wrapper');
            if (modalGsiWrapper) {
                google.accounts.id.renderButton(modalGsiWrapper, {
                    theme: 'filled_black',
                    size: 'large',
                    shape: 'pill',
                    text: 'signin_with'
                });
            }
        }
    } catch (e) {
        console.error("Auth config loading error:", e);
    }
}

// ---------------------------------------------------------------------------
// Autonomous 1-Click Orchestration & Rendering
// ---------------------------------------------------------------------------

function detectUserCountry() {
    try {
        if (navigator.language && navigator.language.includes('-')) {
            const c = navigator.language.split('-')[1].toUpperCase();
            if (c.length === 2) return c;
        }
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
        if (tz.includes('Santiago')) return 'CL';
        if (tz.includes('Buenos_Aires')) return 'AR';
        if (tz.includes('Bogota')) return 'CO';
        if (tz.includes('Lima')) return 'PE';
        if (tz.includes('Mexico')) return 'MX';
        if (tz.includes('Madrid')) return 'ES';
        return 'US';
    } catch (e) {
        return 'US';
    }
}

// ===========================================================================
// Ethereal Cinema Screening Interview Modal Controller ("The Screen Test")
// ===========================================================================

let currentSceneIndex = 0;
const totalScenes = 4;

function initScreeningInterviewModal() {
    const modal = document.getElementById('screening-modal');
    const startBtn = document.getElementById('start-screening-btn');
    const closeBtn = document.getElementById('close-screening-btn');
    const browseVaultBtn = document.getElementById('browse-vault-btn');
    const nextBtn = document.getElementById('next-scene-btn');
    const prevBtn = document.getElementById('prev-scene-btn');
    const submitBtn = document.getElementById('submit-screening-btn');
    const form = document.getElementById('screening-interview-form');

    // 1. Open Modal Trigger
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            openScreeningModal();
        });
    }

    // 2. Browse Vault Shortcut
    if (browseVaultBtn) {
        browseVaultBtn.addEventListener('click', () => {
            closeScreeningModal();
            const archiveSection = document.getElementById('cinematheque-section');
            if (archiveSection) archiveSection.scrollIntoView({ behavior: 'smooth' });
        });
    }

    // 3. Close Modal Trigger
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            closeScreeningModal();
        });
    }

    // 4. Close on clicking outside modal card
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeScreeningModal();
        });
    }

    // 5. Scene Navigation
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (validateCurrentScene()) {
                goToScene(currentSceneIndex + 1);
            }
        });
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentSceneIndex > 0) {
                goToScene(currentSceneIndex - 1);
            }
        });
    }

    // 6. Quick Suggestion Pills
    const pills = document.querySelectorAll('.scene-pill');
    pills.forEach(pill => {
        pill.addEventListener('click', () => {
            const targetId = pill.dataset.target;
            const val = pill.dataset.val;
            const targetEl = document.getElementById(targetId);
            if (targetEl) {
                if (targetEl.tagName === 'SELECT') {
                    targetEl.value = val;
                } else {
                    targetEl.value = val;
                }
                // Visual pulse on target
                targetEl.focus();
                targetEl.style.borderColor = 'var(--accent)';
                setTimeout(() => { targetEl.style.borderColor = ''; }, 800);
            }
        });
    });

    // 7. Global Keyboard Navigation (Enter to advance, Esc to close)
    document.addEventListener('keydown', (e) => {
        if (!modal || modal.classList.contains('hidden')) return;

        if (e.key === 'Escape') {
            closeScreeningModal();
        } else if (e.key === 'Enter' && !e.shiftKey) {
            // Only handle Enter if not in textarea with shift
            if (e.target && e.target.classList.contains('scene-textarea') && e.shiftKey) return;

            e.preventDefault();
            if (currentSceneIndex < totalScenes - 1) {
                if (validateCurrentScene()) {
                    goToScene(currentSceneIndex + 1);
                }
            } else {
                // On last scene, trigger submission
                if (form) form.requestSubmit();
            }
        }
    });

    // 8. Form Submission (Orchestration Cycle)
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await executeCinemaOrchestration();
        });
    }

    // Automatically launch screening modal on fresh session
    setTimeout(() => {
        const resultsSection = document.getElementById('results');
        if (resultsSection && resultsSection.classList.contains('hidden')) {
            openScreeningModal();
        }
    }, 400);
}

function openScreeningModal() {
    const modal = document.getElementById('screening-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    goToScene(0);
}

function closeScreeningModal() {
    const modal = document.getElementById('screening-modal');
    if (modal) modal.classList.add('hidden');
}

function goToScene(index) {
    if (index < 0 || index >= totalScenes) return;
    currentSceneIndex = index;

    // Update scene visibility
    for (let i = 0; i < totalScenes; i++) {
        const sceneEl = document.getElementById(`scene-${i}`);
        if (sceneEl) {
            if (i === index) {
                sceneEl.classList.remove('hidden');
                sceneEl.classList.add('active');
                // Focus active input
                const input = sceneEl.querySelector('.glass-input');
                if (input) setTimeout(() => input.focus(), 150);
            } else {
                sceneEl.classList.add('hidden');
                sceneEl.classList.remove('active');
            }
        }
    }

    // Update Stepper Dots
    const dots = document.querySelectorAll('.stepper-dot');
    dots.forEach((dot, i) => {
        dot.classList.remove('active', 'completed');
        if (i === index) {
            dot.classList.add('active');
        } else if (i < index) {
            dot.classList.add('completed');
        }
    });

    // Update Nav Buttons
    const prevBtn = document.getElementById('prev-scene-btn');
    const nextBtn = document.getElementById('next-scene-btn');
    const submitBtn = document.getElementById('submit-screening-btn');
    const keyboardHint = document.getElementById('keyboard-hint');

    if (prevBtn) {
        if (index > 0) prevBtn.classList.remove('hidden');
        else prevBtn.classList.add('hidden');
    }

    if (index === totalScenes - 1) {
        if (nextBtn) nextBtn.classList.add('hidden');
        if (submitBtn) submitBtn.classList.remove('hidden');
        if (keyboardHint) keyboardHint.innerHTML = `<i class="fas fa-sparkles"></i> Press <kbd>Enter ↵</kbd> to Curate Night`;
    } else {
        if (nextBtn) nextBtn.classList.remove('hidden');
        if (submitBtn) submitBtn.classList.add('hidden');
        if (keyboardHint) keyboardHint.innerHTML = `<i class="fas fa-keyboard"></i> Press <kbd>Enter ↵</kbd> for Scene ${['II', 'III', 'IV'][index]}`;
    }
}

function validateCurrentScene() {
    if (currentSceneIndex === 0) {
        const mood = document.getElementById('initial_mood');
        if (!mood || !mood.value.trim()) {
            mood.focus();
            mood.placeholder = "Please share a few words about how you feel...";
            mood.style.borderColor = "#e74c3c";
            setTimeout(() => { mood.style.borderColor = ''; }, 1200);
            return false;
        }
    } else if (currentSceneIndex === 1) {
        const atm = document.getElementById('desired_atmosphere');
        if (!atm || !atm.value.trim()) {
            atm.focus();
            atm.placeholder = "Where do you want cinema to take you tonight?";
            atm.style.borderColor = "#e74c3c";
            setTimeout(() => { atm.style.borderColor = ''; }, 1200);
            return false;
        }
    }
    return true;
}

// ---------------------------------------------------------------------------
// Autonomous Multi-Agent Orchestration Execution
// ---------------------------------------------------------------------------

async function executeCinemaOrchestration() {
    const submitBtn = document.getElementById('submit-screening-btn');
    const btnText = submitBtn ? submitBtn.querySelector('.btn-text') : null;
    const spinner = submitBtn ? submitBtn.querySelector('.cinematic-spinner') : null;
    const resultsSection = document.getElementById('results');

    if (submitBtn) submitBtn.disabled = true;
    if (btnText) btnText.classList.add('hidden');
    if (spinner) spinner.classList.remove('hidden');
    if (resultsSection) resultsSection.classList.add('hidden');

    window.sessionRecommendedFilms = window.sessionRecommendedFilms || [];
    const allExcluded = Array.from(new Set([...(window.excludedFilms || []), ...(window.sessionRecommendedFilms || [])]));

    const userEmail = (currentUser && currentUser.email) ? currentUser.email : "guest";
    const savedDietary = localStorage.getItem('feelandfilm_dietary') || "";

    const requestData = {
        initial_mood: document.getElementById('initial_mood').value,
        desired_atmosphere: document.getElementById('desired_atmosphere').value,
        audience_age_range: document.getElementById('audience_age_range').value,
        dietary_preference: document.getElementById('dietary_preference').value || savedDietary || null,
        theme: document.getElementById('theme') ? document.getElementById('theme').value : "",
        slots: 1,
        excluded_films: allExcluded,
        country: detectUserCountry(),
        user_email: userEmail
    };

    try {
        const response = await fetch('/api/curate-experience', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();
        currentSessionData = data;

        // Close ethereal modal smoothly
        closeScreeningModal();

        // Render complete Cinema Package
        renderCinemaNightPackage(data);
        
        // Refresh Cinémathèque
        loadCinematheque();
        
        if (resultsSection) {
            resultsSection.classList.remove('hidden');
            resultsSection.scrollIntoView({ behavior: 'smooth' });
        }

    } catch (error) {
        alert("Failed to orchestrate cinema night: " + error.message);
        console.error(error);
    } finally {
        if (submitBtn) submitBtn.disabled = false;
        if (btnText) btnText.classList.remove('hidden');
        if (spinner) spinner.classList.add('hidden');
    }
}

function renderCinemaNightPackage(response) {
    const container = document.getElementById('slate-container');
    container.innerHTML = '';

    if (response.status === 'safety_warning') {
        container.innerHTML = `
            <div class="card" style="text-align: center; border: 1.5px solid #f59e0b; background: rgba(245, 158, 11, 0.08); padding: 35px 25px; border-radius: 12px;">
                <div style="font-size: 2.8rem; color: #f59e0b; margin-bottom: 14px;"><i class="fas fa-shield-halved"></i></div>
                <h3 style="font-family: 'Cinzel', serif; color: #fef3c7; margin-bottom: 10px; font-size: 1.4rem;">Responsible AI & Content Safety Guardrail</h3>
                <p style="color: #cbd5e1; max-width: 580px; margin: 0 auto 20px; font-size: 0.95rem; line-height: 1.5;">${response.message}</p>
                <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                    <button type="button" class="btn" style="width: auto; padding: 10px 22px; font-size: 0.9rem;" onclick="document.getElementById('theme').value=''; document.getElementById('initial_mood').value='Seeking inspiration'; document.getElementById('desired_atmosphere').value='Uplifting comfort'; document.getElementById('generate-btn').click();">
                        <i class="fas fa-sparkles"></i> Try Inspiring & Uplifting Mood
                    </button>
                </div>
            </div>
        `;
        renderAgentTrace(response.agent_trace || []);
        return;
    }

    if (response.status === 'not_found' || !response.film) {
        container.innerHTML = `
            <div class="card" style="text-align: center; border-color: var(--accent);">
                <h3>No Matching Films</h3>
                <p>${response.message || 'No film matched all specific constraints.'}</p>
            </div>
        `;
        return;
    }

    const film = response.film;
    const soundtrack = response.soundtrack || {};
    const sommelier = response.sommelier || {};
    const watch = response.watch_providers || {};
    const posterUrl = response.poster_url || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=300&q=80';

    // Register into session exclusion
    window.sessionRecommendedFilms = window.sessionRecommendedFilms || [];
    if (film.title && !window.sessionRecommendedFilms.includes(film.title)) {
        window.sessionRecommendedFilms.push(film.title);
    }

    // 1. Collaborative Partner Note
    const collabBanner = document.getElementById('collab-partner-banner');
    const collabText = document.getElementById('collab-note-text');
    if (response.collaborative_note) {
        collabText.innerText = response.collaborative_note;
        collabBanner.classList.remove('hidden');
    } else {
        collabBanner.classList.add('hidden');
    }

    // 2. Format Watch Providers
    let watchHtml = '';
    let hasWatch = false;
    if (watch.streaming && watch.streaming.length > 0) {
        hasWatch = true;
        watchHtml += `<div style="margin-bottom: 4px;"><strong>📺 Stream:</strong> ${watch.streaming.join(', ')}</div>`;
    }
    if (watch.rent && watch.rent.length > 0) {
        hasWatch = true;
        watchHtml += `<div style="margin-bottom: 4px;"><strong>🎟️ Rent:</strong> ${watch.rent.join(', ')}</div>`;
    }
    if (!hasWatch) {
        watchHtml += `<div style="color: #94a3b8;">Check local streaming catalogs or digital stores.</div>`;
    }
    if (watch.link) {
        watchHtml += `<div style="margin-top: 6px;"><a href="${watch.link}" target="_blank" rel="noopener noreferrer" style="color: #93c5fd; text-decoration: underline; font-size: 0.85em;"><i class="fas fa-external-link-alt"></i> TMDB / JustWatch details</a></div>`;
    }

    const tagsHtml = (film.mood_tags || []).map(t => `<span class="package-tag">#${t}</span>`).join('');
    const matchPct = Math.round((film.confidence_score || 0.95) * 100);

    // 3. Sommelier description text
    const sommBev = sommelier.beverage || 'Artisanal beverage';
    const sommSnack = sommelier.snack || 'Gourmet cinema snack';
    const sommReason = sommelier.pairing_reasoning || '';

    const card = document.createElement('div');
    card.className = 'package-card';
    card.innerHTML = `
        <div class="package-top">
            <div class="package-poster-wrapper">
                <img class="package-poster" src="${posterUrl}" alt="${film.title} Poster" onerror="this.src='https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=300&q=80'">
                <div class="match-pill">${matchPct}% Emotional Match</div>
            </div>
            <div>
                <div class="package-header">
                    <div>
                        <h3 class="package-title">${film.title}</h3>
                        <div class="package-meta">Directed by ${film.director || 'Cinematic Visionary'} &bull; ${film.runtime || 110} min</div>
                    </div>
                </div>
                <div class="package-tags">${tagsHtml}</div>
                <p class="package-synopsis">${film.synopsis || ''}</p>
                <div class="package-reason">
                    <strong>🧠 Emotional Journey:</strong> ${film.reasoning || ''}
                </div>
                <div class="package-fun-fact">
                    <strong>🎥 Fun Fact:</strong> ${film.fun_fact || ''}
                </div>

                <!-- Where to Watch Streaming Section -->
                <div class="streaming-box">
                    <div class="streaming-title"><i class="fas fa-tv"></i> Where to Watch (${watch.country || 'Global'})</div>
                    ${watchHtml}
                </div>
            </div>
        </div>

        <!-- Co-Piloted Concession & Soundtrack Grid -->
        <div class="subagents-grid">
            <!-- Soundtrack Expert Output -->
            <div class="subagent-card soundtrack">
                <div class="subagent-header soundtrack-title">
                    <i class="fas fa-music"></i> Soundtrack & Musicology
                </div>
                <div class="subagent-body">
                    <strong>Composer:</strong> ${soundtrack.composer || 'Original Soundtrack'}<br>
                    <strong>Musical Vibe:</strong> ${soundtrack.vibe || 'Evocative orchestration.'}
                </div>
                <div class="subagent-detail">
                    <i class="fas fa-compact-disc"></i> <strong>Standout Track:</strong> ${soundtrack.standout_track || 'Main Theme'}
                </div>
            </div>

            <!-- Sommelier Concession Output -->
            <div class="subagent-card sommelier">
                <div class="subagent-header sommelier-title">
                    <i class="fas fa-cocktail"></i> Sommelier Concession Pairing
                </div>
                <div class="subagent-body">
                    <strong>Drink:</strong> ${sommBev}<br>
                    <strong>Snack:</strong> ${sommSnack}
                </div>
                <div class="subagent-detail">
                    <i class="fas fa-utensils"></i> ${sommReason}
                </div>
            </div>
        </div>

        <!-- Behind the Scenes Curious Hook Button -->
        <div style="margin-top: 15px; display: flex; justify-content: flex-end;">
            <button type="button" class="inspect-crew-btn" onclick="scrollToTrace()">
                <i class="fas fa-clapperboard"></i> <strong>Behind the Scenes:</strong> See how your 4 agents collaborated
            </button>
        </div>
    `;

    container.appendChild(card);

    // 4. Update Visual AI Crew Pipeline Cards
    const step1 = document.getElementById('crew-step-1-desc');
    const step2 = document.getElementById('crew-step-2-desc');
    const step3 = document.getElementById('crew-step-3-desc');
    const step4 = document.getElementById('crew-step-4-desc');

    if (step1) step1.innerText = `Retrieved active memory profile (${currentUser ? currentUser.email : 'guest session'}) & dietary boundaries.`;
    if (step2) step2.innerText = `Discovered "${film.title}" (${film.runtime || 110} min, Dir. ${film.director || 'TMDB'}) live from TMDB.`;
    if (step3) step3.innerText = `Composer: ${soundtrack.composer || 'Original Score'} — Track: "${soundtrack.standout_track || 'Main Theme'}".`;
    if (step4) step4.innerText = `Paired ${sommBev} with ${sommSnack}.`;

    // 5. Render Live Agent Trace in Terminal
    renderAgentTrace(response.agent_trace || []);
}

// ---------------------------------------------------------------------------
// Behind the Scenes & Live Agent Trace Renderer
// ---------------------------------------------------------------------------

window.scrollToTrace = function() {
    const section = document.getElementById('agent-trace-section');
    if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'center' });
        section.style.borderColor = 'var(--accent)';
        section.style.boxShadow = '0 0 25px rgba(212, 175, 55, 0.6)';
        setTimeout(() => {
            section.style.boxShadow = '0 8px 30px rgba(0, 0, 0, 0.5)';
        }, 2000);
    }
};

function renderAgentTrace(traces) {
    const term = document.getElementById('terminal-log');
    if (!term) return;
    term.innerHTML = '';

    if (!traces || traces.length === 0) {
        term.innerHTML = '<div class="trace-line">No execution traces recorded.</div>';
        return;
    }

    traces.forEach((t, i) => {
        const line = document.createElement('div');
        line.className = 'trace-line';
        
        const detailsStr = (typeof t.details === 'object') ? JSON.stringify(t.details) : String(t.details || '');
        line.innerHTML = `
            <span class="trace-ts">[${t.timestamp || '00:00:00'}]</span>
            <span class="trace-agent ${t.agent || 'MasterOrchestrator'}">[${t.agent}]</span>
            <span class="trace-action">${t.action}:</span>
            <span class="trace-details" style="color: #cbd5e1;">${detailsStr}</span>
        `;
        term.appendChild(line);
    });

    // Auto-scroll terminal to bottom
    const body = document.getElementById('trace-body');
    if (body) body.scrollTop = body.scrollHeight;
}

// Trace terminal toggle
const traceToggleBtn = document.getElementById('trace-toggle-btn');
if (traceToggleBtn) {
    traceToggleBtn.addEventListener('click', () => {
        const body = document.getElementById('trace-body');
        const arrow = document.getElementById('trace-arrow-icon');
        const text = document.getElementById('trace-toggle-text');
        if (body) {
            body.classList.toggle('hidden');
            const isHidden = body.classList.contains('hidden');
            if (arrow) {
                arrow.className = isHidden ? 'fas fa-chevron-down trace-arrow-icon' : 'fas fa-chevron-up trace-arrow-icon';
            }
            if (text) {
                text.innerText = isHidden ? 'Inspect Raw Multi-Agent Execution Logs' : 'Hide Multi-Agent Execution Logs';
            }
        }
    });
}

// ---------------------------------------------------------------------------
// Continuous Learning & Feedback Loop
// ---------------------------------------------------------------------------

function initFeedbackControls() {
    // Star Rating
    const starContainer = document.getElementById('star-rating');
    const ratingHint = document.getElementById('rating-text-hint');
    const ratingTexts = {
        5: "Excellent recommendation (5/5)",
        4: "Great selection (4/5)",
        3: "Average / Neutral (3/5)",
        2: "Could be more tailored (2/5)",
        1: "Did not match my mood (1/5)"
    };

    if (starContainer) {
        const stars = starContainer.querySelectorAll('span');
        stars.forEach(star => {
            star.addEventListener('click', async () => {
                const val = parseInt(star.dataset.val);
                currentRating = val;
                if (ratingHint) ratingHint.innerText = `${ratingTexts[val] || val + '/5'} — Saving...`;
                stars.forEach(s => {
                    const sVal = parseInt(s.dataset.val);
                    if (sVal <= val) {
                        s.classList.add('active');
                    } else {
                        s.classList.remove('active');
                    }
                });

                // Auto-save rating to backend
                try {
                    const movieTitle = currentSessionData && currentSessionData.film ? currentSessionData.film.title : "Screening";
                    const userEmail = currentUser ? currentUser.email : "guest";
                    await fetch('/api/feedback', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            user_email: userEmail,
                            session_id: currentSessionData ? currentSessionData.session_id : null,
                            movie_title: movieTitle,
                            rating: val,
                            category: 'star_rating',
                            feedback_text: `Rated ${val} stars (${ratingTexts[val] || ''})`
                        })
                    });
                    if (ratingHint) ratingHint.innerHTML = `${ratingTexts[val] || val + '/5'} <span style="color: var(--success); font-weight: bold; margin-left: 6px;">✓ Saved!</span>`;
                } catch (e) {
                    if (ratingHint) ratingHint.innerText = ratingTexts[val] || `${val}/5`;
                }
            });
        });
    }

    // Feedback Quick Chips (Instant Auto-Save)
    const chips = document.querySelectorAll('.feedback-chip');
    chips.forEach(chip => {
        chip.addEventListener('click', async () => {
            chip.classList.toggle('selected');
            const pref = chip.dataset.pref;
            const isSelected = chip.classList.contains('selected');
            const statusMsg = document.getElementById('feedback-status-msg');

            if (isSelected) {
                if (!selectedFeedbackTags.includes(pref)) selectedFeedbackTags.push(pref);
                if (pref.toLowerCase().includes('alcohol') || pref.toLowerCase().includes('vegan') || pref.toLowerCase().includes('diet')) {
                    localStorage.setItem('feelandfilm_dietary', pref);
                }
                // Instant auto-save to agent memory
                try {
                    const movieTitle = currentSessionData && currentSessionData.film ? currentSessionData.film.title : "Screening";
                    const userEmail = (currentUser && currentUser.email) ? currentUser.email : "guest";
                    await fetch('/api/feedback', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            user_email: userEmail,
                            session_id: currentSessionData ? currentSessionData.session_id : null,
                            movie_title: movieTitle,
                            rating: currentRating,
                            category: 'preference_chip',
                            feedback_text: pref
                        })
                    });
                    if (statusMsg) {
                        statusMsg.innerHTML = `✓ Preference remembered: <strong>"${pref}"</strong>!`;
                        statusMsg.classList.remove('hidden');
                        setTimeout(() => {
                            statusMsg.classList.add('hidden');
                        }, 4000);
                    }
                } catch (err) {
                    console.error("Chip auto-save error:", err);
                }
            } else {
                selectedFeedbackTags = selectedFeedbackTags.filter(p => p !== pref);
                if (pref.toLowerCase().includes('alcohol') || pref.toLowerCase().includes('vegan')) {
                    localStorage.removeItem('feelandfilm_dietary');
                }
            }
        });
    });

    // Feedback Submission
    const feedbackForm = document.getElementById('feedback-form');
    if (feedbackForm) {
        feedbackForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const customText = document.getElementById('feedback-custom-text').value.trim();
            const statusMsg = document.getElementById('feedback-status-msg');
            const submitBtn = document.getElementById('feedback-submit-btn');

            const allNotes = [...selectedFeedbackTags];
            if (customText) allNotes.push(customText);
            const combinedText = allNotes.join('; ');

            if (!combinedText && currentRating === 5) {
                allNotes.push("Loved the curation");
            }

            const movieTitle = currentSessionData && currentSessionData.film ? currentSessionData.film.title : "Screening";
            const userEmail = currentUser ? currentUser.email : "guest";

            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Remembering...';

            try {
                const res = await fetch('/api/feedback', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_email: userEmail,
                        session_id: currentSessionData ? currentSessionData.session_id : null,
                        movie_title: movieTitle,
                        rating: currentRating,
                        category: 'collaborative_feedback',
                        feedback_text: combinedText || "Rated 5 stars"
                    })
                });

                const data = await res.json();
                if (data.status === 'success') {
                    statusMsg.innerText = "✓ Agent Memory Updated: Your preferences will shape future cinema nights!";
                    statusMsg.classList.remove('hidden');
                    document.getElementById('feedback-custom-text').value = '';
                    chips.forEach(c => c.classList.remove('selected'));
                    selectedFeedbackTags = [];
                }
            } catch (err) {
                console.error("Feedback submit error:", err);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-check"></i> Saved!';
                setTimeout(() => {
                    submitBtn.innerHTML = '<i class="fas fa-brain"></i> Save to Memory';
                }, 2500);
            }
        });
    }
}

// ---------------------------------------------------------------------------
// Document Initialization
// ---------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    loadCinematheque();
    initFeedbackControls();
    initScreeningInterviewModal();

    const drawerTabs = document.querySelectorAll('.drawer-tab');
    drawerTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            drawerTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            activeArchiveDrawer = tab.dataset.drawer || 'ALL';
            renderCinematheque();
        });
    });

    const expandBtn = document.getElementById('archive-expand-btn');
    if (expandBtn) {
        expandBtn.addEventListener('click', () => {
            isArchiveExpanded = !isArchiveExpanded;
            renderCinematheque();
        });
    }
});

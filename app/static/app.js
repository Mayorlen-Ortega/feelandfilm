// Feel & Film - Autonomous Agentic Orchestrator & Collaborative Memory Client

let currentUser = null;
let currentSessionData = null;
let currentRating = 5;
let selectedFeedbackTags = [];

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

    updateModalIdentityBar();
    updateSceneAuthBox();
}

function updateModalIdentityBar() {
    const bar = document.getElementById('modal-identity-bar');
    if (!bar) return;

    if (currentUser && currentUser.email) {
        bar.innerHTML = `
            <div class="modal-auth-badge logged-in">
                <i class="fas fa-user-check"></i>
                <span>${currentUser.name || currentUser.email}</span>
                <span class="badge-tag">Memory Active</span>
            </div>
        `;
    } else {
        bar.innerHTML = `
            <div class="modal-auth-badge guest">
                <i class="fas fa-user-clock"></i>
                <span>Guest Mode</span>
            </div>
            <button type="button" id="modal-login-chip-btn" class="modal-login-chip">
                <i class="fab fa-google"></i> Sign in with Google
            </button>
        `;
        const chipBtn = document.getElementById('modal-login-chip-btn');
        if (chipBtn) {
            chipBtn.addEventListener('click', (e) => {
                e.preventDefault();
                openAuthModal();
            });
        }
    }
}

function updateSceneAuthBox() {
    const box = document.getElementById('scene-auth-box');
    if (!box) return;

    if (currentUser && currentUser.email) {
        box.className = 'scene-auth-box logged-in';
        box.innerHTML = `
            <div class="auth-box-prompt">
                <i class="fas fa-user-check"></i>
                <div>
                    <strong>Ready to curate for ${currentUser.name || currentUser.email}</strong>
                    <p>Your collaborative taste memory will actively shape tonight's experience.</p>
                </div>
            </div>
            <button type="submit" id="submit-screening-btn" class="btn btn-scene-submit">
                <span class="btn-text"><i class="fas fa-wand-magic-sparkles"></i> Orchestrate Cinema Night</span>
                <div class="cinematic-spinner hidden">
                    <span class="reel">🎞️</span>
                    <span class="sp-text">Coordinating 4 agents...</span>
                </div>
            </button>
        `;
    } else {
        box.className = 'scene-auth-box';
        box.innerHTML = `
            <div class="auth-box-prompt">
                <i class="fas fa-brain"></i>
                <div>
                    <strong>Save to your Personal Memory?</strong>
                    <p>Sign in with Google to sync preferences across sessions, or continue as guest.</p>
                </div>
            </div>
            <div class="auth-box-buttons">
                <button type="submit" id="submit-screening-btn" class="btn btn-scene-guest">
                    <span class="btn-text"><i class="fas fa-user-clock"></i> Continue as Guest</span>
                    <div class="cinematic-spinner hidden">
                        <span class="reel">🎞️</span>
                        <span class="sp-text">Coordinating...</span>
                    </div>
                </button>
                <span class="choice-or">or</span>
                <button type="button" id="scene-google-login-btn" class="btn btn-scene-google">
                    <i class="fab fa-google"></i> Sign in with Google
                </button>
            </div>
        `;

        const sceneGoogleBtn = document.getElementById('scene-google-login-btn');
        if (sceneGoogleBtn) {
            sceneGoogleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                openAuthModal();
            });
        }
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

    // 1. Open Modal Trigger & Intro Loader Dismissal
    const introLoader = document.getElementById('intro-curator-loader');
    let introTimer = null;

    function dismissIntroLoader() {
        if (introTimer) clearTimeout(introTimer);
        if (introLoader) {
            introLoader.classList.add('fade-out');
            setTimeout(() => introLoader.remove(), 500);
        }
    }

    if (startBtn) {
        startBtn.addEventListener('click', () => {
            dismissIntroLoader();
            openScreeningModal();
        });
    }

    // 2. Browse Vault Shortcuts (Checks auth first)
    function navigateToCinemathequeVault(e) {
        if (e) e.preventDefault();
        dismissIntroLoader();
        if (!currentUser || !currentUser.email) {
            openAuthModal();
            return;
        }
        closeScreeningModal();
        const archiveSection = document.getElementById('cinematheque-section');
        if (archiveSection) {
            archiveSection.scrollIntoView({ behavior: 'smooth' });
        }
    }

    if (browseVaultBtn) {
        browseVaultBtn.addEventListener('click', navigateToCinemathequeVault);
    }
    const modalBrowseVaultBtn = document.getElementById('modal-browse-vault-btn');
    if (modalBrowseVaultBtn) {
        modalBrowseVaultBtn.addEventListener('click', navigateToCinemathequeVault);
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
    attachPillClickListeners();

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

    // Ambient loading delay (2.3s) so user can comfortably appreciate the Feel & Film landing page
    introTimer = setTimeout(() => {
        const resultsSection = document.getElementById('results');
        if (resultsSection && resultsSection.classList.contains('hidden')) {
            dismissIntroLoader();
            openScreeningModal();
        }
    }, 2300);
}

function attachPillClickListeners() {
    const pills = document.querySelectorAll('.scene-pill');
    pills.forEach(pill => {
        pill.onclick = () => {
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

                if (targetId === 'desired_atmosphere' || targetId === 'initial_mood') {
                    updateScene4Pills();
                }
            }
        };
    });
}

function refreshScreeningPills() {
    // 1. Scene I: Initial Moods (Adaptive to past states)
    const moodContainer = document.getElementById('scene-0-pills');
    if (moodContainer) {
        const pastMoods = (allArchiveRecords || []).map(r => r.primary_mood || r.initial_mood).filter(Boolean);
        const uniquePastMoods = Array.from(new Set(pastMoods));
        
        const moodPool = [
            { label: "Exhausted & Need Comfort", val: "Exhausted after a long week, craving comfort and peaceful warmth" },
            { label: "Melancholic & Reflective", val: "Melancholic and contemplative, looking for deep emotional beauty" },
            { label: "Stressed & Craving Escape", val: "Stressed from daily routine, seeking gripping escape" },
            { label: "Curious & Adventurous", val: "Curious and adventurous, open to mind-bending stories" },
            { label: "Cozy & Introspective", val: "Cozy evening at home, wanting quiet and thoughtful storytelling" },
            { label: "Energetic & Playful", val: "High energy, looking for witty fun and vibrant rhythm" }
        ];

        let finalMoods = [...moodPool];
        if (uniquePastMoods.length > 0) {
            const topMood = uniquePastMoods[0];
            finalMoods.unshift({ label: `✨ Feel like (${topMood}) again`, val: `In the mood for ${topMood}, looking for restorative cinema` });
        }
        
        moodContainer.innerHTML = `
            <span class="suggestion-label">
                <i class="fas fa-sparkles"></i> Quick feelings 
                <span class="suggestion-badge"><i class="fas fa-brain"></i> Generated from your interactions</span>:
            </span>
            ${finalMoods.slice(0, 5).map(m => `
                <button type="button" class="scene-pill" data-target="initial_mood" data-val="${m.val}">${m.label}</button>
            `).join('')}
        `;
    }

    // 2. Scene II: Desired Atmospheres (Curated rotating pool)
    const atmContainer = document.getElementById('scene-1-pills');
    if (atmContainer) {
        const atmPool = [
            { label: "Cozy & Uplifting", val: "Cozy, uplifting comfort and warm laughter" },
            { label: "Poetic & Philosophical", val: "Deep philosophical thought and poetic cinematography" },
            { label: "Suspense & Mystery", val: "High-tension mystery and psychological suspense" },
            { label: "Heartwarming Romance", val: "Warm, heartwarming romance and emotional comfort" },
            { label: "Surreal & Mind-Bending", val: "Surreal visuals, time-twists, and mind-bending puzzle storytelling" },
            { label: "Atmospheric Neo-Noir", val: "Moody neo-noir, rainy neon streets, and deep jazz atmosphere" }
        ];

        atmContainer.innerHTML = `
            <span class="suggestion-label">
                <i class="fas fa-compass"></i> Destinations 
                <span class="suggestion-badge"><i class="fas fa-brain"></i> Generated from your interactions</span>:
            </span>
            ${atmPool.slice(0, 5).map(a => `
                <button type="button" class="scene-pill" data-target="desired_atmosphere" data-val="${a.val}">${a.label}</button>
            `).join('')}
        `;
    }

    // 3. Scene III: Dietary Preferences & Palate Tags
    const dietContainer = document.getElementById('scene-2-pills');
    if (dietContainer) {
        dietContainer.innerHTML = `
            <span class="suggestion-label">
                <i class="fas fa-utensils"></i> Instant dietary tags 
                <span class="suggestion-badge"><i class="fas fa-brain"></i> Generated from your interactions</span>:
            </span>
            <button type="button" class="scene-pill" data-target="dietary_preference" data-val="Non-alcoholic pairings only">🚫 Non-alcoholic only</button>
            <button type="button" class="scene-pill" data-target="dietary_preference" data-val="Vegan food only">🌱 Vegan snacks only</button>
            <button type="button" class="scene-pill" data-target="dietary_preference" data-val="Sweet concession pairing">🍿 Sweet treats</button>
            <button type="button" class="scene-pill" data-target="dietary_preference" data-val="Savory gourmet pairing">🧀 Savory gourmet</button>
        `;
    }

    // 4. Scene IV: Directors, Studios, Eras & Genres (Strictly coherent with Desired Atmosphere)
    updateScene4Pills();
    attachPillClickListeners();
}

function updateScene4Pills() {
    const nuancContainer = document.getElementById('scene-3-pills');
    if (!nuancContainer) return;

    const atmVal = (document.getElementById('desired_atmosphere')?.value || '').toLowerCase();
    const moodVal = (document.getElementById('initial_mood')?.value || '').toLowerCase();
    const combined = `${moodVal} ${atmVal}`;

    let curatedPills = [];

    if (combined.includes('thrill') || combined.includes('suspense') || combined.includes('myster') || combined.includes('crim') || combined.includes('twist') || combined.includes('noir') || combined.includes('tension') || combined.includes('detective') || combined.includes('trailler') || combined.includes('trailer')) {
        curatedPills = [
            { label: "🎬 David Fincher", val: "David Fincher" },
            { label: "🕵️ Denis Villeneuve", val: "Denis Villeneuve" },
            { label: "🔪 Alfred Hitchcock", val: "Alfred Hitchcock" },
            { label: "⚡ A24 Thrillers", val: "A24 psychological thriller" },
            { label: "📼 90s Psychological Thrillers", val: "90s psychological thriller" },
            { label: "🩸 Neo-Noir Mystery", val: "neo-noir mystery" },
            { label: "🇰🇷 Bong Joon-ho", val: "Bong Joon-ho" }
        ];
    } else if (combined.includes('horror') || combined.includes('terror') || combined.includes('dark') || combined.includes('miedo') || combined.includes('scary')) {
        curatedPills = [
            { label: "👁️ Guillermo del Toro", val: "Guillermo del Toro" },
            { label: "🕯️ Jordan Peele", val: "Jordan Peele" },
            { label: "🩸 Ari Aster", val: "Ari Aster" },
            { label: "⚡ A24 Horror", val: "A24 psychological horror" },
            { label: "📼 80s Supernatural", val: "80s supernatural horror" },
            { label: "🎬 John Carpenter", val: "John Carpenter" }
        ];
    } else if (combined.includes('cozy') || combined.includes('comfort') || combined.includes('uplift') || combined.includes('laugh') || combined.includes('humor') || combined.includes('comed') || combined.includes('animat') || combined.includes('warm') || combined.includes('family')) {
        curatedPills = [
            { label: "🌸 Studio Ghibli", val: "Studio Ghibli" },
            { label: "✨ Wes Anderson", val: "Wes Anderson" },
            { label: "🐉 Hayao Miyazaki", val: "Hayao Miyazaki" },
            { label: "🎨 Pixar Classics", val: "Pixar animation" },
            { label: "📼 80s Feel-Good", val: "80s feel-good comedy" },
            { label: "🎞️ 90s Family Adventures", val: "90s family adventure" },
            { label: "🎭 French Comedy", val: "French auteur comedy" }
        ];
    } else if (combined.includes('poetic') || combined.includes('philosop') || combined.includes('contemplat') || combined.includes('calm') || combined.includes('melanchol') || combined.includes('drama') || combined.includes('art') || combined.includes('deep')) {
        curatedPills = [
            { label: "🎬 Alfonso Cuarón", val: "Alfonso Cuarón" },
            { label: "🌊 Andrei Tarkovsky", val: "Andrei Tarkovsky" },
            { label: "⚡ A24 Art-House", val: "A24 contemplative indie" },
            { label: "🎞️ Wong Kar-wai", val: "Wong Kar-wai" },
            { label: "🌎 Cine Latinoamericano", val: "cine latinoamericano" },
            { label: "🗼 Nouvelle Vague", val: "French New Wave" },
            { label: "🌿 Hirokazu Kore-eda", val: "Hirokazu Kore-eda" }
        ];
    } else if (combined.includes('romanc') || combined.includes('love') || combined.includes('amor') || combined.includes('heartwarming') || combined.includes('intima')) {
        curatedPills = [
            { label: "💖 Richard Linklater", val: "Richard Linklater" },
            { label: "☕ Nora Ephron", val: "Nora Ephron" },
            { label: "🎞️ 90s Rom-Coms", val: "90s romantic comedy" },
            { label: "🌸 Makoto Shinkai", val: "Makoto Shinkai" },
            { label: "🗼 French Romance", val: "French romance cinema" },
            { label: "🎬 Céline Sciamma", val: "Céline Sciamma" }
        ];
    } else if (combined.includes('scifi') || combined.includes('sci-fi') || combined.includes('space') || combined.includes('futur') || combined.includes('mind-bend') || combined.includes('surreal') || combined.includes('cosmic')) {
        curatedPills = [
            { label: "🚀 Christopher Nolan", val: "Christopher Nolan" },
            { label: "🌌 Denis Villeneuve", val: "Denis Villeneuve" },
            { label: "🛸 Stanley Kubrick", val: "Stanley Kubrick" },
            { label: "⚡ Cyberpunk & Dystopia", val: "cyberpunk scifi" },
            { label: "📼 80s Sci-Fi", val: "80s science fiction classics" },
            { label: "🎬 Ridley Scott", val: "Ridley Scott" }
        ];
    } else if (combined.includes('action') || combined.includes('energet') || combined.includes('adrenalin') || combined.includes('epic') || combined.includes('fight') || combined.includes('excit')) {
        curatedPills = [
            { label: "📽️ Quentin Tarantino", val: "Quentin Tarantino" },
            { label: "🔥 George Miller", val: "George Miller" },
            { label: "🥋 Johnnie To", val: "Johnnie To" },
            { label: "📼 80s Action", val: "80s high-octane action" },
            { label: "🇰🇷 Korean Action Thrillers", val: "Korean action thriller" },
            { label: "🎬 Edgar Wright", val: "Edgar Wright" }
        ];
    } else {
        curatedPills = [
            { label: "⚡ A24 Indie", val: "A24" },
            { label: "🎬 Alfonso Cuarón", val: "Alfonso Cuarón" },
            { label: "🌸 Studio Ghibli", val: "Studio Ghibli" },
            { label: "📼 Años 80", val: "años 80" },
            { label: "🎞️ Años 90", val: "años 90" },
            { label: "🌎 Cine Latinoamericano", val: "cine latinoamericano" },
            { label: "📽️ Quentin Tarantino", val: "Quentin Tarantino" }
        ];
    }

    nuancContainer.innerHTML = `
        <span class="suggestion-label">
            <i class="fas fa-film"></i> Tailored to your destination
            <span class="suggestion-badge"><i class="fas fa-brain"></i> Dynamic Nuance Matching</span>:
        </span>
        ${curatedPills.map(n => `
            <button type="button" class="scene-pill" data-target="theme" data-val="${n.val}">${n.label}</button>
        `).join('')}
    `;

    attachPillClickListeners();
}

function openScreeningModal() {
    const modal = document.getElementById('screening-modal');
    if (!modal) return;
    updateModalIdentityBar();
    updateSceneAuthBox();
    refreshScreeningPills();
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
    const keyboardHint = document.getElementById('keyboard-hint');

    if (prevBtn) {
        if (index > 0) prevBtn.classList.remove('hidden');
        else prevBtn.classList.add('hidden');
    }

    if (index === totalScenes - 1) {
        updateScene4Pills();
        updateSceneAuthBox();
        if (nextBtn) nextBtn.classList.add('hidden');
        if (keyboardHint) keyboardHint.innerHTML = `<i class="fas fa-sparkles"></i> Press <kbd>Enter ↵</kbd> to Launch`;
    } else {
        if (nextBtn) nextBtn.classList.remove('hidden');
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

function getGlobalExcludedFilms() {
    const archiveTitles = (allArchiveRecords || []).map(r => r.title).filter(Boolean);
    const sessionTitles = window.sessionRecommendedFilms || [];
    const manualTitles = window.excludedFilms || [];
    return Array.from(new Set([...archiveTitles, ...sessionTitles, ...manualTitles]));
}

async function executeCinemaOrchestration() {
    const submitBtn = document.getElementById('submit-screening-btn');
    const btnText = submitBtn ? submitBtn.querySelector('.btn-text') : null;
    const spinner = submitBtn ? submitBtn.querySelector('.cinematic-spinner') : null;
    const resultsSection = document.getElementById('results');

    if (submitBtn) submitBtn.disabled = true;
    if (btnText) btnText.classList.add('hidden');
    if (spinner) spinner.classList.remove('hidden');
    if (resultsSection) resultsSection.classList.add('hidden');

    const allExcluded = getGlobalExcludedFilms();

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
        ${response.ai_battery_warning ? `
            <div class="ai-battery-banner">
                <i class="fas fa-battery-half"></i> ${response.ai_battery_warning}
            </div>
        ` : ''}

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
                        ${(film.cast && Array.isArray(film.cast) && film.cast.length > 0) ? `<div class="package-cast"><i class="fas fa-users-viewfinder"></i> <strong>Starring:</strong> ${film.cast.join(', ')}</div>` : ''}
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

        <!-- Action Row: Re-roll, Email Dispatch & Behind the Scenes -->
        <div class="package-actions-toolbar">
            <div class="package-actions-left">
                <button type="button" class="btn btn-reroll-same-mood" id="reroll-same-mood-btn" onclick="curateAnotherRecommendationSameMood()" title="Discover another movie for this exact same emotional state without re-filling the form">
                    <i class="fas fa-dice"></i> <strong>Suggest Another Film</strong> (Same Mood)
                </button>
                <button type="button" class="btn btn-email-dispatch" onclick="openCinemaEmailModal()">
                    <i class="fas fa-envelope-open-text"></i> <strong>Send to My Email</strong>
                </button>
            </div>
            <button type="button" class="inspect-crew-btn" onclick="scrollToTrace()">
                <i class="fas fa-clapperboard"></i> <strong>Behind the Scenes:</strong> See how your agents collaborated
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
// Behind the Scenes: Agent Crew & Terminal Trace Logger
// ---------------------------------------------------------------------------

function toggleTraceLogs() {
    const traceBody = document.getElementById('trace-body');
    const arrowIcon = document.getElementById('trace-arrow-icon');
    const toggleText = document.getElementById('trace-toggle-text');
    if (!traceBody) return;

    const isCurrentlyHidden = traceBody.classList.contains('hidden') || traceBody.style.display === 'none';

    if (isCurrentlyHidden) {
        traceBody.classList.remove('hidden');
        traceBody.style.display = 'block';
        if (arrowIcon) arrowIcon.classList.add('rotated');
        if (toggleText) toggleText.innerText = "Hide Multi-Agent Execution Logs";

        const currentTraces = (currentSessionData && currentSessionData.agent_trace && currentSessionData.agent_trace.length > 0)
            ? currentSessionData.agent_trace
            : null;
        renderAgentTrace(currentTraces);
    } else {
        traceBody.classList.add('hidden');
        traceBody.style.display = 'none';
        if (arrowIcon) arrowIcon.classList.remove('rotated');
        if (toggleText) toggleText.innerText = "Inspect Raw Multi-Agent Execution Logs";
    }
}

window.toggleTraceLogs = toggleTraceLogs;

function scrollToTrace() {
    const traceSection = document.getElementById('agent-trace-section');
    const traceBody = document.getElementById('trace-body');
    const arrowIcon = document.getElementById('trace-arrow-icon');
    const toggleText = document.getElementById('trace-toggle-text');

    if (traceBody) {
        traceBody.classList.remove('hidden');
        traceBody.style.display = 'block';
        if (arrowIcon) arrowIcon.classList.add('rotated');
        if (toggleText) toggleText.innerText = "Hide Multi-Agent Execution Logs";

        const currentTraces = (currentSessionData && currentSessionData.agent_trace && currentSessionData.agent_trace.length > 0)
            ? currentSessionData.agent_trace
            : null;
        renderAgentTrace(currentTraces);
    }

    if (traceSection) {
        traceSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

window.scrollToTrace = scrollToTrace;

function renderAgentTrace(traces) {
    const terminal = document.getElementById('terminal-log');
    if (!terminal) return;

    if (!traces || traces.length === 0) {
        const timeStr = new Date().toLocaleTimeString();
        terminal.innerHTML = `
            <div class="terminal-entry system" style="border-left-color: #facc15;">
                <div class="term-header-line">
                    <span class="term-time">[${timeStr}]</span>
                    <span class="term-agent system" style="color: #facc15;">[Google ADK &bull; Gemini Multi-Agent Core]</span>
                    <strong class="term-action" style="color: #fef08a;">Tripulación en Modo de Espera / Crew on Standby</strong>
                </div>
                <div class="term-details-box" style="line-height: 1.5;">
                    <p style="margin: 0 0 6px 0; color: #e2e8f0; font-size: 0.8rem;">
                        <strong>ℹ️ Aún no hay trazas de ejecución registradas:</strong>
                    </p>
                    <p style="margin: 0 0 8px 0; color: #cbd5e1; font-size: 0.76rem;">
                        Para activar y observar los logs de ejecución en vivo de los 4 agentes autónomos (<em>Master Orchestrator</em>, <em>Film Curator Agent</em>, <em>Soundtrack Maestro</em> y <em>Cinema Sommelier</em>), primero realiza una búsqueda seleccionando tu estado de ánimo arriba o revive una película guardada desde tu Cineteca.
                    </p>
                    <div style="margin-top: 8px;">
                        <button type="button" class="btn" style="width: auto; padding: 5px 14px; font-size: 0.74rem; font-family: 'Cinzel', serif;" onclick="document.getElementById('form-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });">
                            <i class="fas fa-sparkles"></i> Ir al Formulario y Curar Película
                        </button>
                    </div>
                </div>
            </div>
        `;
        return;
    }

    terminal.innerHTML = traces.map(t => {
        const agentName = t.agent || 'MasterOrchestrator';
        const agentClass = agentName.toLowerCase().replace(/[^a-z0-9]/g, '');
        let formattedDetails = "";

        if (t.details && typeof t.details === 'object') {
            formattedDetails = `<pre class="term-json">${JSON.stringify(t.details, null, 2)}</pre>`;
        } else if (t.details) {
            formattedDetails = `<span class="term-text">${t.details}</span>`;
        }

        return `
            <div class="terminal-entry ${agentClass}">
                <div class="term-header-line">
                    <span class="term-time">[${t.timestamp || new Date().toLocaleTimeString()}]</span>
                    <span class="term-agent ${agentClass}">[${agentName}]</span>
                    ${t.step ? `<span class="term-step">&lt;${t.step}&gt;</span>` : ''}
                    <strong class="term-action">${t.action || 'Executed Action'}</strong>
                </div>
                ${formattedDetails ? `<div class="term-details-box">${formattedDetails}</div>` : ''}
            </div>
        `;
    }).join('');
}

window.renderAgentTrace = renderAgentTrace;

// ---------------------------------------------------------------------------
// Re-roll Another Recommendation (Keep Same Mood)
// ---------------------------------------------------------------------------

async function curateAnotherRecommendationSameMood() {
    const rerollBtn = document.getElementById('reroll-same-mood-btn');
    if (!currentSessionData || !currentSessionData.film) return;

    const currentTitle = currentSessionData.film.title;
    const allExcluded = getGlobalExcludedFilms();
    if (currentTitle && !allExcluded.includes(currentTitle)) {
        allExcluded.push(currentTitle);
    }

    let originalHtml = "";
    if (rerollBtn) {
        originalHtml = rerollBtn.innerHTML;
        rerollBtn.disabled = true;
        rerollBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exploring Alternative Film...';
    }

    const userEmail = (currentUser && currentUser.email) ? currentUser.email : "guest";
    const savedDietary = localStorage.getItem('feelandfilm_dietary') || null;

    const requestData = {
        initial_mood: document.getElementById('initial_mood')?.value || currentSessionData.primary_mood || "Seeking inspiration",
        desired_atmosphere: document.getElementById('desired_atmosphere')?.value || currentSessionData.target_shift || "Uplifting comfort",
        audience_age_range: document.getElementById('audience_age_range')?.value || "Adults (18+)",
        dietary_preference: document.getElementById('dietary_preference')?.value || savedDietary || null,
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
            throw new Error(`Server status ${response.status}`);
        }

        const data = await response.json();
        currentSessionData = data;
        renderCinemaNightPackage(data);
        loadCinematheque();

        const slate = document.getElementById('slate-container');
        if (slate) slate.scrollIntoView({ behavior: 'smooth', block: 'start' });

    } catch (err) {
        console.error("Re-roll recommendation error:", err);
        alert("Could not load another recommendation right now: " + err.message);
    } finally {
        if (rerollBtn) {
            rerollBtn.disabled = false;
            rerollBtn.innerHTML = originalHtml;
        }
    }
}

window.curateAnotherRecommendationSameMood = curateAnotherRecommendationSameMood;

// ---------------------------------------------------------------------------
// Cinema Courier & Email Dispatch Modal Handlers
// ---------------------------------------------------------------------------

let lastDraftedEpistleText = "";

function openCinemaEmailModal() {
    const modal = document.getElementById('cinema-email-modal');
    const emailInput = document.getElementById('epistle-recipient-email');
    const resultBox = document.getElementById('epistle-result-box');
    const form = document.getElementById('cinema-email-form');

    if (emailInput && currentUser && currentUser.email && currentUser.email !== 'guest') {
        emailInput.value = currentUser.email;
    }
    if (resultBox) resultBox.classList.add('hidden');
    if (form) form.classList.remove('hidden');
    if (modal) modal.classList.remove('hidden');
}

window.openCinemaEmailModal = openCinemaEmailModal;

function closeCinemaEmailModal() {
    const modal = document.getElementById('cinema-email-modal');
    if (modal) modal.classList.add('hidden');
}

window.closeCinemaEmailModal = closeCinemaEmailModal;

async function handleSendCinemaEmail(e) {
    if (e) e.preventDefault();
    if (!currentSessionData) {
        alert("No active cinema package found to dispatch.");
        return;
    }

    const emailInput = document.getElementById('epistle-recipient-email');
    const sendBtn = document.getElementById('epistle-send-btn');
    const resultBox = document.getElementById('epistle-result-box');
    const previewEl = document.getElementById('epistle-letter-preview');
    const statusText = document.getElementById('epistle-status-text');
    const form = document.getElementById('cinema-email-form');

    const targetEmail = (emailInput?.value || '').trim();
    if (!targetEmail) return;

    const originalHtml = sendBtn.innerHTML;
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cinema Courier Drafting...';

    try {
        const res = await fetch('/api/send-cinema-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                recipient_email: targetEmail,
                user_name: (currentUser && currentUser.name) ? currentUser.name : "Cinephile",
                package_data: currentSessionData
            })
        });

        const data = await res.json();
        if (data.status === 'success' && data.epistle) {
            const ep = data.epistle;
            const filmInfo = ep.film_showcase || {};
            const sommInfo = ep.sommelier_prep_guide || {};

            lastDraftedEpistleText = `${ep.subject || 'Cinema Night'}\n\n${ep.greeting || ''}\n\n${ep.curator_epistle || ''}\n\n🎬 FEATURE FILM: ${filmInfo.title || ''} (${filmInfo.runtime || ''})\nDirector: ${filmInfo.director || ''}\n${filmInfo.curator_reason || ''}\n\n🍸 CONCESSION PAIRING:\n- Drink: ${sommInfo.drink_name || ''} (${sommInfo.drink_recipe_steps || ''})\n- Snack: ${sommInfo.snack_name || ''} (${sommInfo.snack_serving_tip || ''})\n\n🎵 ACOUSTIC ATMOSPHERE:\n${ep.soundtrack_atmosphere_tip || ''}\n\n📺 STREAMING GUIDE:\n${ep.streaming_watch_guide || ''}\n\n${ep.valediction || ''}`;

            if (previewEl) {
                previewEl.innerHTML = `
                    <h4>${ep.subject || '🎬 Your Cinema Night Package'}</h4>
                    <p style="font-weight: 600; color: #fff; margin-bottom: 6px;">${ep.greeting || 'Dear Cinephile,'}</p>
                    <p style="margin-bottom: 12px;">${ep.curator_epistle || ''}</p>
                    
                    <div class="epistle-highlight-box">
                        <strong style="color: var(--accent);">🎬 ${filmInfo.title || 'Selected Film'}</strong> (${filmInfo.runtime || ''})<br>
                        <span style="color: #94a3b8; font-size: 0.8rem;">Directed by ${filmInfo.director || ''}</span>
                        <p style="margin: 4px 0 0 0; font-size: 0.85rem;">${filmInfo.curator_reason || ''}</p>
                    </div>

                    <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); padding: 10px; border-radius: 6px; margin: 10px 0;">
                        <strong style="color: #a7f3d0; font-size: 0.85rem;">🍸 Concession Preparation:</strong>
                        <p style="margin: 3px 0; font-size: 0.82rem;"><strong>${sommInfo.drink_name || ''}:</strong> ${sommInfo.drink_recipe_steps || ''}</p>
                        <p style="margin: 3px 0; font-size: 0.82rem;"><strong>${sommInfo.snack_name || ''}:</strong> ${sommInfo.snack_serving_tip || ''}</p>
                    </div>

                    <p style="font-size: 0.82rem; color: #94a3b8; margin: 6px 0;">🎵 <strong>Atmosphere:</strong> ${ep.soundtrack_atmosphere_tip || ''}</p>
                    <p style="font-size: 0.82rem; color: var(--accent); margin: 6px 0;">📺 <strong>Where to Stream:</strong> ${ep.streaming_watch_guide || ''}</p>
                    <p style="font-size: 0.8rem; color: #64748b; margin-top: 10px; font-style: italic; text-align: center;">${ep.valediction || ''}</p>
                `;
            }

            if (statusText) {
                statusText.innerHTML = data.dispatched 
                    ? `<i class="fas fa-paper-plane"></i> <strong>Dispatched live to ${targetEmail}!</strong>`
                    : `<i class="fas fa-file-pen"></i> <strong>Epistle Drafted by AI Concierge</strong> (Ready to copy below. To send directly via SMTP, add SMTP credentials in .env).`;
            }

            if (form) form.classList.add('hidden');
            if (resultBox) resultBox.classList.remove('hidden');
        } else {
            alert("Could not draft epistle at this time. Please try again.");
        }
    } catch (err) {
        console.error("Failed to send cinema email:", err);
        alert("Error dispatching email: " + err.message);
    } finally {
        sendBtn.disabled = false;
        sendBtn.innerHTML = originalHtml;
    }
}

window.handleSendCinemaEmail = handleSendCinemaEmail;

function copyEpistleToClipboard() {
    if (!lastDraftedEpistleText) return;
    navigator.clipboard.writeText(lastDraftedEpistleText).then(() => {
        const btn = document.getElementById('copy-epistle-btn');
        if (btn) {
            btn.innerHTML = '<i class="fas fa-check"></i> Copied to Clipboard!';
            setTimeout(() => {
                btn.innerHTML = '<i class="fas fa-copy"></i> Copy Letter Text';
            }, 2000);
        }
    }).catch(err => {
        console.error("Clipboard copy error:", err);
    });
}

window.copyEpistleToClipboard = copyEpistleToClipboard;

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
// The Cinémathèque Archive & Biopic Trailer Engine (Google Veo, Lyria & Gemma)
// ---------------------------------------------------------------------------

let allArchiveRecords = [];
let activeArchiveDrawer = 'ALL';
let activeArchiveSort = 'recent_desc';
let isArchiveExpanded = false;
let currentBiopicStoryboard = null;
let currentBiopicActIndex = 0;
let biopicPlaybackTimer = null;
let isBiopicPlaying = false;

function onArchiveSortChange(sortVal) {
    activeArchiveSort = sortVal;
    renderCinematheque();
}

window.onArchiveSortChange = onArchiveSortChange;

// Watched IDs & Film Ratings Storage
function getWatchedFilmIds() {
    try {
        const stored = localStorage.getItem('feelandfilm_watched_ids');
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        return [];
    }
}

function saveWatchedFilmIds(ids) {
    try {
        localStorage.setItem('feelandfilm_watched_ids', JSON.stringify(ids));
    } catch (e) {}
}

function getArchivedRatings() {
    try {
        const stored = localStorage.getItem('feelandfilm_ratings');
        return stored ? JSON.parse(stored) : {};
    } catch (e) {
        return {};
    }
}

function saveArchivedRatings(ratings) {
    try {
        localStorage.setItem('feelandfilm_ratings', JSON.stringify(ratings));
    } catch (e) {}
}

async function rateArchivedFilm(sessionId, title, rating, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    if (!sessionId) return;

    const ratings = getArchivedRatings();
    ratings[sessionId] = rating;
    saveArchivedRatings(ratings);
    renderCinematheque();

    // Auto-save feedback & user preference to agent memory
    try {
        const userEmail = (currentUser && currentUser.email) ? currentUser.email : "guest";
        await fetch('/api/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_email: userEmail,
                session_id: sessionId,
                movie_title: title || "Archived Movie",
                rating: rating,
                category: 'archived_film_rating',
                feedback_text: `User rated ${title} ${rating} stars after watching it.`
            })
        });
    } catch (e) {
        console.error("Failed to sync archived rating:", e);
    }
}

window.rateArchivedFilm = rateArchivedFilm;

async function toggleWatchedFilm(sessionId) {
    if (!currentUser || !currentUser.email) {
        openAuthModal();
        return;
    }

    let watchedIds = getWatchedFilmIds();
    const isNowWatched = !watchedIds.includes(sessionId);

    if (isNowWatched) {
        watchedIds.push(sessionId);
    } else {
        watchedIds = watchedIds.filter(id => id !== sessionId);
    }
    saveWatchedFilmIds(watchedIds);

    // Sync with backend API
    try {
        await fetch('/api/cinematheque/toggle-watched', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId, is_watched: isNowWatched })
        });
    } catch (e) {
        console.error("Failed to sync watched status:", e);
    }

    renderCinematheque();
    updateBiopicMilestone();
}

window.toggleWatchedFilm = toggleWatchedFilm;

async function deleteCinemathequeItem(sessionId, title, e) {
    if (e) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }
    
    // 1. Instant smooth visual removal
    const card = (sessionId && document.getElementById(`record-${sessionId}`)) || 
                 document.querySelector(`[data-session-id="${sessionId}"]`)?.closest('.archive-record-card') ||
                 (title && Array.from(document.querySelectorAll('.archive-title')).find(el => el.textContent.trim().toLowerCase() === title.toLowerCase())?.closest('.archive-record-card'));
    
    if (card) {
        card.style.transition = 'all 0.25s ease';
        card.style.opacity = '0';
        card.style.transform = 'scale(0.9)';
    }

    // 2. Filter local array
    allArchiveRecords = allArchiveRecords.filter(r => {
        if (sessionId && r.session_id && String(r.session_id) === String(sessionId)) return false;
        if (title && r.title && r.title.toLowerCase() === title.toLowerCase()) return false;
        return true;
    });

    if (sessionId) {
        let watchedIds = getWatchedFilmIds().filter(id => String(id) !== String(sessionId));
        saveWatchedFilmIds(watchedIds);
        const ratings = getArchivedRatings();
        delete ratings[sessionId];
        saveArchivedRatings(ratings);
    }

    setTimeout(() => {
        renderCinematheque();
        updateBiopicMilestone();
    }, 200);

    // 3. Persist to backend
    const targetKey = sessionId || (title ? encodeURIComponent(title) : "");
    if (targetKey) {
        try {
            await fetch(`/api/cinematheque/${targetKey}`, { method: 'DELETE' });
        } catch (err) {
            console.error("Delete cinematheque item error:", err);
        }
    }
}

window.deleteCinemathequeItem = deleteCinemathequeItem;

// Event delegation fallback for archive delete buttons
document.addEventListener('click', (e) => {
    const btn = e.target.closest('.archive-delete-btn');
    if (btn) {
        e.preventDefault();
        e.stopPropagation();
        const sid = btn.dataset.sessionId || btn.getAttribute('data-session-id');
        const tit = btn.dataset.title || btn.getAttribute('data-title');
        deleteCinemathequeItem(sid, tit, e);
    }
});

async function loadCinematheque() {
    const userEmail = (currentUser && currentUser.email) ? currentUser.email : "guest";
    const guestBanner = document.getElementById('archive-guest-banner');
    const milestoneCard = document.getElementById('biopic-milestone-card');

    if (userEmail === "guest") {
        if (guestBanner) guestBanner.classList.remove('hidden');
        if (milestoneCard) milestoneCard.classList.add('hidden');
        allArchiveRecords = [];
        renderCinematheque();
        return;
    }

    if (guestBanner) guestBanner.classList.add('hidden');
    if (milestoneCard) milestoneCard.classList.remove('hidden');

    try {
        const res = await fetch(`/api/cinematheque?user_email=${encodeURIComponent(userEmail)}`);
        const data = await res.json();
        if (data.status === 'success') {
            allArchiveRecords = data.records || [];
            renderCinematheque();
            updateBiopicMilestone();
            refreshScreeningPills();
        }
    } catch (e) {
        console.error("Failed to load Cinémathèque:", e);
    }
}

function renderCinematheque() {
    const grid = document.getElementById('archive-grid');
    const emptyState = document.getElementById('archive-empty-state');
    const countBadge = document.getElementById('archive-records-count');
    const expandWrapper = document.getElementById('archive-expand-wrapper');
    const expandText = document.getElementById('archive-expand-text');
    const watchedIds = getWatchedFilmIds();
    const ratings = getArchivedRatings();

    if (!grid) return;

    // 1. Filter by active drawer tab
    let filtered = [...allArchiveRecords];
    if (activeArchiveDrawer === 'WATCHED') {
        filtered = filtered.filter(r => watchedIds.includes(r.session_id));
    } else if (activeArchiveDrawer === 'UNWATCHED') {
        filtered = filtered.filter(r => !watchedIds.includes(r.session_id));
    } else if (activeArchiveDrawer === 'TOP_RATED') {
        filtered = filtered.filter(r => (ratings[r.session_id] || 0) === 5);
    } else if (activeArchiveDrawer !== 'ALL') {
        filtered = filtered.filter(r => {
            const mood = (r.primary_mood || '').toLowerCase();
            const tags = (r.detected_tags || []).join(' ').toLowerCase();
            const shift = (r.desired_shift || '').toLowerCase();
            const input = (r.user_input || '').toLowerCase();
            const target = activeArchiveDrawer.toLowerCase();
            return mood.includes(target) || tags.includes(target) || shift.includes(target) || input.includes(target);
        });
    }

    // 2. Sort filtered records
    filtered.sort((a, b) => {
        const ratingA = ratings[a.session_id] || 0;
        const ratingB = ratings[b.session_id] || 0;
        const isWatchedA = watchedIds.includes(a.session_id) ? 1 : 0;
        const isWatchedB = watchedIds.includes(b.session_id) ? 1 : 0;

        switch (activeArchiveSort) {
            case 'rating_desc':
                if (ratingB !== ratingA) return ratingB - ratingA;
                return 0;
            case 'watched_first':
                if (isWatchedB !== isWatchedA) return isWatchedB - isWatchedA;
                return 0;
            case 'unwatched_first':
                if (isWatchedA !== isWatchedB) return isWatchedA - isWatchedB;
                return 0;
            case 'title_asc':
                return (a.title || '').localeCompare(b.title || '');
            case 'director_asc':
                return (a.director || a.film_director || '').localeCompare(b.director || b.film_director || '');
            case 'recent_asc':
                return (a.timestamp || '').localeCompare(b.timestamp || '');
            case 'recent_desc':
            default:
                return 0; // Natural order is already most recent
        }
    });

    if (countBadge) {
        countBadge.innerText = `${allArchiveRecords.length} Curations Preserved`;
    }

    if (filtered.length === 0) {
        grid.innerHTML = '';
        if (emptyState) emptyState.classList.remove('hidden');
        if (expandWrapper) expandWrapper.classList.add('hidden');
        return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    const displayRecords = isArchiveExpanded ? filtered : filtered.slice(0, 6);

    grid.innerHTML = displayRecords.map(r => {
        const isWatched = watchedIds.includes(r.session_id);
        const userRating = ratings[r.session_id] || 0;
        const posterUrl = r.poster_url || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=300&q=80";
        const tags = (r.detected_tags || []).slice(0, 3);
        const safeTitle = (r.title || '').replace(/'/g, "\\'");

        return `
            <div class="archive-record-card" id="record-${r.session_id}">
                <div class="archive-card-top" onclick="viewArchivedRecommendation('${r.session_id}', event)" title="Click to view & relive full recommendation package" style="cursor: pointer;">
                    <img src="${posterUrl}" alt="${r.title}" class="archive-poster" onerror="this.src='https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=300&q=80'">
                    <div class="archive-meta">
                        <div class="archive-meta-header">
                            <div>
                                <h4 class="archive-title">${r.title}</h4>
                                <div class="archive-director"><i class="fas fa-video"></i> ${r.director || 'Auteur Director'}</div>
                            </div>
                            <button type="button" class="archive-delete-btn" data-session-id="${r.session_id || ''}" data-title="${safeTitle}" onclick="deleteCinemathequeItem('${r.session_id || ''}', '${safeTitle}', event)" title="Delete from archive">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                        <div class="archive-date"><i class="far fa-clock"></i> ${r.timestamp || 'Recent'}</div>
                        <div class="archive-tags">
                            ${tags.map(t => `<span class="tag-pill">${t}</span>`).join('')}
                        </div>
                    </div>
                </div>

                ${r.user_input ? `<div class="archive-quote-box" onclick="viewArchivedRecommendation('${r.session_id}', event)" style="cursor: pointer;">"${r.user_input.slice(0, 75)}..."</div>` : ''}

                <div class="archive-card-actions">
                    <button type="button" class="archive-view-btn" onclick="viewArchivedRecommendation('${r.session_id}', event)" title="Relive full recommendation package with soundtrack & pairings">
                        <i class="fas fa-film"></i> Relive Package
                    </button>

                    <button type="button" class="archive-watched-btn ${isWatched ? 'is-watched' : ''}" onclick="toggleWatchedFilm('${r.session_id}')">
                        <i class="fas ${isWatched ? 'fa-check-circle' : 'fa-eye'}"></i> ${isWatched ? 'Watched' : 'Mark as Watched'}
                    </button>

                    ${isWatched ? `
                        <div class="archive-rating-stars" title="Rate this film (${userRating ? userRating + '/5 stars' : 'Click to rate'})">
                            <span class="star-rating-label">Rate:</span>
                            ${[1, 2, 3, 4, 5].map(val => `
                                <span class="archive-star ${val <= userRating ? 'filled' : ''}" onclick="rateArchivedFilm('${r.session_id}', '${safeTitle}', ${val}, event)">★</span>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');

    if (expandWrapper) {
        if (filtered.length > 6) {
            expandWrapper.classList.remove('hidden');
            if (expandText) {
                expandText.innerText = isArchiveExpanded ? `Show Less (Showing ${filtered.length})` : `Show All Curations (${filtered.length})`;
            }
        } else {
            expandWrapper.classList.add('hidden');
        }
    }
}

// ---------------------------------------------------------------------------
// Relive Archived Recommendation from Cinémathèque Vault
// ---------------------------------------------------------------------------

async function fetchWatchProvidersInternalSafe(title, country) {
    try {
        const res = await fetch(`/api/watch-providers?title=${encodeURIComponent(title)}&country=${encodeURIComponent(country)}`);
        if (res.ok) return await res.json();
    } catch (e) {}
    return { country: country, streaming: [], rent: [], buy: [], link: "" };
}

async function viewArchivedRecommendation(sessionId, event) {
    if (event) {
        if (event.target.closest('.archive-delete-btn') || event.target.closest('.archive-watched-btn') || event.target.closest('.archive-rating-stars')) {
            return;
        }
    }

    const record = allArchiveRecords.find(r => r.session_id === sessionId);
    if (!record) return;

    const slate = document.getElementById('slate-container');
    if (slate) {
        slate.innerHTML = `
            <div class="card" style="text-align: center; border-color: var(--accent); padding: 35px 25px; border-radius: 12px; background: rgba(10, 8, 6, 0.85);">
                <i class="fas fa-spinner fa-spin" style="font-size: 2.2rem; color: var(--accent); margin-bottom: 14px;"></i>
                <h4 style="font-family: 'Cinzel', serif; color: #fff; font-size: 1.3rem;">Restoring "${record.title}"...</h4>
                <p style="color: #94a3b8; font-size: 0.9rem; max-width: 500px; margin: 6px auto 0;">Retrieving full soundtrack, sommelier concession pairing & live streaming providers from the vault.</p>
            </div>
        `;
        slate.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    try {
        const title = record.title || '';
        const posterUrl = record.poster_url || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&q=80";
        const country = detectUserCountry();

        const watchPromise = fetchWatchProvidersInternalSafe(title, country);
        const soundtrackPromise = fetch('/api/soundtrack', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ movie_title: title })
        }).then(r => r.json()).catch(() => ({ data: { composer: "Original Score", standout_track: "Main Theme", vibe: "Cinematic orchestration." } }));

        const sommelierPromise = fetch('/api/sommelier', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ movie_title: title })
        }).then(r => r.json()).catch(() => ({ recommendation: "Artisanal mocktail & Gourmet cinema popcorn. Harmonizes with the film tone." }));

        const [watchData, soundtrackRes, sommelierRes] = await Promise.all([watchPromise, soundtrackPromise, sommelierPromise]);

        const restoredPackage = {
            status: "success",
            session_id: record.session_id,
            detected_mood_tags: record.detected_tags || [record.primary_mood || "Reflective"],
            primary_mood: record.primary_mood || record.initial_mood || "Curated",
            target_shift: record.desired_atmosphere || record.desired_shift || "Elevation",
            film: {
                title: record.title,
                director: record.director || record.film_director || "Auteur Director",
                runtime: record.runtime || 115,
                confidence_score: 0.98,
                mood_tags: record.detected_tags || [record.primary_mood || "Curated"],
                synopsis: record.synopsis || record.reasoning || "A masterfully crafted auteur work preserved in your personal Cinémathèque vault.",
                reasoning: record.reasoning || "Curated and preserved in your personal emotional film archive.",
                fun_fact: record.fun_fact || "Active in your personal cinema taste profile."
            },
            poster_url: posterUrl,
            soundtrack: soundtrackRes.data || { composer: "Original Score", standout_track: "Main Theme", vibe: "Evocative score." },
            sommelier: {
                beverage: (sommelierRes.recommendation || '').split('&')[0]?.trim() || "Artisanal beverage or craft tea",
                snack: (sommelierRes.recommendation || '').split('&')[1]?.split('.')[0]?.trim() || "Gourmet cinema popcorn",
                pairing_reasoning: (sommelierRes.recommendation || '').split('.').slice(1).join('.').trim() || "Harmonizes with the film's atmosphere."
            },
            watch_providers: watchData,
            collaborative_note: `Collaborative Partner Note: Restored from your Cinémathèque Vault (${record.title}).`,
            agent_trace: [
                { timestamp: new Date().toLocaleTimeString(), agent: "CinémathèqueArchive", action: "Vault Record Restored", details: `Retrieved "${record.title}" preserved for ${record.primary_mood || 'your mood'}.` }
            ]
        };

        currentSessionData = restoredPackage;
        renderCinemaNightPackage(restoredPackage);

    } catch (err) {
        console.error("Error restoring archived recommendation:", err);
    }
}

window.viewArchivedRecommendation = viewArchivedRecommendation;

function updateBiopicMilestone() {
    const milestoneCard = document.getElementById('biopic-milestone-card');
    const fill = document.getElementById('milestone-progress-fill');
    const countText = document.getElementById('milestone-count-text');
    const genBtn = document.getElementById('generate-biopic-btn');

    if (!currentUser || !currentUser.email) {
        if (milestoneCard) milestoneCard.classList.add('hidden');
        return;
    }
    if (milestoneCard) milestoneCard.classList.remove('hidden');

    const watchedIds = getWatchedFilmIds();
    const watchedInArchive = allArchiveRecords.filter(r => watchedIds.includes(r.session_id));
    const count = watchedInArchive.length;
    const target = 5;
    const pct = Math.min(100, Math.round((count / target) * 100));

    if (fill) fill.style.width = `${pct}%`;
    if (countText) countText.innerText = `${count} / ${target} Watched`;

    if (genBtn) {
        if (count >= target) {
            genBtn.disabled = false;
            genBtn.innerHTML = '<i class="fas fa-meteor"></i> Open Emotional Constellation';
        } else {
            genBtn.disabled = true;
            genBtn.innerHTML = `<i class="fas fa-lock"></i> Mark ${target - count} more to unlock`;
        }
    }
}
// ---------------------------------------------------------------------------
// Google Gemini & Lyria Interactive Emotional Constellation & Soundscape Engine
// ---------------------------------------------------------------------------

let currentConstellationData = null;
let activeStarIndex = 0;
let lyriaAudioContext = null;
let isLyriaSoundscapePlaying = false;
let ambientGainNode = null;
let ambientOscillators = [];
let starfieldAnimId = null;

async function generateBiopicTrailer(isDemoMode = false) {
    const genBtn = document.getElementById('generate-biopic-btn');
    const demoBtn = document.getElementById('demo-preview-biopic-btn');
    const triggerBtn = isDemoMode ? demoBtn : genBtn;

    const originalHtml = triggerBtn.innerHTML;
    triggerBtn.disabled = true;
    triggerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Plotting 5-Star Celestial Galaxy...';

    const watchedIds = getWatchedFilmIds();
    let targetFilms = allArchiveRecords.filter(r => watchedIds.includes(r.session_id));

    if (isDemoMode && targetFilms.length < 5) {
        const demoSamples = [
            { title: "Blade Runner 2049", director: "Denis Villeneuve", primary_mood: "Melancholic & Reflective", desired_atmosphere: "Sanctuary", poster_url: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1600&q=90&auto=format&fit=crop" },
            { title: "Spirited Away", director: "Hayao Miyazaki", primary_mood: "Curious & Adventurous", desired_atmosphere: "Wonder", poster_url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&q=90&auto=format&fit=crop" },
            { title: "Interstellar", director: "Christopher Nolan", primary_mood: "Transcendent Awe", desired_atmosphere: "Cosmic Horizon", poster_url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&q=90&auto=format&fit=crop" },
            { title: "Amélie", director: "Jean-Pierre Jeunet", primary_mood: "Warmth & Playful Joy", desired_atmosphere: "Delight", poster_url: "https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=1600&q=90&auto=format&fit=crop" },
            { title: "Roma", director: "Alfonso Cuarón", primary_mood: "Contemplative", desired_atmosphere: "Catharsis & Peace", poster_url: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1600&q=90&auto=format&fit=crop" }
        ];
        targetFilms = [...targetFilms, ...demoSamples.slice(targetFilms.length, 5)];
    }

    try {
        const userName = currentUser ? currentUser.name : "Cinephile";
        const userEmail = currentUser ? currentUser.email : "guest";

        const res = await fetch('/api/generate-biopic-trailer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_email: userEmail,
                user_name: userName,
                films: targetFilms
            })
        });

        const data = await res.json();
        const payload = data.constellation || data.storyboard;
        if (data.status === 'success' && payload) {
            openEmotionalConstellation(payload);
        } else {
            alert("Could not load constellation at this time. Please try again.");
        }
    } catch (e) {
        console.error("Constellation generation error:", e);
        alert("Error loading constellation. Please check console.");
    } finally {
        triggerBtn.disabled = false;
        triggerBtn.innerHTML = originalHtml;
    }
}

function openEmotionalConstellation(data) {
    currentConstellationData = data;
    activeStarIndex = 0;

    const modal = document.getElementById('biopic-trailer-modal');
    const titleEl = document.getElementById('biopic-story-title');
    const archetypeEl = document.getElementById('storyboard-archetype-text');
    const prefaceEl = document.getElementById('storyboard-preface-text');
    const creditsEl = document.getElementById('biopic-credits-text');

    if (titleEl) titleEl.innerText = data.constellation_name || data.story_title || "The 5-Star Emotional Constellation";
    if (archetypeEl) archetypeEl.innerText = data.celestial_archetype || data.curator_archetype || "The Nocturnal Contemplative";
    if (prefaceEl) prefaceEl.innerText = data.cosmic_narrative || data.director_preface || "A celestial dialogue across your 5 cinematic milestones.";
    
    const supernova = data.central_supernova || {};
    if (creditsEl) creditsEl.innerText = supernova.narrative || data.climax_quote || "Where 5 cinematic memories orbit in harmonic balance.";

    // Render Lyria Soundscape metadata
    const soundscape = data.ambient_soundscape || {};
    const keyEl = document.getElementById('lyria-spec-key');
    const tempoEl = document.getElementById('lyria-spec-tempo');
    const promptEl = document.getElementById('biopic-lyria-prompt');

    if (keyEl) keyEl.innerText = soundscape.key || "D Minor";
    if (tempoEl) tempoEl.innerText = soundscape.tempo || "64 BPM";
    if (promptEl) promptEl.innerText = soundscape.leitmotif_description || soundscape.instrumentation || "Lush ambient synthesizer pads with crystalline celesta chords.";

    // Render dynamic mood-harmonic progression keyboard
    renderHarmonicChordsKeyboard(soundscape.harmonic_progression);

    if (modal) modal.classList.remove('hidden');

    // Initialize Cosmic Starfield Canvas & Map
    initCosmicStarfieldCanvas();
    renderConstellationSkyMap(data);
    selectConstellationStar(0, true);

    // Auto-start ambient soundscape
    startLyriaAmbientPad(soundscape.key || "D Minor", soundscape.tempo || "64 BPM");
}

function renderHarmonicChordsKeyboard(progression) {
    const chordsContainer = document.getElementById('constellation-chords-row');
    if (!chordsContainer) return;

    const defaultProgression = [
        { chord: "Dm9", mood: "Solitude & Refuge", frequencies: [146.83, 220.00, 293.66, 349.23, 440.00] },
        { chord: "FMaj7#11", mood: "Wonder & Discovery", frequencies: [174.61, 261.63, 329.63, 369.99, 523.25] },
        { chord: "Em9", mood: "Transcendent Awe", frequencies: [164.81, 246.94, 329.63, 392.00, 493.88] },
        { chord: "Gmaj9", mood: "Warmth & Joy", frequencies: [196.00, 246.94, 293.66, 392.00, 440.00] },
        { chord: "Dadd9", mood: "Catharsis & Serenity", frequencies: [146.83, 220.00, 293.66, 369.99, 587.33] }
    ];

    const chords = (progression && progression.length) ? progression : defaultProgression;

    chordsContainer.innerHTML = chords.map((item, idx) => {
        const chordName = typeof item === 'string' ? item : (item.chord || 'Chord');
        const moodName = (typeof item === 'object' && item.mood) ? item.mood.split('&')[0].trim() : `Mood ${idx + 1}`;
        return `
            <button type="button" class="chord-pill" onclick="playChordIndex(${idx})" title="Play ${chordName} (${moodName})">
                <span class="chord-title-text">${chordName}</span>
                <span class="chord-mood-sub">${moodName}</span>
            </button>
        `;
    }).join('');
}

function closeEmotionalConstellation() {
    const modal = document.getElementById('biopic-trailer-modal');
    if (modal) modal.classList.add('hidden');
    stopLyriaAmbientPad();
    if (starfieldAnimId) {
        cancelAnimationFrame(starfieldAnimId);
        starfieldAnimId = null;
    }
}

// ---------------------------------------------------------------------------
// Interactive Sky Map & Star Orbs Renderer (5-Star Constellation)
// ---------------------------------------------------------------------------

function renderConstellationSkyMap(data) {
    const container = document.getElementById('constellation-stars-container');
    const svgCanvas = document.getElementById('constellation-svg-lines');
    const stepper = document.getElementById('biopic-act-stepper');
    if (!container || !svgCanvas) return;

    const stars = data.stars || [];
    container.innerHTML = '';
    svgCanvas.innerHTML = '';

    // 5-Star celestial crescent/W coordinates layout
    const defaultCoords = [
        { x: 18, y: 68 },
        { x: 36, y: 32 },
        { x: 52, y: 72 },
        { x: 68, y: 28 },
        { x: 84, y: 62 }
    ];

    // 1. Draw SVG Connecting Lines between stars
    let linesHtml = '';
    stars.forEach((star, idx) => {
        const c1 = star.coordinates || defaultCoords[idx % defaultCoords.length];
        const connections = star.connections || (idx > 0 ? [idx] : []);

        connections.forEach(targetId => {
            const targetStar = stars.find(s => s.star_id === targetId) || (stars[targetId - 1]);
            if (targetStar) {
                const c2 = targetStar.coordinates || defaultCoords[(targetId - 1) % defaultCoords.length];
                linesHtml += `
                    <line x1="${c1.x}%" y1="${c1.y}%" x2="${c2.x}%" y2="${c2.y}%" class="constellation-beam" stroke="${star.spectral_color || '#d4af37'}" stroke-width="1.5" stroke-dasharray="4,4" />
                `;
            }
        });
    });
    svgCanvas.innerHTML = linesHtml;

    // 2. Render Interactive Star Orbs
    stars.forEach((star, idx) => {
        const coords = star.coordinates || defaultCoords[idx % defaultCoords.length];
        const spectralColors = ['#d4af37', '#38bdf8', '#818cf8', '#f59e0b', '#ec4899'];
        const spectralColor = star.spectral_color || spectralColors[idx % spectralColors.length];
        const posterUrl = star.poster_url || "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1600&q=90&auto=format&fit=crop";

        const orb = document.createElement('div');
        orb.className = `constellation-star-orb ${idx === 0 ? 'active' : ''}`;
        orb.id = `star-orb-${idx}`;
        orb.style.left = `${coords.x}%`;
        orb.style.top = `${coords.y}%`;
        orb.style.setProperty('--spectral-glow', spectralColor);

        orb.innerHTML = `
            <div class="star-pulse-ring" style="border-color: ${spectralColor};"></div>
            <div class="star-orb-thumb" style="border-color: ${spectralColor};">
                <img src="${posterUrl}" alt="${star.title}" onerror="this.src='https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=300&q=80'">
            </div>
            <div class="star-label-badge" style="background: rgba(10, 8, 6, 0.85); border-color: ${spectralColor};">
                <span class="star-num">STAR 0${idx + 1} &bull; ${star.harmonic_chord_name || 'CHORD'}</span>
                <span class="star-name">${star.title || 'Cinema Star'}</span>
            </div>
        `;

        orb.addEventListener('click', () => {
            selectConstellationStar(idx, true);
        });

        container.appendChild(orb);
    });

    // 3. Render Stepper Buttons in Footer
    if (stepper) {
        stepper.innerHTML = stars.map((s, idx) => `
            <button type="button" class="star-step-btn ${idx === 0 ? 'active' : ''}" onclick="selectConstellationStar(${idx}, true)" style="--step-color: ${s.spectral_color || '#d4af37'}">
                <span class="step-dot"></span>
                <span>Star 0${idx + 1}: ${s.title || 'Film'} (${s.harmonic_chord_name || s.emotional_valence || ''})</span>
            </button>
        `).join('');
    }
}

function selectConstellationStar(starIndex, playSound = true) {
    if (!currentConstellationData || !currentConstellationData.stars) return;
    const stars = currentConstellationData.stars;
    if (starIndex < 0 || starIndex >= stars.length) return;

    activeStarIndex = starIndex;
    const star = stars[starIndex];

    // Highlight active orb in sky map
    document.querySelectorAll('.constellation-star-orb').forEach((el, idx) => {
        if (idx === starIndex) el.classList.add('active');
        else el.classList.remove('active');
    });

    // Highlight active step button
    document.querySelectorAll('.star-step-btn').forEach((btn, idx) => {
        if (idx === starIndex) btn.classList.add('active');
        else btn.classList.remove('active');
    });

    // Update Observatory Dossier Panel
    const titleEl = document.getElementById('storyboard-film-title');
    const directorEl = document.getElementById('storyboard-film-director');
    const posterEl = document.getElementById('biopic-active-poster');
    const pillEl = document.getElementById('observatory-star-pill');
    const freqEl = document.getElementById('observatory-star-freq');
    const emotionalBeatEl = document.getElementById('storyboard-emotional-beat');
    const resonanceNoteEl = document.getElementById('biopic-voiceover-text');

    if (titleEl) titleEl.innerText = star.title || "Cinema Selection";
    if (directorEl) directorEl.innerHTML = `<i class="fas fa-video"></i> Directed by ${star.director || 'Auteur Director'}`;
    if (posterEl) posterEl.src = star.poster_url || "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1600&q=90&auto=format&fit=crop";

    if (pillEl) {
        pillEl.innerText = `STAR 0${starIndex + 1} • ${(star.harmonic_chord_name ? star.harmonic_chord_name + ' • ' : '')}${(star.emotional_valence || 'RESONANCE').toUpperCase()}`;
        pillEl.style.color = star.spectral_color || '#d4af37';
        pillEl.style.borderColor = star.spectral_color || 'rgba(212, 175, 55, 0.4)';
    }

    const freqVal = star.audio_frequency || [293.66, 329.63, 392.00, 440.00, 587.33][starIndex % 5];
    if (freqEl) freqEl.innerHTML = `<i class="fas fa-wave-square"></i> ${freqVal} Hz (${star.harmonic_chord_name || 'Harmonic'})`;

    if (emotionalBeatEl) emotionalBeatEl.innerText = star.emotional_valence || "Emotional Elevation";
    if (resonanceNoteEl) resonanceNoteEl.innerText = star.resonance_note || star.director_note || "Harmonic stellar alignment in the emotional sky.";

    // Play star mood-harmonic chord
    if (playSound) {
        playLyriaAcousticStarSound(freqVal, star.chord_notes || [freqVal * 0.5, freqVal * 0.75, freqVal, freqVal * 1.5]);
    }
}

window.selectConstellationStar = selectConstellationStar;

function playActiveStarChord() {
    if (!currentConstellationData || !currentConstellationData.stars) return;
    const star = currentConstellationData.stars[activeStarIndex];
    if (!star) return;
    const freqVal = star.audio_frequency || [293.66, 329.63, 392.00, 440.00, 587.33][activeStarIndex % 5];
    playLyriaAcousticStarSound(freqVal, star.chord_notes || [freqVal * 0.5, freqVal * 0.75, freqVal, freqVal * 1.5]);
}

window.playActiveStarChord = playActiveStarChord;

// ---------------------------------------------------------------------------
// Google Lyria WebAudio Acoustic Music Synthesizer
// ---------------------------------------------------------------------------

function getAudioContext() {
    if (!lyriaAudioContext) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) lyriaAudioContext = new AudioCtx();
    }
    if (lyriaAudioContext && lyriaAudioContext.state === 'suspended') {
        lyriaAudioContext.resume();
    }
    return lyriaAudioContext;
}

function startLyriaAmbientPad(key = "D Minor", tempo = "64 BPM") {
    const ctx = getAudioContext();
    if (!ctx) return;

    stopLyriaAmbientPad();

    try {
        ambientGainNode = ctx.createGain();
        ambientGainNode.gain.setValueAtTime(0.0005, ctx.currentTime);
        ambientGainNode.gain.exponentialRampToValueAtTime(0.012, ctx.currentTime + 2.5); // Soft, peaceful ambient background

        // Lowpass filter for smooth cinematic warmth
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(360, ctx.currentTime);

        ambientGainNode.connect(filter);
        filter.connect(ctx.destination);

        // Ambient chord frequencies based on key
        const baseChord = [146.83, 220.00, 293.66, 349.23, 440.00]; // Dm9 (D3, A3, D4, F4, A4)

        baseChord.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            osc.type = (i % 2 === 0) ? 'sine' : 'triangle';
            osc.frequency.setValueAtTime(freq + (i * 0.4), ctx.currentTime); // subtle chorus detune
            osc.connect(ambientGainNode);
            osc.start();
            ambientOscillators.push(osc);
        });

        isLyriaSoundscapePlaying = true;
        updateAudioButtonState();
    } catch (e) {
        console.warn("Lyria audio synth notice:", e);
    }
}

function stopLyriaAmbientPad() {
    if (ambientGainNode && lyriaAudioContext) {
        try {
            ambientGainNode.gain.exponentialRampToValueAtTime(0.00001, lyriaAudioContext.currentTime + 0.8);
            setTimeout(() => {
                ambientOscillators.forEach(o => {
                    try { o.stop(); o.disconnect(); } catch (e) {}
                });
                ambientOscillators = [];
            }, 900);
        } catch (e) {}
    }
    isLyriaSoundscapePlaying = false;
    updateAudioButtonState();
}

function toggleLyriaSoundscape() {
    if (isLyriaSoundscapePlaying) {
        stopLyriaAmbientPad();
    } else {
        const soundscape = (currentConstellationData && currentConstellationData.ambient_soundscape) || {};
        startLyriaAmbientPad(soundscape.key || "D Minor", soundscape.tempo || "64 BPM");
    }
}

function updateAudioButtonState() {
    const btnText = document.getElementById('ambient-audio-text');
    const playBtn = document.getElementById('biopic-play-pause-btn');
    if (!playBtn || !btnText) return;

    if (isLyriaSoundscapePlaying) {
        playBtn.classList.add('playing');
        btnText.innerHTML = `Lyria: Playing (${(currentConstellationData?.ambient_soundscape?.key) || 'D Minor'})`;
    } else {
        playBtn.classList.remove('playing');
        btnText.innerHTML = `Lyria: Muted`;
    }
}

function playLyriaAcousticStarSound(rootFreq, chordNotes) {
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
        const now = ctx.currentTime;
        const notes = chordNotes || [rootFreq, rootFreq * 1.25, rootFreq * 1.5, rootFreq * 2];

        // Crystalline Celesta Bell Arpeggio (Soft and delicate)
        notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = (idx === 0) ? 'triangle' : 'sine';
            osc.frequency.setValueAtTime(freq, now + (idx * 0.12));

            gain.gain.setValueAtTime(0.0001, now + (idx * 0.12));
            gain.gain.exponentialRampToValueAtTime(0.018, now + (idx * 0.12) + 0.04);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + (idx * 0.12) + 2.5);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now + (idx * 0.12));
            osc.stop(now + (idx * 0.12) + 2.8);
        });
    } catch (e) {}
}

function playChordIndex(index) {
    const defaultChords = [
        [146.83, 220.00, 293.66, 349.23, 440.00], // Dm9 (Solitude)
        [174.61, 261.63, 329.63, 369.99, 523.25], // FMaj7#11 (Wonder)
        [164.81, 246.94, 329.63, 392.00, 493.88], // Em9 (Awe)
        [196.00, 246.94, 293.66, 392.00, 440.00], // Gmaj9 (Joy)
        [146.83, 220.00, 293.66, 369.99, 587.33]  // Dadd9 (Catharsis)
    ];

    let notes = defaultChords[index % defaultChords.length];

    if (currentConstellationData && currentConstellationData.ambient_soundscape) {
        const prog = currentConstellationData.ambient_soundscape.harmonic_progression;
        if (prog && prog[index] && prog[index].frequencies) {
            notes = prog[index].frequencies;
        }
    }

    playLyriaAcousticStarSound(notes[0], notes);

    // Also select matching star in constellation map
    selectConstellationStar(index, false);

    // Visual button ripple
    const buttons = document.querySelectorAll('.harmonic-chords-row .chord-pill');
    buttons.forEach((b, i) => {
        if (i === index) b.classList.add('playing');
        else b.classList.remove('playing');
    });
    setTimeout(() => {
        buttons.forEach(b => b.classList.remove('playing'));
    }, 1500);
}

window.playChordIndex = playChordIndex;

// ---------------------------------------------------------------------------
// Starfield Dynamic Particle Background Canvas
// ---------------------------------------------------------------------------

function initCosmicStarfieldCanvas() {
    const canvas = document.getElementById('cosmic-starfield-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.offsetWidth || 600;
    const height = canvas.offsetHeight || 420;
    canvas.width = width;
    canvas.height = height;

    const stars = Array.from({ length: 90 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.6 + 0.4,
        alpha: Math.random() * 0.8 + 0.2,
        speed: Math.random() * 0.02 + 0.008
    }));

    function draw() {
        ctx.clearRect(0, 0, width, height);

        // Subtle cosmic nebula glow
        const grad = ctx.createRadialGradient(width * 0.5, height * 0.4, 40, width * 0.5, height * 0.4, width * 0.6);
        grad.addColorStop(0, 'rgba(56, 189, 248, 0.05)');
        grad.addColorStop(0.5, 'rgba(212, 175, 55, 0.03)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        stars.forEach(s => {
            s.alpha += s.speed;
            if (s.alpha > 1 || s.alpha < 0.2) s.speed = -s.speed;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.1, Math.min(1, s.alpha))})`;
            ctx.fill();
        });

        starfieldAnimId = requestAnimationFrame(draw);
    }

    if (starfieldAnimId) cancelAnimationFrame(starfieldAnimId);
    draw();
}

function initBiopicTrailerControls() {
    const genBtn = document.getElementById('generate-biopic-btn');
    if (genBtn) genBtn.addEventListener('click', () => generateBiopicTrailer(false));

    const demoBtn = document.getElementById('demo-preview-biopic-btn');
    if (demoBtn) demoBtn.addEventListener('click', () => generateBiopicTrailer(true));

    const closeBtn = document.getElementById('close-biopic-btn');
    if (closeBtn) closeBtn.addEventListener('click', closeEmotionalConstellation);

    const floatingCloseBtn = document.getElementById('close-biopic-btn-floating');
    if (floatingCloseBtn) floatingCloseBtn.addEventListener('click', closeEmotionalConstellation);

    const ambientBtn = document.getElementById('biopic-play-pause-btn');
    if (ambientBtn) {
        ambientBtn.addEventListener('click', toggleLyriaSoundscape);
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
    initBiopicTrailerControls();

    // Global keyboard listener to close modals with Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' || e.key === 'Esc') {
            closeEmotionalConstellation();
            closeCinemaEmailModal();
        }
    });

    // Initialize agent execution logs terminal
    renderAgentTrace([]);
    const traceBtn = document.getElementById('trace-toggle-btn');
    if (traceBtn) {
        traceBtn.addEventListener('click', toggleTraceLogs);
    }

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

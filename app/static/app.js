// Mock status check removed - Real connection is now active

let moodChartInstance = null;
let currentAnalyticsData = null;
let activeAnalyticsTab = 'matrix';

async function loadStats() {
    try {
        const response = await fetch('/api/stats');
        const stats = await response.json();
        currentAnalyticsData = stats;

        // Update Executive KPI Badges
        if (stats.kpis) {
            const moodEl = document.getElementById('kpi-mood');
            const atmEl = document.getElementById('kpi-atm');
            const demoEl = document.getElementById('kpi-demo');
            const totalEl = document.getElementById('kpi-total');
            
            if (moodEl) moodEl.innerText = stats.kpis.top_mood || 'N/A';
            if (atmEl) atmEl.innerText = stats.kpis.top_atmosphere || 'N/A';
            if (demoEl) demoEl.innerText = stats.kpis.top_demographic || 'N/A';
            if (totalEl) totalEl.innerText = stats.kpis.total_sessions || 0;
        }

        renderActiveChart();
    } catch (e) {
        console.error("Failed to load stats", e);
    }
}

function renderActiveChart() {
    if (!currentAnalyticsData) return;
    const canvas = document.getElementById('moodChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (moodChartInstance) moodChartInstance.destroy();

    const stats = currentAnalyticsData;

    if (activeAnalyticsTab === 'matrix') {
        // 1. Emotional Transition Matrix (Stacked Bar Chart: Initial Mood -> Desired Atmosphere)
        const moods = stats.labels || ["Stressed", "Bored", "Excited", "Sad", "Curious"];
        const matrix = stats.matrix || {};
        const atmospheres = ["Relaxing", "Thrilling", "Uplifting", "Thought-provoking"];
        const colors = {
            "Relaxing": { bg: 'rgba(16, 185, 129, 0.75)', border: '#10b981' },
            "Thrilling": { bg: 'rgba(239, 68, 68, 0.75)', border: '#ef4444' },
            "Uplifting": { bg: 'rgba(245, 158, 11, 0.75)', border: '#f59e0b' },
            "Thought-provoking": { bg: 'rgba(139, 92, 246, 0.75)', border: '#8b5cf6' }
        };

        const datasets = atmospheres.map(atm => ({
            label: atm,
            data: moods.map(m => (matrix[m] && matrix[m][atm]) ? matrix[m][atm] : 0),
            backgroundColor: colors[atm].bg,
            borderColor: colors[atm].border,
            borderWidth: 1.5,
            borderRadius: 4
        }));

        moodChartInstance = new Chart(ctx, {
            type: 'bar',
            data: { labels: moods, datasets: datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { stacked: true, ticks: { color: '#e8dcc5', font: { family: 'Cinzel', size: 12 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { stacked: true, beginAtZero: true, ticks: { color: '#a69882' }, grid: { color: 'rgba(255,255,255,0.08)' } }
                },
                plugins: {
                    legend: { labels: { color: '#e8dcc5', font: { family: 'Playfair Display', size: 11 } } },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        borderColor: '#d4af37',
                        borderWidth: 1,
                        titleFont: { family: 'Cinzel' },
                        bodyFont: { family: 'Playfair Display' }
                    }
                }
            }
        });

    } else if (activeAnalyticsTab === 'moods') {
        // 2. Initial Mood Distribution
        const moodData = stats.moods || { labels: stats.labels, data: stats.data };
        const moodColors = [
            'rgba(249, 115, 22, 0.75)',  // Stressed (Orange)
            'rgba(100, 116, 139, 0.75)', // Bored (Slate)
            'rgba(234, 179, 8, 0.75)',   // Excited (Yellow)
            'rgba(59, 130, 246, 0.75)',   // Sad (Blue)
            'rgba(168, 85, 247, 0.75)'   // Curious (Purple)
        ];
        const borderColors = ['#f97316', '#64748b', '#eab308', '#3b82f6', '#a855f7'];

        moodChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: moodData.labels,
                datasets: [{
                    label: 'Audience Requests',
                    data: moodData.data,
                    backgroundColor: moodColors,
                    borderColor: borderColors,
                    borderWidth: 1.5,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, ticks: { color: '#a69882' }, grid: { color: 'rgba(255,255,255,0.08)' } },
                    x: { ticks: { color: '#e8dcc5', font: { family: 'Cinzel', size: 12 } }, grid: { display: false } }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        borderColor: '#d4af37',
                        borderWidth: 1
                    }
                }
            }
        });

    } else if (activeAnalyticsTab === 'atmospheres') {
        // 3. Desired Atmospheres (Doughnut Wheel)
        const atmData = stats.atmospheres || { labels: ["Relaxing", "Thrilling", "Uplifting", "Thought-provoking"], data: [0, 0, 0, 0] };
        moodChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: atmData.labels,
                datasets: [{
                    data: atmData.data,
                    backgroundColor: [
                        'rgba(16, 185, 129, 0.8)',
                        'rgba(239, 68, 68, 0.8)',
                        'rgba(245, 158, 11, 0.8)',
                        'rgba(139, 92, 246, 0.8)'
                    ],
                    borderColor: '#1a1714',
                    borderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right', labels: { color: '#e8dcc5', font: { family: 'Playfair Display', size: 12 } } },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        borderColor: '#d4af37',
                        borderWidth: 1
                    }
                }
            }
        });

    } else if (activeAnalyticsTab === 'demographics') {
        // 4. Age Demographics (Horizontal Bars)
        const demoData = stats.demographics || { labels: ["Kids (0-12)", "Teens (13-17)", "Adults (18+)", "Mixed Family"], data: [0, 0, 0, 0] };
        moodChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: demoData.labels,
                datasets: [{
                    label: 'Audience Sessions',
                    data: demoData.data,
                    backgroundColor: [
                        'rgba(6, 182, 212, 0.75)',
                        'rgba(236, 72, 153, 0.75)',
                        'rgba(234, 179, 8, 0.75)',
                        'rgba(132, 204, 22, 0.75)'
                    ],
                    borderColor: ['#06b6d4', '#ec4899', '#eab308', '#84cc16'],
                    borderWidth: 1.5,
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { beginAtZero: true, ticks: { color: '#a69882' }, grid: { color: 'rgba(255,255,255,0.08)' } },
                    y: { ticks: { color: '#e8dcc5', font: { family: 'Playfair Display', size: 12 } }, grid: { display: false } }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        borderColor: '#d4af37',
                        borderWidth: 1
                    }
                }
            }
        });
    }
}

// --- Authentication & User State Management ---
let currentUser = null;

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

function updateAuthUI() {
    const loggedOutView = document.getElementById('logged-out-view');
    const loggedInView = document.getElementById('logged-in-view');
    const avatar = document.getElementById('user-avatar');
    const userName = document.getElementById('user-name');
    const userEmail = document.getElementById('user-email');

    if (currentUser && currentUser.email) {
        loggedOutView.classList.add('hidden');
        loggedInView.classList.remove('hidden');
        if (avatar) avatar.src = currentUser.picture || 'https://lh3.googleusercontent.com/a/default-user';
        if (userName) userName.innerText = currentUser.name || 'Cinephile';
        if (userEmail) userEmail.innerText = currentUser.email;
    } else {
        loggedOutView.classList.remove('hidden');
        loggedInView.classList.add('hidden');
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
    if (!response || !response.credential) return;
    try {
        const res = await fetch('/api/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential: response.credential })
        });
        const data = await res.json();
        if (data.status === 'success' && data.user) {
            currentUser = data.user;
            localStorage.setItem('feelandfilm_user', JSON.stringify(currentUser));
            updateAuthUI();
            closeAuthModal();
        } else {
            const payload = parseJwt(response.credential);
            if (payload) {
                currentUser = {
                    email: payload.email,
                    name: payload.name || 'Cinephile',
                    picture: payload.picture || '',
                    sub: payload.sub
                };
                localStorage.setItem('feelandfilm_user', JSON.stringify(currentUser));
                updateAuthUI();
                closeAuthModal();
            }
        }
    } catch (e) {
        console.error("Google Auth verification failed:", e);
    }
}

window.handleGoogleCredentialResponse = handleGoogleCredentialResponse;

function signOut() {
    currentUser = null;
    localStorage.removeItem('feelandfilm_user');
    if (window.google && google.accounts && google.accounts.id) {
        google.accounts.id.disableAutoSelect();
    }
    updateAuthUI();
}

async function initAuth() {
    // Restore session from localStorage
    try {
        const stored = localStorage.getItem('feelandfilm_user');
        if (stored) {
            currentUser = JSON.parse(stored);
            updateAuthUI();
        }
    } catch (e) {}

    const signOutBtn = document.getElementById('sign-out-btn');
    if (signOutBtn) {
        signOutBtn.addEventListener('click', signOut);
    }

    const customGoogleBtn = document.getElementById('custom-google-btn');
    if (customGoogleBtn) {
        customGoogleBtn.addEventListener('click', openAuthModal);
    }

    const closeModalBtn = document.getElementById('close-modal-btn');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeAuthModal);
    }

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

            // Render standard Google button into modal wrapper
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
        console.error("Failed to load auth config", e);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    loadStats();

    // Tab switcher events
    const tabBtns = document.querySelectorAll('.analytics-tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeAnalyticsTab = btn.dataset.tab;
            renderActiveChart();
        });
    });
});

document.getElementById('mood-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const form = e.target;
    const btn = document.getElementById('generate-btn');
    const btnText = btn.querySelector('.btn-text');
    const spinner = btn.querySelector('.cinematic-spinner');
    const resultsSection = document.getElementById('results');
    
    // UI Loading state
    btn.disabled = true;
    btnText.classList.add('hidden');
    spinner.classList.remove('hidden');
    resultsSection.classList.add('hidden');
    
    window.sessionRecommendedFilms = window.sessionRecommendedFilms || [];
    const allExcluded = Array.from(new Set([...(window.excludedFilms || []), ...(window.sessionRecommendedFilms || [])]));

    const requestData = {
        initial_mood: document.getElementById('initial_mood').value,
        desired_atmosphere: document.getElementById('desired_atmosphere').value,
        audience_age_range: document.getElementById('audience_age_range').value,
        theme: document.getElementById('theme') ? document.getElementById('theme').value : "",
        slots: 1,
        excluded_films: allExcluded,
        user_email: currentUser ? currentUser.email : ""
    };

    try {
        const response = await fetch('/api/recommend', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const json = await response.json();
        renderResults(json);
        
        // Refresh the chart to include the potentially new historical query
        loadStats();
        
        resultsSection.classList.remove('hidden');
        resultsSection.scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
        alert("Failed to generate slate: " + error.message);
        console.error(error);
        document.getElementById('slate-container').innerHTML = '';
    } finally {
        // Reset UI
        btn.disabled = false;
        btnText.classList.remove('hidden');
        spinner.classList.add('hidden');
    }
});

function renderResults(response) {
    const data = response.data;
    
    // Render Slate
    const container = document.getElementById('slate-container');
    container.innerHTML = ''; // clear
    
    if (data.not_found_message && (!data.slate || data.slate.length === 0)) {
        container.innerHTML = `
            <div class="card" style="text-align: center; border-color: var(--accent);">
                <h3>NO MATCHES FOUND</h3>
                <p>${data.not_found_message}</p>
            </div>
        `;
        return;
    }

    if (data.slate && Array.isArray(data.slate)) {
        // Automatically remember all recommended films to guarantee zero repeats in the session
        window.sessionRecommendedFilms = window.sessionRecommendedFilms || [];
        data.slate.forEach(f => {
            if (f.title && !window.sessionRecommendedFilms.includes(f.title)) {
                window.sessionRecommendedFilms.push(f.title);
            }
        });

        data.slate.forEach((film, index) => {
            const card = document.createElement('div');
            card.className = 'film-card';
            card.style.animationDelay = `${index * 0.15}s`;
            
            const tagsHtml = film.mood_tags.map(tag => `<span class="tag">${tag}</span>`).join('');
            const conf = Math.round((film.confidence_score || 0.9) * 100);

            const posterId = `poster-${index}-${Date.now()}`;
            
            card.innerHTML = `
                <div class="film-confidence" style="font-size: 1.2em; font-weight: bold; color: var(--accent); background: rgba(212, 175, 55, 0.1); padding: 5px 10px; border-radius: 4px; box-shadow: 0 0 10px rgba(212, 175, 55, 0.2);">${conf}% Match</div>
                <div style="display: flex; gap: 20px;">
                    <div id="poster-container-${index}" style="width: 140px; height: 210px; border-radius: 8px; border: 2px solid var(--accent); flex-shrink: 0; box-shadow: 0 4px 12px rgba(0,0,0,0.5); background: var(--bg-dark); display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden;">
                        <span id="poster-loader-${index}" style="color: var(--accent); font-size: 1.5em;"><i class="fas fa-spinner fa-spin"></i></span>
                        <img id="${posterId}" style="width: 100%; height: 100%; object-fit: cover; display: none;" alt="${film.title} Poster">
                    </div>
                    <div style="flex-grow: 1;">
                        <div class="film-title" style="font-size: 1.8em; margin-bottom: 5px; color: #fff;">${film.title}</div>
                        <div class="film-meta" style="font-size: 0.9em; color: #ccc; margin-bottom: 12px; font-family: 'Playfair Display', serif;">Directed by ${film.director} • ${film.runtime} min • Intensity: ${film.intensity}/10</div>
                        <div class="film-tags" style="margin-bottom: 15px; font-size: 1.05em;">${tagsHtml}</div>
                        <div class="film-synopsis" style="margin-bottom: 12px; font-style: normal; color: var(--text-secondary); line-height: 1.5; font-size: 1.05em;">
                            <span id="synopsis-text-${index}">${film.synopsis || ''}</span>
                        </div>
                        ${film.reasoning ? `<div class="film-reason" style="margin-bottom: 12px; line-height: 1.4;">${film.reasoning}</div>` : ''}
                        <div class="film-fun-fact" style="margin-top: 15px; font-size: 0.9em; border-left: 3px solid var(--accent); padding-left: 12px; color: #bbb;"><strong>🎥 Fun Fact:</strong> ${film.fun_fact || ''}</div>
                        <div class="film-actions" style="margin-top: 20px; display: flex; flex-wrap: wrap; gap: 10px;">
                            <button class="soundtrack-btn" data-title="${film.title}" style="padding: 8px 12px; background: var(--bg-dark); border: 1px solid var(--accent); color: var(--text-light); cursor: pointer; border-radius: 4px; font-family: 'Playfair Display', serif; font-size: 1rem; font-weight: 400; text-transform: none; letter-spacing: 0.5px; flex: 1; min-width: 140px; transition: all 0.3s;"><i class="fas fa-music"></i> Soundtrack Info</button>
                            <button class="sommelier-btn" data-title="${film.title}" style="padding: 8px 12px; background: var(--bg-dark); border: 1px solid #e74c3c; color: var(--text-light); cursor: pointer; border-radius: 4px; font-family: 'Playfair Display', serif; font-size: 1rem; font-weight: 400; text-transform: none; letter-spacing: 0.5px; flex: 1; min-width: 140px; transition: all 0.3s;"><i class="fas fa-wine-glass"></i> Snack Pairing</button>
                            <button class="watch-btn" data-title="${film.title}" style="padding: 8px 12px; background: var(--bg-dark); border: 1px solid #3498db; color: var(--text-light); cursor: pointer; border-radius: 4px; font-family: 'Playfair Display', serif; font-size: 1rem; font-weight: 400; text-transform: none; letter-spacing: 0.5px; flex: 1; min-width: 140px; transition: all 0.3s;"><i class="fas fa-tv"></i> Where to Watch</button>
                            <button class="another-option-btn" data-title="${film.title}" style="padding: 8px 12px; background: var(--bg-dark); border: 1px solid var(--accent); color: var(--text-light); cursor: pointer; border-radius: 4px; font-family: 'Playfair Display', serif; font-size: 1rem; font-weight: 400; text-transform: none; letter-spacing: 0.5px; flex: 1; min-width: 140px; transition: all 0.3s;"><i class="fas fa-redo"></i> Search Another</button>
                        </div>
                    </div>
                </div>
                <div class="soundtrack-info hidden" style="margin-top: 15px; padding: 10px; border: 1px dashed var(--accent); border-radius: 4px; font-size: 0.9em;"></div>
                <div class="sommelier-info hidden" style="margin-top: 15px; padding: 10px; border: 1px dashed #e74c3c; border-radius: 4px; font-size: 0.9em; color: #ffcccc;"></div>
                <div class="watch-info hidden" style="margin-top: 15px; padding: 12px; border: 1px dashed #3498db; border-radius: 4px; font-size: 0.9em; color: #d0e7ff; background: rgba(52, 152, 219, 0.08);"></div>
            `;
            container.appendChild(card);

            // Fetch poster asynchronously to reduce latency
            fetch(`/api/poster?title=${encodeURIComponent(film.title)}`)
                .then(res => res.json())
                .then(posterData => {
                    const img = document.getElementById(posterId);
                    const loader = document.getElementById(`poster-loader-${index}`);
                    if (posterData.poster_url) {
                        img.onload = () => {
                            loader.style.display = 'none';
                            img.style.display = 'block';
                        };
                        img.src = posterData.poster_url;
                    } else {
                        loader.innerHTML = '<span style="font-size: 0.8em; text-align: center;">No Poster</span>';
                    }
                })
                .catch(err => console.error("Failed to load poster", err));

            // Add event listeners for the action buttons
            const stBtn = card.querySelector('.soundtrack-btn');
            const anotherBtn = card.querySelector('.another-option-btn');
            
            const sommBtn = card.querySelector('.sommelier-btn');
            const sommInfo = card.querySelector('.sommelier-info');

            sommBtn.addEventListener('click', async () => {
                // If already fetched for this movie, just toggle visibility without new API cost
                if (sommBtn.dataset.loaded === "true") {
                    sommInfo.classList.toggle('hidden');
                    return;
                }

                sommBtn.disabled = true;
                sommBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Pairing...';
                try {
                    const res = await fetch('/api/sommelier', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ movie_title: sommBtn.dataset.title })
                    });
                    const data = await res.json();
                    sommInfo.classList.remove('hidden');
                    sommInfo.innerHTML = `<strong>🍿 Sommelier:</strong> ${data.recommendation}`;
                    sommBtn.dataset.loaded = "true";
                } catch (e) {
                    sommInfo.classList.remove('hidden');
                    sommInfo.innerHTML = "<strong>🍿 Sommelier:</strong> Sorry, out of popcorn!";
                } finally {
                    sommBtn.innerHTML = '<i class="fas fa-wine-glass"></i> Snack Pairing';
                    sommBtn.disabled = false;
                }
            });

            const stInfo = card.querySelector('.soundtrack-info');

            stBtn.addEventListener('click', async () => {
                // If already fetched for this movie, just toggle visibility without new API cost
                if (stBtn.dataset.loaded === "true") {
                    stInfo.classList.toggle('hidden');
                    return;
                }

                stBtn.disabled = true;
                stBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Searching...';
                try {
                    const res = await fetch('/api/soundtrack', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ movie_title: film.title })
                    });
                    const stData = await res.json();
                    if(stData.data) {
                        stInfo.innerHTML = `<strong>Composer:</strong> ${stData.data.composer}<br><strong>Vibe:</strong> ${stData.data.vibe}<br><strong>Standout Track:</strong> ${stData.data.standout_track || 'N/A'}`;
                        stInfo.classList.remove('hidden');
                        stBtn.dataset.loaded = "true";
                    }
                } catch(e) {
                    stInfo.innerHTML = "Failed to load soundtrack info.";
                    stInfo.classList.remove('hidden');
                } finally {
                    stBtn.disabled = false;
                    stBtn.innerHTML = '<i class="fas fa-music"></i> Soundtrack Info';
                }
            });

            // Where to Watch Handler with auto-detected country
            const watchBtn = card.querySelector('.watch-btn');
            const watchInfo = card.querySelector('.watch-info');

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
                    if (tz.includes('London')) return 'GB';
                    return 'US';
                } catch (e) {
                    return 'US';
                }
            }

            watchBtn.addEventListener('click', async () => {
                // If already fetched for this movie, just toggle visibility without new API cost
                if (watchBtn.dataset.loaded === "true") {
                    watchInfo.classList.toggle('hidden');
                    return;
                }

                watchBtn.disabled = true;
                watchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Locating...';
                const userCountry = detectUserCountry();
                try {
                    const res = await fetch(`/api/watch-providers?title=${encodeURIComponent(film.title)}&country=${userCountry}`);
                    const wData = await res.json();
                    
                    let html = `<div style="font-weight: bold; margin-bottom: 6px; color: #60a5fa;"><i class="fas fa-tv"></i> Where to Watch (${wData.country || userCountry})</div>`;
                    
                    let hasOptions = false;
                    if (wData.streaming && wData.streaming.length > 0) {
                        hasOptions = true;
                        html += `<div style="margin-bottom: 4px;"><strong>📺 Subscription:</strong> ${wData.streaming.join(', ')}</div>`;
                    }
                    if (wData.rent && wData.rent.length > 0) {
                        hasOptions = true;
                        html += `<div style="margin-bottom: 4px;"><strong>🎟️ Rent:</strong> ${wData.rent.join(', ')}</div>`;
                    }
                    if (wData.buy && wData.buy.length > 0) {
                        hasOptions = true;
                        html += `<div style="margin-bottom: 4px;"><strong>🛒 Buy:</strong> ${wData.buy.join(', ')}</div>`;
                    }
                    
                    if (!hasOptions) {
                        html += `<div style="color: #94a3b8;">No direct subscription streaming currently detected in this region.</div>`;
                    }
                    
                    if (wData.link) {
                        html += `<div style="margin-top: 8px;"><a href="${wData.link}" target="_blank" rel="noopener noreferrer" style="color: #93c5fd; text-decoration: underline; font-size: 0.85em;"><i class="fas fa-external-link-alt"></i> View full availability on TMDB / JustWatch</a></div>`;
                    }
                    
                    watchInfo.innerHTML = html;
                    watchInfo.classList.remove('hidden');
                    watchBtn.dataset.loaded = "true";
                } catch (e) {
                    watchInfo.innerHTML = '<span style="color: #f87171;">Failed to load streaming providers.</span>';
                    watchInfo.classList.remove('hidden');
                } finally {
                    watchBtn.disabled = false;
                    watchBtn.innerHTML = '<i class="fas fa-tv"></i> Where to Watch';
                }
            });

            anotherBtn.addEventListener('click', () => {
                window.excludedFilms = window.excludedFilms || [];
                window.excludedFilms.push(film.title);
                document.getElementById('mood-form').dispatchEvent(new Event('submit'));
            });
        });
    }

    // Evidence rendering removed per user request
}

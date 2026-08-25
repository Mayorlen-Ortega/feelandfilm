// Mock status check removed - Real connection is now active

let moodChartInstance = null;

async function loadStats() {
    try {
        const response = await fetch('/api/stats');
        const stats = await response.json();
        
        if (stats.labels && stats.labels.length > 0) {
            const ctx = document.getElementById('moodChart').getContext('2d');
            if (moodChartInstance) moodChartInstance.destroy();
            
            moodChartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: stats.labels,
                    datasets: [{
                        label: 'Historical Audience Requests',
                        data: stats.data,
                        backgroundColor: 'rgba(212, 175, 55, 0.6)',
                        borderColor: '#d4af37',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true, ticks: { color: '#a69882' } },
                        x: { ticks: { color: '#a69882' } }
                    },
                    plugins: {
                        legend: { labels: { color: '#e8dcc5', font: { family: 'Courier Prime' } } }
                    }
                }
            });
        }
    } catch (e) {
        console.error("Failed to load stats", e);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadStats();
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
        excluded_films: allExcluded
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

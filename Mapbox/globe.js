mapboxgl.accessToken = window.MAPBOX_TOKEN; // set in config.js

// Pollution score (0 clean → 1 heavily polluted) to colour. 0.5 is exactly at the limit.
const GRADIENT = [
    [0.0,  '#1a9850'],
    [0.3,  '#66bd63'],
    [0.5,  '#fee08b'],
    [0.75, '#f46d43'],
    [1.0,  '#a50026']
];
const NO_DATA_COLOUR = '#95a5a6';
const scoreColourExpression = ['interpolate', ['linear'], ['get', 'score'], ...GRADIENT.flat()];

function scoreColour(score) {
    if (score === null) return NO_DATA_COLOUR;
    for (let i = 1; i < GRADIENT.length; i++) {
        const [s1, c1] = GRADIENT[i - 1], [s2, c2] = GRADIENT[i];
        if (score <= s2) {
            const t = (score - s1) / (s2 - s1);
            const mix = k => Math.round(parseInt(c1.substr(k, 2), 16) * (1 - t) + parseInt(c2.substr(k, 2), 16) * t);
            return `rgb(${mix(1)}, ${mix(3)}, ${mix(5)})`;
        }
    }
    return GRADIENT[GRADIENT.length - 1][1];
}

const STATUS_LABELS = { good: 'Meets bathing criteria', poor: 'Fails bathing criteria', unknown: 'Not enough data' };

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/satellite-v9',
    projection: 'globe',
    center: [75, 18],   // western / southern India, where the readings are
    zoom: 3.6
});
map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

let sites = [];
let riverOfSite = new Map();

// ---------- Sidebars ----------

function setSidebar(id, open) {
    document.getElementById(id).classList.toggle('collapsed', !open);
}

function toggleSidebar(id) {
    const el = document.getElementById(id);
    setSidebar(id, el.classList.contains('collapsed'));
}

function formatNumber(n) {
    return Number.isInteger(n) ? n.toString() : n.toFixed(2).replace(/\.?0+$/, '');
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function showSite(site) {
    const [lng, lat] = site.coordinates;
    const rows = site.readings.map(r => {
        const flag = r.passes === null ? '' : (r.passes ? '<span class="ok">✓</span>' : '<span class="bad">✗</span>');
        let range = '';
        if (r.values.length > 1) {
            range = r.min === r.max
                ? `<div class="sub">${r.values.length} readings</div>`
                : `<div class="sub">${r.values.length} readings, ${formatNumber(r.min)} – ${formatNumber(r.max)}</div>`;
        }
        const rule = r.rule ? `<div class="sub">Target ${escapeHtml(r.rule)}</div>` : '';
        return `<tr><td>${escapeHtml(r.name)}${rule}</td><td class="num">${formatNumber(r.mean)} ${flag}${range}</td></tr>`;
    }).join('');

    document.getElementById('site-details').innerHTML = `
        <h2>Monitoring site ${site.id + 1}</h2>
        <div class="coords">${riverOfSite.has(site.id) ? escapeHtml(riverOfSite.get(site.id)) + ' river · ' : ''}${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E</div>
        <div class="status status-${site.status}">${STATUS_LABELS[site.status]}</div>
        ${site.score === null ? '' : `
        <div class="score">
            <div class="score-label">Pollution score <b>${Math.round(site.score * 100)}</b> / 100</div>
            <div class="gradient-bar"><span class="marker" style="left:${site.score * 100}%; background:${scoreColour(site.score)}"></span></div>
        </div>`}
        ${site.failing.length ? `<p class="failing">Out of range: ${site.failing.map(escapeHtml).join(', ')}</p>` : ''}
        <table>${rows}</table>
        <p class="note">Values are averages where a site has several readings.</p>`;

    if (window.innerWidth < 700) setSidebar('left', false);   // no room for both on a phone
    setSidebar('right', true);
    map.flyTo({ center: site.coordinates, zoom: Math.max(map.getZoom(), 7), duration: 1200, essential: true });
}

function showSummary() {
    const count = s => sites.filter(x => x.status === s).length;
    const legend = ['good', 'poor', 'unknown'].filter(s => count(s) > 0).map(s =>
        `<li>${STATUS_LABELS[s]} <b>${count(s)}</b></li>`
    ).join('');
    const rivers = new Set(riverOfSite.values());
    const readings = sites.reduce((n, s) => n + s.readings.reduce((m, r) => m + r.values.length, 0), 0);

    document.getElementById('summary').innerHTML = `
        <h2>River water quality</h2>
        <p>${sites.length} monitoring sites in India, ${readings} readings.</p>
        <div class="gradient-bar"></div>
        <div class="gradient-labels"><span>Clean</span><span>At limit</span><span>Heavily polluted</span></div>
        <ul class="legend">${legend}</ul>
        <p class="note">Rated against India's Central Pollution Control Board criteria for bathing water:
        pH, dissolved oxygen, biochemical oxygen demand and fecal coliform. Each site's score comes from its
        worst measure; 50 is right at the limit.</p>
        <p class="note">${riverOfSite.size} sites lie on ${rivers.size} major rivers, which are coloured between
        neighbouring sites. The rest are on smaller rivers not in the river map, so they show as dots only.
        Click a dot to see its readings.</p>`;
}

// ---------- Map layers ----------

function sitesToGeoJSON() {
    return {
        type: 'FeatureCollection',
        features: sites.map(site => ({
            type: 'Feature',
            id: site.id,
            geometry: { type: 'Point', coordinates: site.coordinates },
            properties: { id: site.id, status: site.status, score: site.score === null ? -1 : site.score }
        }))
    };
}

map.on('style.load', () => {
    map.setFog({});   // soft atmosphere around the globe
});

map.on('load', async () => {
    try {
        sites = await loadWaterSites();
        const rivers = await fetch('rivers.geojson').then(r => {
            if (!r.ok) throw new Error('Could not load rivers.geojson (' + r.status + ')');
            return r.json();
        });
        const scored = scoreRivers(rivers, sites);
        riverOfSite = scored.riverOfSite;
        map.addSource('rivers', { type: 'geojson', data: scored.geojson });
    } catch (err) {
        document.getElementById('summary').innerHTML = `<h2>Couldn't load data</h2><p>${escapeHtml(err.message)}</p>`;
        setSidebar('left', true);
        return;
    }

    // Rivers with no nearby site: thin, faint line for context.
    map.addLayer({
        id: 'rivers-no-data',
        type: 'line',
        source: 'rivers',
        filter: ['<', ['get', 'score'], 0],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
            'line-color': '#9ecae1',
            'line-opacity': 0.5,
            'line-width': ['interpolate', ['linear'], ['zoom'], 3, 0.6, 8, 2]
        }
    });
    // Rivers near monitoring sites: coloured by pollution.
    map.addLayer({
        id: 'rivers-scored',
        type: 'line',
        source: 'rivers',
        filter: ['>=', ['get', 'score'], 0],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
            'line-color': scoreColourExpression,
            'line-width': ['interpolate', ['linear'], ['zoom'], 3, 2.5, 8, 6]
        }
    });

    map.addSource('sites', { type: 'geojson', data: sitesToGeoJSON() });
    map.addLayer({
        id: 'sites',
        type: 'circle',
        source: 'sites',
        paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 5, 8, 10],
            'circle-color': ['case', ['<', ['get', 'score'], 0], NO_DATA_COLOUR, scoreColourExpression],
            'circle-stroke-color': '#fff',
            'circle-stroke-width': ['case', ['boolean', ['feature-state', 'selected'], false], 3, 1.5]
        }
    });

    showSummary();
    setSidebar('left', true);
});

let selectedId = null;

function select(id) {
    if (selectedId !== null) map.setFeatureState({ source: 'sites', id: selectedId }, { selected: false });
    selectedId = id;
    if (id !== null) map.setFeatureState({ source: 'sites', id }, { selected: true });
}

map.on('click', e => {
    const hit = map.getLayer('sites') && map.queryRenderedFeatures(e.point, { layers: ['sites'] })[0];
    if (hit) {
        const site = sites[hit.properties.id];
        select(site.id);
        showSite(site);
    } else {
        select(null);
        setSidebar('right', false);
    }
});

map.on('mouseenter', 'sites', () => { map.getCanvas().style.cursor = 'pointer'; });
map.on('mouseleave', 'sites', () => { map.getCanvas().style.cursor = ''; });

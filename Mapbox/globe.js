mapboxgl.accessToken = window.MAPBOX_TOKEN; // set in config.js

const STATUS_COLOURS = { good: '#2ecc71', poor: '#e74c3c', unknown: '#95a5a6' };
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
        <div class="coords">${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E</div>
        <div class="status status-${site.status}">${STATUS_LABELS[site.status]}</div>
        ${site.failing.length ? `<p class="failing">Out of range: ${site.failing.map(escapeHtml).join(', ')}</p>` : ''}
        <table>${rows}</table>
        <p class="note">Values are averages where a site has several readings.</p>`;

    if (window.innerWidth < 700) setSidebar('left', false);   // no room for both on a phone
    setSidebar('right', true);
    map.flyTo({ center: site.coordinates, zoom: Math.max(map.getZoom(), 7), duration: 1200, essential: true });
}

function showSummary() {
    const count = s => sites.filter(x => x.status === s).length;
    const legend = Object.keys(STATUS_COLOURS).filter(s => count(s) > 0).map(s =>
        `<li><span class="dot" style="background:${STATUS_COLOURS[s]}"></span>${STATUS_LABELS[s]} <b>${count(s)}</b></li>`
    ).join('');
    const readings = sites.reduce((n, s) => n + s.readings.reduce((m, r) => m + r.values.length, 0), 0);

    document.getElementById('summary').innerHTML = `
        <h2>River water quality</h2>
        <p>${sites.length} monitoring sites in India, ${readings} readings.</p>
        <ul class="legend">${legend}</ul>
        <p class="note">Rated against India's Central Pollution Control Board criteria for bathing water:
        pH, dissolved oxygen, biochemical oxygen demand and fecal coliform. Click a dot to see its readings.</p>`;
}

// ---------- Map layers ----------

function sitesToGeoJSON() {
    return {
        type: 'FeatureCollection',
        features: sites.map(site => ({
            type: 'Feature',
            id: site.id,
            geometry: { type: 'Point', coordinates: site.coordinates },
            properties: { id: site.id, status: site.status }
        }))
    };
}

map.on('style.load', () => {
    map.setFog({});   // soft atmosphere around the globe
});

map.on('load', async () => {
    try {
        sites = await loadWaterSites();
    } catch (err) {
        document.getElementById('summary').innerHTML = `<h2>Couldn't load data</h2><p>${escapeHtml(err.message)}</p>`;
        setSidebar('left', true);
        return;
    }

    map.addSource('sites', { type: 'geojson', data: sitesToGeoJSON() });
    map.addLayer({
        id: 'sites',
        type: 'circle',
        source: 'sites',
        paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 5, 8, 10],
            'circle-color': ['match', ['get', 'status'],
                'good', STATUS_COLOURS.good,
                'poor', STATUS_COLOURS.poor,
                STATUS_COLOURS.unknown],
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

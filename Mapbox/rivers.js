// Colours river lines by the pollution score of the monitoring sites on them.
//
// Each site is snapped to the nearest river if it lies within SNAP_KM of it.
// Along a river, the colour blends smoothly between neighbouring sites; past
// the last site it holds that site's colour for FADE_KM and then the river
// goes back to a plain, uncoloured line (no data there).

const SNAP_KM = 15;
const FADE_KM = 60;

function kmBetween([lng1, lat1], [lng2, lat2]) {
    // Equirectangular approximation: accurate to well under 1% at these scales.
    const rad = Math.PI / 180;
    const x = (lng2 - lng1) * rad * Math.cos((lat1 + lat2) / 2 * rad);
    const y = (lat2 - lat1) * rad;
    return Math.sqrt(x * x + y * y) * 6371;
}

// Distance from point p to segment a–b, and how far along a–b (0..1) the closest point is.
function nearestOnSegment(p, a, b) {
    const k = Math.cos(p[1] * Math.PI / 180);
    const ax = a[0] * k, ay = a[1], bx = b[0] * k, by = b[1], px = p[0] * k, py = p[1];
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
    const closest = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    return { km: kmBetween(p, closest), t };
}

function scoreRivers(rivers, sites) {
    // Cumulative distance along each river, vertex by vertex.
    const lines = rivers.features.map(f => {
        const coords = f.geometry.coordinates;
        const along = [0];
        for (let i = 1; i < coords.length; i++) along.push(along[i - 1] + kmBetween(coords[i - 1], coords[i]));
        return { name: f.properties.name, coords, along, sites: [] };
    });

    // Snap each site to its nearest river line.
    const snapped = new Map();
    for (const site of sites) {
        if (site.score === null) continue;
        let best = null;
        for (const line of lines) {
            for (let i = 1; i < line.coords.length; i++) {
                const hit = nearestOnSegment(site.coordinates, line.coords[i - 1], line.coords[i]);
                if (!best || hit.km < best.km) {
                    const at = line.along[i - 1] + (line.along[i] - line.along[i - 1]) * hit.t;
                    best = { km: hit.km, line, at };
                }
            }
        }
        if (best && best.km <= SNAP_KM) {
            best.line.sites.push({ at: best.at, score: site.score });
            snapped.set(site.id, best.line.name);
        }
    }

    // Score at a given distance along a river, or null if no site is close enough.
    function scoreAt(line, d) {
        const s = line.sites;
        if (!s.length) return null;
        if (d <= s[0].at) return s[0].at - d <= FADE_KM ? s[0].score : null;
        const last = s[s.length - 1];
        if (d >= last.at) return d - last.at <= FADE_KM ? last.score : null;
        for (let i = 1; i < s.length; i++) {
            if (d <= s[i].at) {
                const span = s[i].at - s[i - 1].at;
                const t = span ? (d - s[i - 1].at) / span : 0;
                return s[i - 1].score + (s[i].score - s[i - 1].score) * t;
            }
        }
        return null;
    }

    // Split rivers into short pieces, each with its own score, so the colour can change along the line.
    // Stretches with no nearby site are kept as single long pieces to keep the layer light.
    const features = [];
    for (const line of lines) {
        line.sites.sort((a, b) => a.at - b.at);
        let run = null;
        const flush = () => {
            if (run) features.push({
                type: 'Feature',
                geometry: { type: 'LineString', coordinates: run },
                properties: { name: line.name, score: -1 }
            });
            run = null;
        };
        for (let i = 1; i < line.coords.length; i++) {
            const score = scoreAt(line, (line.along[i - 1] + line.along[i]) / 2);
            if (score === null) {
                if (!run) run = [line.coords[i - 1]];
                run.push(line.coords[i]);
                continue;
            }
            flush();
            features.push({
                type: 'Feature',
                geometry: { type: 'LineString', coordinates: [line.coords[i - 1], line.coords[i]] },
                properties: { name: line.name, score }
            });
        }
        flush();
    }

    return {
        geojson: { type: 'FeatureCollection', features },
        riverOfSite: snapped
    };
}

if (typeof module !== 'undefined') module.exports = { scoreRivers, kmBetween };

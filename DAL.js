// Data access layer: loads data.json and turns its flat list of readings
// into one entry per monitoring site.
//
// data.json stores each point as [latitude, longitude]; Mapbox expects
// [longitude, latitude], so the swap happens here and nowhere else.

// India's Central Pollution Control Board criteria for bathing-quality water
// (Class B). Used to give each site a simple good / poor rating.
const CRITERIA = {
    'pH':                        { test: v => v >= 6.5 && v <= 8.5, rule: '6.5 – 8.5' },
    'Dissolved Oxygen':          { test: v => v >= 5,               rule: '≥ 5 mg/L' },
    'Biochemical Oxygen Demand': { test: v => v <= 3,               rule: '≤ 3 mg/L' },
    'Fecal Coliform':            { test: v => v <= 2500,            rule: '≤ 2500 MPN/100 mL' }
};

function groupIntoSites(rows) {
    const sites = new Map();

    for (const row of rows) {
        const [lat, lng] = row.Point;
        const key = lat + ',' + lng;
        if (!sites.has(key)) {
            sites.set(key, { id: sites.size, lng, lat, measures: new Map() });
        }
        const measures = sites.get(key).measures;
        if (!measures.has(row.Data)) measures.set(row.Data, []);
        measures.get(row.Data).push(row.Value);
    }

    return [...sites.values()].map(site => {
        const readings = [...site.measures.entries()].map(([name, values]) => {
            const mean = values.reduce((a, b) => a + b, 0) / values.length;
            const criterion = CRITERIA[name];
            return {
                name,
                values,
                mean,
                min: Math.min(...values),
                max: Math.max(...values),
                rule: criterion ? criterion.rule : null,
                passes: criterion ? criterion.test(mean) : null
            };
        });

        // Key measures first, then the rest alphabetically.
        const order = Object.keys(CRITERIA);
        readings.sort((a, b) => {
            const ia = order.indexOf(a.name), ib = order.indexOf(b.name);
            if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
            return a.name.localeCompare(b.name);
        });

        const judged = readings.filter(r => r.passes !== null);
        let status = 'unknown';
        if (judged.length) status = judged.every(r => r.passes) ? 'good' : 'poor';

        return {
            id: site.id,
            coordinates: [site.lng, site.lat],
            readings,
            failing: judged.filter(r => !r.passes).map(r => r.name),
            status
        };
    });
}

async function loadWaterSites() {
    const response = await fetch('data.json');
    if (!response.ok) throw new Error('Could not load data.json (' + response.status + ')');
    const json = await response.json();
    return groupIntoSites(json.Water);
}

// Lets the grouping logic be tested from Node without a browser.
if (typeof module !== 'undefined') module.exports = { groupIntoSites, CRITERIA };

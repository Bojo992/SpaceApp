# SpaceApp

A 3D globe showing river water-quality readings from 65 monitoring sites in India, built with Mapbox GL JS.

Each site is a dot coloured by whether its readings meet India's Central Pollution Control Board criteria for bathing water (Class B):

| Measure | Target |
|---|---|
| pH | 6.5 – 8.5 |
| Dissolved oxygen | ≥ 5 mg/L |
| Biochemical oxygen demand | ≤ 3 mg/L |
| Fecal coliform | ≤ 2500 MPN/100 mL |

Each site gets a pollution score from 0 (clean) to 100 (heavily polluted), set by its worst measure; 50 is exactly at the limit. Dots and rivers are coloured on a green → yellow → red gradient by that score. Along a river the colour blends between neighbouring sites, and fades out 60 km past the last one. Click a dot to see all of that site's readings in the side panel.

Rivers come from Natural Earth's 1:10m river centrelines, which only include major rivers: 25 of the 65 sites sit on one of them. The rest show as dots only.

## Running it

First copy `config.example.js` to `config.js` and put your Mapbox access token in it. `config.js` is gitignored, so the token stays out of the repo.

The page loads `data.json` with `fetch`, so it has to be served over HTTP rather than opened as a file:

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Files

- `index.html` – page layout and styles
- `config.example.js` – template for `config.js`, which holds the Mapbox token
- `DAL.js` – loads `data.json`, groups the readings by site and rates each one
- `Mapbox/rivers.js` – snaps sites to rivers and colours the rivers between them
- `Mapbox/globe.js` – the globe, the map layers and the side panels
- `data.json` – the raw readings (`Point` is `[latitude, longitude]`)
- `rivers.geojson` – major rivers around India, built by `tools/build_rivers.py` from [Natural Earth](https://www.naturalearthdata.com/) (public domain)

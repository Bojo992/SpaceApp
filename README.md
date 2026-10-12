# SpaceApp

A 3D globe showing river water-quality readings from 65 monitoring sites in India, built with Mapbox GL JS.

Each site is a dot coloured by whether its readings meet India's Central Pollution Control Board criteria for bathing water (Class B):

| Measure | Target |
|---|---|
| pH | 6.5 – 8.5 |
| Dissolved oxygen | ≥ 5 mg/L |
| Biochemical oxygen demand | ≤ 3 mg/L |
| Fecal coliform | ≤ 2500 MPN/100 mL |

Green means every one of these measured at the site is in range; red means at least one is out. Click a dot to see all of that site's readings in the side panel.

## Running it

The page loads `data.json` with `fetch`, so it has to be served over HTTP rather than opened as a file:

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Files

- `index.html` – page layout and styles
- `DAL.js` – loads `data.json`, groups the readings by site and rates each one
- `Mapbox/globe.js` – the globe, the site layer and the side panels
- `data.json` – the raw readings (`Point` is `[latitude, longitude]`)

mapboxgl.accessToken = 'pk.eyJ1IjoiYm9qbzk5MiIsImEiOiJjbG5mN29kODkwbTdjMmtxcDBkdGVpYWl1In0.UZXTKZjNuds0nnHJn-nF0A';
const center = [-77.01866, 39.888];
const map = new mapboxgl.Map({
    container: 'test',
    style: 'mapbox://styles/mapbox/satellite-v9',
    projection: 'globe', // Display the map as a globe, since satellite-v9 defaults to Mercator
    zoom: 10,
    center: center
});

let testData = [
    {coordinates: [-77.01866, 39.898], data: "pH: 8\n Oxygen Level: 89"},
    {coordinates: [-78.01766, 37.878], data: "pH: 8\n Oxygen Level: 0"},
    {coordinates: [-79.01966, 38.868], data: "pH: 8\n Oxygen Level: 29"},
    {coordinates: [-76.01666, 38.888], data: "pH: 8\n Oxygen Level: 76"}
];

for (let i = 0; i < testData.length; i++) {
    let tempMarker = new ClickableMarker().setLngLat(testData[i].coordinates)
    .setWaterData(testData[i].data, testData[i].coordinates);
    tempMarker.onClick(() => {
        let test = document.getElementById('dataBar');
        test.textContent = tempMarker.waterData;
        map.flyTo({
            center: testData[i].coordinates,
            duration: 1000,
            essential: true
        });
    }).addTo(map);
}

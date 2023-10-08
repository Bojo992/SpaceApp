mapboxgl.accessToken = 'pk.eyJ1IjoiYm9qbzk5MiIsImEiOiJjbG5mN29kODkwbTdjMmtxcDBkdGVpYWl1In0.UZXTKZjNuds0nnHJn-nF0A';

const center = [-77.01866, 38.888];
const center2 = [-76.888, 38.808];



const map = new mapboxgl.Map({
    container: 'test',
    style: 'mapbox://styles/mapbox/satellite-v9',
    projection: 'globe', // Display the map as a globe, since satellite-v9 defaults to Mercator
    zoom: 10,
    center: center
});

// map.on('touchstart', () => {
//     states.sideBarState = true;
// });

new ClickableMarker().setLngLat(center).onClick(() => {
    document.getElementById('right.dataBar').innerText("test");
    map.flyTo({
        center: center,
        duration: 1000,
        essential: true
    });
}).addTo(map);

new ClickableMarker().setLngLat(center2).setWaterData("test").onClick((test) => {
    // document.getElementsByClassName('sidebar-content').innerHTML(test.waterData);
    map.flyTo({
        center: center2,
        duration: 1000,
        essential: true
    });
}).addTo(map);

mapboxgl.accessToken = 'pk.eyJ1IjoiYm9qbzk5MiIsImEiOiJjbG5mN29kODkwbTdjMmtxcDBkdGVpYWl1In0.UZXTKZjNuds0nnHJn-nF0A';

const center = [-77.01866, 38.888];

const map = new mapboxgl.Map({
    container: 'test',
    style: 'mapbox://styles/mapbox/satellite-v9',
    projection: 'globe', // Display the map as a globe, since satellite-v9 defaults to Mercator
    zoom: 10,
    center: center
});

new mapboxgl.Marker().setLngLat(center).addTo(map);

map.getActiveAttrib()

function toggleSidebar(id) {
    const elem = document.getElementById(id);
    // Add or remove the 'collapsed' CSS class from the sidebar element.
    // Returns boolean "true" or "false" whether 'collapsed' is in the class list.
    const collapsed = elem.classList.toggle('collapsed');
    const padding = {};
    // 'id' is 'right' or 'left'. When run at start, this object looks like: '{left: 300}';
    padding[id] = collapsed ? 0 : 300; // 0 if collapsed, 300 px if not. This matches the width of the sidebars in the .sidebar CSS class.
    // Use `map.easeTo()` with a padding option to adjust the map's center accounting for the position of sidebars.
    map.easeTo({
        padding: padding,
        duration: 1000 // In ms. This matches the CSS transition duration property.
    });
}

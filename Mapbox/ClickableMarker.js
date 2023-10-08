class ClickableMarker extends mapboxgl.Marker {
    // new method onClick, sets _handleClick to a function you pass in
    waterData = "bojo";

    setWaterData(parsedData){
        this.waterData = parsedData;
        return this;
    }

    onClick(handleClick) {
        this._handleClick = handleClick;
        states.sideBarState = true;
        return this;
    }

    _onMapClick(e) {
        const targetElement = e.originalEvent.target;
        const element = this._element;

        if (this._handleClick && (targetElement === element || element.contains((targetElement)))) {
            this._handleClick();
        } else {
            states.sideBarState = false;
        }
    }
}

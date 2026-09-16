(function (root) {
    'use strict';
    const geometry = {
        // DOM rectangles are rendered pixels; Leaflet pan offsets are unscaled CSS pixels.
        popupPan(rect, bounds, scaleX = 1, scaleY = 1) {
            const x = rect.left < bounds.left ? rect.left - bounds.left : rect.right > bounds.right ? rect.right - bounds.right : 0;
            const y = rect.top < bounds.top ? rect.top - bounds.top : rect.bottom > bounds.bottom ? rect.bottom - bounds.bottom : 0;
            return [x / scaleX, y / scaleY];
        },
        centerOffset(rect, viewport, scaleX = 1, scaleY = 1) {
            const left = Math.max(rect.left, viewport.left), right = Math.min(rect.right, viewport.right);
            const top = Math.max(rect.top, viewport.top), bottom = Math.min(rect.bottom, viewport.bottom);
            return [(left + right - rect.left - rect.right) / (2 * scaleX), (top + bottom - rect.top - rect.bottom) / (2 * scaleY)];
        }
    };
    if (typeof module !== 'undefined' && module.exports) module.exports = geometry;
    else root.MapViewportGeometry = geometry;
})(typeof window === 'undefined' ? globalThis : window);

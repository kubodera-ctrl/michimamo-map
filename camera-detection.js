(function (root) {
    'use strict';
    // No downloads, uploads, paid API, OCR or persistent identifiers.
    function faceRegions(faces, width, height) {
        if (!Array.isArray(faces) || faces.length > 100 || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) throw Error('invalid_detection');
        return faces.map(face => {
            const b = face?.boundingBox;
            if (!b || ![b.x,b.y,b.width,b.height].every(Number.isFinite) || b.width <= 0 || b.height <= 0) throw Error('invalid_box');
            // Add a 25% margin on each side; clip edge faces to the captured bitmap.
            const x = Math.max(0, b.x - b.width * .25), y = Math.max(0, b.y - b.height * .25);
            const right = Math.min(width, b.x + b.width * 1.25), bottom = Math.min(height, b.y + b.height * 1.25);
            if (right <= x || bottom <= y) throw Error('outside_image');
            return {x:x/width, y:y/height, width:(right-x)/width, height:(bottom-y)/height, kind:'mosaic'};
        });
    }
    let detector = null, busy = false;
    function supported() { return typeof root.FaceDetector === 'function'; }
    async function detectFaces(canvas) {
        if (!supported()) throw Error('unsupported');
        if (busy) throw Error('busy');
        busy = true;
        const width = canvas.width, height = canvas.height;
        try {
            detector ||= new root.FaceDetector({fastMode:false, maxDetectedFaces:100});
            return faceRegions(await detector.detect(canvas), width, height);
        } finally { busy = false; }
    }
    root.MachimamoCameraDetection = {supported, detectFaces, faceRegions};
})(typeof window !== 'undefined' ? window : globalThis);

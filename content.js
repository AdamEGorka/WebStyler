chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.mode) {
        applyColorblindMode(request.mode);
    }
    if (request.action === "refresh") {
        location.reload();
    }
});

function applyColorblindMode(type) {
    const CVDMatrix = {
        "protanopia": [
            0.0, 2.02344, -2.52581,
            0.0, 1.0, 0.0,
            0.0, 0.0, 1.0
        ],
        "deuteranopia": [
            1.0, 0.0, 0.0,
            0.494207, 0.0, 1.24827,
            0.0, 0.0, 1.0
        ],
        "tritanopia": [
            1.0, 0.0, 0.0,
            0.0, 1.0, 0.0,
            -0.395913, 0.801109, 0.0
        ]
    };

    const cvd = CVDMatrix[type];
    if (!cvd) {
        return;
    }

    document.querySelectorAll('img').forEach((img) => {
        if (img.complete && img.naturalWidth > 0) {
            if (img.crossOrigin !== "anonymous" && !img.src.startsWith(window.location.origin)) {
                handleCrossOriginImage(img, cvd);
            } else {
                processImage(img, cvd);
            }
        } else {
            img.crossOrigin = "anonymous";
            img.addEventListener('load', () => {
                if (img.crossOrigin !== "anonymous" && !img.src.startsWith(window.location.origin)) {
                    handleCrossOriginImage(img, cvd);
                } else {
                    processImage(img, cvd);
                }
            });
            img.addEventListener('error', () => console.warn(`Failed to load image: ${img.src}`));
        }
    });

    function handleCrossOriginImage(img, cvd) {
        const proxyImage = new Image();
        proxyImage.crossOrigin = "anonymous";
        proxyImage.src = img.src;

        proxyImage.onload = function() {
            processImage(proxyImage, cvd, img);
        };
        proxyImage.onerror = function() {
            console.warn(`Failed to load cross-origin image: ${img.src}`);
        };
    }

    function processImage(img, cvd, originalImg = img) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;

        try {
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            for (let i = 0; i < data.length; i += 4) {
                let r = data[i];
                let g = data[i + 1];
                let b = data[i + 2];

                let L = (17.8824 * r) + (43.5161 * g) + (4.11935 * b);
                let M = (3.45565 * r) + (27.1554 * g) + (3.86714 * b);
                let S = (0.0299566 * r) + (0.184309 * g) + (1.46709 * b);

                let l = (cvd[0] * L) + (cvd[1] * M) + (cvd[2] * S);
                let m = (cvd[3] * L) + (cvd[4] * M) + (cvd[5] * S);
                let s = (cvd[6] * L) + (cvd[7] * M) + (cvd[8] * S);

                r = (0.0809444479 * l) + (-0.130504409 * m) + (0.116721066 * s);
                g = (-0.0102485335 * l) + (0.0540193266 * m) + (-0.113614708 * s);
                b = (-0.000365296938 * l) + (-0.00412161469 * m) + (0.693511405 * s);

                r = Math.min(Math.max(0, r), 255);
                g = Math.min(Math.max(0, g), 255);
                b = Math.min(Math.max(0, b), 255);

                data[i] = r;
                data[i + 1] = g;
                data[i + 2] = b;
            }

            ctx.putImageData(imageData, 0, 0);
            originalImg.src = canvas.toDataURL();
            originalImg.width = canvas.width; // Ensure width is retained
            originalImg.height = canvas.height; // Ensure height is retained
        } catch (error) {
            console.error(`Error processing image: ${error.message}`);
        }
    }

    function daltonizeColor(r, g, b, cvd) {
        let L = (17.8824 * r) + (43.5161 * g) + (4.11935 * b);
        let M = (3.45565 * r) + (27.1554 * g) + (3.86714 * b);
        let S = (0.0299566 * r) + (0.184309 * g) + (1.46709 * b);

        let l = (cvd[0] * L) + (cvd[1] * M) + (cvd[2] * S);
        let m = (cvd[3] * L) + (cvd[4] * M) + (cvd[5] * S);
        let s = (cvd[6] * L) + (cvd[7] * M) + (cvd[8] * S);

        let newR = (0.0809444479 * l) + (-0.130504409 * m) + (0.116721066 * s);
        let newG = (-0.0102485335 * l) + (0.0540193266 * m) + (-0.113614708 * s);
        let newB = (-0.000365296938 * l) + (-0.00412161469 * m) + (0.693511405 * s);

        newR = Math.min(Math.max(0, newR), 255);
        newG = Math.min(Math.max(0, newG), 255);
        newB = Math.min(Math.max(0, newB), 255);

        return [newR, newG, newB];
    }

    document.querySelectorAll('*').forEach((element) => {
        const computedStyle = window.getComputedStyle(element);

        const color = computedStyle.color.match(/\d+/g)?.map(Number);
        const backgroundColor = computedStyle.backgroundColor.match(/\d+/g)?.map(Number);

        if (color && color.length === 3) {
            const [r, g, b] = color;
            const [newR, newG, newB] = daltonizeColor(r, g, b, cvd);
            element.style.color = `rgb(${newR}, ${newG}, ${newB})`;
        }

        if (backgroundColor && backgroundColor.length === 3) {
            const [r, g, b] = backgroundColor;
            const [newR, newG, newB] = daltonizeColor(r, g, b, cvd);
            element.style.backgroundColor = `rgb(${newR}, ${newG}, ${newB})`;
        }
    });
}

function resetColorblindMode() {
    location.reload();
}

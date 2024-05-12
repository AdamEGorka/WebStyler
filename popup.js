// getCurrentTabId() retrieves the ID of the currently active tab
// in the last focused window,
// which is necessary for sending messages to the correct tab.
async function getCurrentTabId() {
    try {
        return (await chrome.tabs.query({ active: true, lastFocusedWindow: true }))[0]?.id;
    } catch (err) {
        console.error("error getting current tab ID: ", err);
        return null;
    }
}
var currTabId;

// Gets size from size slider, ranging from 1 to 100
function getSize() {
    var sizeSlider = document.getElementById("size-slider");
    // Prevents returned size from being 0
    return Math.max(sizeSlider.value, 1);
}
var currSize = localStorage.getItem("savedSize");
if (currSize == null) {
    currSize = 50;
}

// Gets color from color wheel
function getColor() {
    var colorWheel = document.getElementById("color-wheel");
    return colorWheel.value;
}
var currColor = localStorage.getItem("savedColor");
if (currColor == null) {
    currColor = "#000000";
}

// Returns the new CSS to be injected into the website
function getCSS() {
    return `
    * {
        color: ${getColor()} !important;
        /*font-family: "Georgia" !important;*/
    }
    `;
}
var currCss = localStorage.getItem("savedCss");
if (currCss == null) {
    currCss = '';
}

// Applies new CSS according to the specified color
async function applyCSS() {
    localStorage.clear();
    // Removes old CSS before injecting new one to not flood website with old CSS
    removeCSS(currTabId);    

    currColor = getColor();
    currCss = getCSS();
    try {
        chrome.scripting.insertCSS({
            target : {tabId : currTabId},
            css : currCss
        });
        console.log("New CSS injected");
    } catch (err) {
        console.error("Failed to inject css: ", err);
    }
}

// Resets the website's CSS to what it was initially
async function reset() {
    removeCSS().then(() => {
        console.log("CSS reset");
    });
    changeSize(50).then(() => {
        console.log("Size reset");
    });
}

// Helper function to remove CSS
async function removeCSS() {
    try {
        chrome.scripting.removeCSS({
            target : {tabId : currTabId},
            css : currCss
        });
    } catch (err) {
        console.error("Failed to remove CSS: ", err);
    }
}

// Applies new size according to the specified size
async function applySize() {
    currSize = getSize();
    changeSize(getSize());
}

// Helper function to change size. Separated from applySize() to allow giving inputs in reset()
async function changeSize(newSize) {
    try {
        chrome.scripting.executeScript({
            target: {tabId: currTabId},
            func: resizeBody,
            args: [newSize]
        });
        console.log("Size changed");
    } catch(error) {
        console.error("There was an error injecting the script: " + error.message);
    };
}

// Resizes elements in body
function resizeBody(newSize) {
    /**
     * Recursively resizes the given element and its children.
     * @param {HTMLElement} elt - The element to resize.
     */
    function resizeChildren(elt) {
        // Undoes any previous fontSize change
        elt.style.fontSize = "";
        // Recurse over elt.children
        for (var child of elt.children) {
            // Notably avoids changing font size of parent affecting font size of children by changing children first
            resizeChildren(child);
        }
        var style = window.getComputedStyle(elt, null);
        var fontSize = parseFloat(style.getPropertyValue('font-size'));
        // Scales fontSize of current elt by newSize/50.0
        elt.style.fontSize = (fontSize * (newSize/50.0)) + 'px';
    }

    body = document.querySelector("body");
    resizeChildren(body);
}

// When DOM is loaded, adds event listeners to buttons
document.addEventListener('DOMContentLoaded', async function () {
    currTabId = await getCurrentTabId();

    var applyBtn = document.getElementById("apply-btn");
    applyBtn.addEventListener('click', applyCSS);
    applyBtn.addEventListener('click', applySize);

    var resetBtn = document.getElementById("reset-btn");
    resetBtn.addEventListener('click', reset);

    document.getElementById("size-slider").value = ""+currSize;
    document.getElementById("color-wheel").value = currColor;
});

document.addEventListener('visibilitychange', function () {
    localStorage.setItem("savedCss", currCss);
    localStorage.setItem("savedColor", currColor);
    localStorage.setItem("savedSize", currSize);
});

// https://stackoverflow.com/questions/77495555/how-do-i-execute-a-script-on-the-current-tab-using-chrome-scripting-api:
// https://stackoverflow.com/questions/11684454/getting-the-source-html-of-the-current-page-from-chrome-extension/11696154#11696154
// https://stackoverflow.com/questions/15195209/how-to-get-font-size-in-html
// Prof. Lumbroso's code

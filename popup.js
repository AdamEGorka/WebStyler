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

// Gets size from size slider, ranging from 1 to 100
function getSize() {
    var sizeSlider = document.getElementById("size-slider");
    // Prevents returned size from being 0
    return Math.max(sizeSlider.value, 1);
}
var currSize = 50;

// Gets color from color wheel
function getColor() {
    var colorWheel = document.getElementById("color-wheel");
    return colorWheel.value;
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
var currCss = '';

// Applies new CSS according to the specified color
async function applyCSS() {
    var currTabId = await getCurrentTabId();
    // Removes old CSS before injecting new one to not flood website with old CSS
    removeCSS(currTabId);
    
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
    getCurrentTabId().then((currTabId) => {
        removeCSS(currTabId);
    });
    changeSize(currSize, 50).then(() => {
        currSize = 50;
        console.log("Size reset");
    });
}

// Helper function to remove CSS. Separated from reset() to avoid recomputing currTabId in applyCSS()
async function removeCSS(currTabId) {
    try {
        chrome.scripting.removeCSS({
            target : {tabId : currTabId},
            css : currCss
        });
        console.log("CSS reset");
    } catch (err) {
        console.error("Failed to reset CSS: ", err);
    }
}

// Applies new size according to the specified size
async function applySize() {
    await changeSize(currSize, getSize());
    // Updates currSize. Important that it's after the call to changeSize, executeScript in particular
    currSize = getSize();
}

// Helper function to change size. Separated from applySize() to allow giving inputs in reset()
async function changeSize(oldSize, newSize) {
    chrome.tabs.query({
        active: true, currentWindow: true
    }).then(function (tabs) {
        var activeTab = tabs[0];
        var activeTabId = activeTab.id;

        chrome.scripting.executeScript({
            target: { tabId: activeTabId },
            func: resizeBody,
            args: [oldSize, newSize]
        });
        console.log("Size changed");
    }).catch(function (error) {
        console.log("There was an error injecting the script: " + error.message);
    });
}

// Resizes elements in body
function resizeBody(oldSize, newSize) {
    /**
     * Recursively resizes the given element and its children.
     * @param {HTMLElement} elt - The element to resize.
     */
    function resizeChildren(elt) {
        // Recurse over elt.children
        for (var child of elt.children) {
            // Notably avoids changing font size of parent affecting font size of children by changing children first
            resizeChildren(child);
        }
        // Restyle current elt
        var style = window.getComputedStyle(elt, null);
        var fontSize = parseFloat(style.getPropertyValue('font-size'));
        // Unscales by oldSize/50 and scales by newSize/50 at the same time
        elt.style.fontSize = (fontSize / (oldSize/50) * (newSize/50)) + 'px';
    }

    body = document.querySelector("body");
    resizeChildren(body);
}

// When DOM is loaded, adds event listeners to buttons
document.addEventListener('DOMContentLoaded', function () {
    var applyBtn = document.getElementById("apply-btn");
    applyBtn.addEventListener('click', applyCSS);
    applyBtn.addEventListener('click', applySize);

    var resetBtn = document.getElementById("reset-btn");
    resetBtn.addEventListener('click', reset);
});

// https://stackoverflow.com/questions/77495555/how-do-i-execute-a-script-on-the-current-tab-using-chrome-scripting-api:
// https://stackoverflow.com/questions/11684454/getting-the-source-html-of-the-current-page-from-chrome-extension/11696154#11696154
// https://stackoverflow.com/questions/15195209/how-to-get-font-size-in-html
// Prof. Lumbroso's code

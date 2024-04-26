// https://stackoverflow.com/questions/77495555/how-do-i-execute-a-script-on-the-current-tab-using-chrome-scripting-api:

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

// Gets size from size slider
function getSize() {
    var sizeSlider = document.getElementById("size-slider")
    return sizeSlider.value;
}

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

// Applies new CSS according to the specified size, spacing, color, etc.
async function apply() {
    let currTabId = await getCurrentTabId();
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
    let currTabId = await getCurrentTabId();
    removeCSS(currTabId);
}

// Helper function to remove CSS. Separated from reset() to avoid recomputing currTabId in apply()
async function removeCSS(currTabId) {
    try {
        chrome.scripting.removeCSS({
            target : {tabId : currTabId},
            css : currCss
        });
        console.log("CSS reset");
    } catch (err) {
        console.error("Failed to reset CSS: ", err)
    }
}

// When DOM is loaded, adds event listeners to buttons
document.addEventListener('DOMContentLoaded', function () {
    var applyBtn = document.getElementById("apply-btn")
    applyBtn.addEventListener('click', apply);

    var resetBtn = document.getElementById("reset-btn")
    resetBtn.addEventListener('click', reset);
});
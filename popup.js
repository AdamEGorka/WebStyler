// https://stackoverflow.com/questions/77495555/how-do-i-execute-a-script-on-the-current-tab-using-chrome-scripting-api:
// https://stackoverflow.com/questions/11684454/getting-the-source-html-of-the-current-page-from-chrome-extension/11696154#11696154
// https://stackoverflow.com/questions/15195209/how-to-get-font-size-in-html
// Prof. Lumbroso's code

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

// Applies new CSS according to the specified size, spacing, color, etc.
async function apply() {
    console.log(getSize());
    var currTabId = await getCurrentTabId();
    // Removes old CSS before injecting new one to not flood website with old CSS
    removeCSS(currTabId);
    
    currCss = getCSS();
    try {
        chrome.scripting.insertCSS({
            target : {tabId : currTabId},
            css : currCss
        }).then(() => console.log("New CSS injected"));
    } catch (err) {
        console.error("Failed to inject css: ", err);
    }
}

// Resets the website's CSS to what it was initially
async function reset() {
    var currTabId = await getCurrentTabId();
    removeCSS(currTabId);
}

// Helper function to remove CSS. Separated from reset() to avoid recomputing currTabId in apply()
async function removeCSS(currTabId) {
    try {
        chrome.scripting.removeCSS({
            target : {tabId : currTabId},
            css : currCss
        }).then(() => console.log("CSS reset"));
    } catch (err) {
        console.error("Failed to reset CSS: ", err)
    }
}

var html_str = ''

function onWindowLoad() {
    chrome.tabs.query({ active: true, currentWindow: true }).then(function (tabs) {
        var activeTab = tabs[0];
        var activeTabId = activeTab.id;

        return chrome.scripting.executeScript({
            target: { tabId: activeTabId },
            // injectImmediately: true,  // uncomment this to make it execute straight away, other wise it will wait for document_idle
            func: DOMtoString,
            args: [currSize, getSize()]  // you can use this to target what element to get the html for
        });
    }).then(function (results) {
        html_str = results[0].result;
    }).catch(function (error) {
        html_str = "There was an error injecting the script : " + error.message;
    // Updates currSize. Important that it's after the call to executeScript
    }).then(() => currSize = getSize());
}

function DOMtoString(oldSize, newSize) {
    // Maps each element to its fontSize and then scales fontSize
    // Avoids changing fontSize of parent affecting fontSize of child
    // Should look for a better way to do this 
    var map = new Map();

    /**
     * Recursively restyles the given element and its children with the specified style.
     * @param {HTMLElement} elt - The element to restyle.
     */
    function mapFontSizes(elt) {        
        // restyle current node
        var style = window.getComputedStyle(elt, null).getPropertyValue('font-size');
        var fontSize = parseFloat(style);
        map.set(elt, fontSize);

        // iterate over children
        var children = elt.children;
        for (var i = 0; i < children.length; i+=1) {
            var x = children[i];
            mapFontSizes(x);
        }
    }

    function scaleFontSizes(elt) {        
        // restyle current node
        var fontSize = map.get(elt)
        elt.style.fontSize = (fontSize / (oldSize / 50.0) * (newSize/50.0)) + 'px';

        // iterate over children
        var children = elt.children;
        for (var i = 0; i < children.length; i+=1) {
            var x = children[i];
            scaleFontSizes(x);
        }
    }

    body = document.querySelector("body");
    mapFontSizes(body);
    scaleFontSizes(body);
    return body.outerHTML;
}

// When DOM is loaded, adds event listeners to buttons
document.addEventListener('DOMContentLoaded', function () {
    var applyBtn = document.getElementById("apply-btn")
    applyBtn.addEventListener('click', apply);
    applyBtn.addEventListener('click', onWindowLoad)

    var resetBtn = document.getElementById("reset-btn")
    resetBtn.addEventListener('click', reset);
});

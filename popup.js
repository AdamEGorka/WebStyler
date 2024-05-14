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
    return sizeSlider.value;
}

// Gets font from font select
function getFont() {
    var fontSelect = document.getElementById("font-select");
    return fontSelect.value;
}

// Gets color from color wheel
function getColor() {
    var colorWheel = document.getElementById("color-wheel");
    return colorWheel.value;
}

// Gets background color from color wheel
function getBgColor() {
    var bgColorWheel = document.getElementById("bg-color-wheel");
    return bgColorWheel.value;
}

// Returns the new CSS to be injected into the website
function getCSS() {
    let css = "";
    let bodyCss = "";
    if (document.getElementById("enable-font").checked) {
        css += `font-family: ${getFont()} !important;`;
    }
    if (document.getElementById("enable-color").checked) {
        css += `color: ${getColor()} !important;`;
    }
    if (document.getElementById("enable-bg-color").checked) {
        bodyCss += `background-color: ${getBgColor()} !important;`;
    }
    return `
    * {
        ${css}
    }
    body {
        ${bodyCss}
    }
    `;
}

var currSize, currColor, currBgColor, currFont, currCss, currSizeCheck, currColorCheck, currBgColorCheck, currFontCheck;
async function loadSavedValues() {
    currCss = localStorage.getItem("savedCss");
    currSize = localStorage.getItem("savedSize");
    currFont = localStorage.getItem("savedFont");
    currColor = localStorage.getItem("savedColor");
    currBgColor = localStorage.getItem("savedBgColor");
    currSizeCheck = localStorage.getItem("savedSizeCheck") === 'true';
    currFontCheck = localStorage.getItem("savedFontCheck") === 'true';
    currColorCheck = localStorage.getItem("savedColorCheck") === 'true';
    currBgColorCheck = localStorage.getItem("savedBgColorCheck") === 'true';

    if (currCss === null) {currCss = "";}
    if (currSize === null) {currSize = 50;}
    if (currColor === null) {currColor = "#c3c3c3";}
    if (currBgColor === null) {currBgColor = "#3c3c3c";}
    if (currFont === null) {currFont = "Arial";}
    if (currSizeCheck === null) {currSizeCheck = true;}
    if (currFontCheck === null) {currFontCheck = true;}
    if (currColorCheck === null) {currColorCheck = true;}
    if (currBgColorCheck === null) {currBgColorCheck = true;}

    document.getElementById("size-slider").value = "" + currSize;
    document.getElementById("color-wheel").value = currColor;
    document.getElementById("bg-color-wheel").value = currBgColor;
    document.getElementById("font-select").value = currFont;
    document.getElementById("enable-size").checked = currSizeCheck;
    document.getElementById("enable-font").checked = currFontCheck;
    document.getElementById("enable-font").checked;
    document.getElementById("enable-color").checked = currColorCheck;
    document.getElementById("enable-bg-color").checked = currBgColorCheck;
}

async function updateValues() {
    // Updates values of currSize, currColor, currBgColor, currFont to be saved later
    currSizeCheck = document.getElementById("enable-size").checked;
    currFontCheck = document.getElementById("enable-font").checked;
    currColorCheck = document.getElementById("enable-color").checked;
    currBgColorCheck = document.getElementById("enable-bg-color").checked;
    if (currSizeCheck) {
        currSize = getSize();
    }
    if (currFontCheck) {
        currFont = getFont();
    }
    if (currColorCheck) {
        currColor = getColor();
    }
    if (currBgColorCheck) {
        currBgColor = getBgColor();
    }
}

async function saveValues() {
    localStorage.setItem("savedCss", currCss);
    localStorage.setItem("savedSize", currSize);
    localStorage.setItem("savedFont", currFont);
    localStorage.setItem("savedColor", currColor);
    localStorage.setItem("savedBgColor", currBgColor);
    localStorage.setItem("savedSizeCheck", currSizeCheck);
    localStorage.setItem("savedFontCheck", currFontCheck);
    localStorage.setItem("savedColorCheck", currColorCheck);
    localStorage.setItem("savedBgColorCheck", currBgColorCheck);
}

// Applies CSS and size
async function apply() {
    updateValues();
    applyCSS();
    applySize();
}

// Applies new CSS according to the specified color and font
async function applyCSS() {
    // Removes old CSS before injecting new one to not flood website with old CSS
    removeCSS(currTabId);
    currCss = getCSS();
    try {
        chrome.scripting.insertCSS({
            target: {tabId: currTabId},
            css: currCss
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
            target: {tabId: currTabId},
            css: currCss
        });
    } catch (err) {
        console.error("Failed to remove CSS: ", err);
    }
}

// Applies new size according to the specified size
async function applySize() {
    if (document.getElementById("enable-size").checked) {
        changeSize(getSize());
    }
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
    } catch (error) {
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
        elt.style.fontSize = (fontSize * (newSize / 50.0)) + 'px';
    }

    body = document.querySelector("body");
    resizeChildren(body);
}

async function injectContentScript() {
    try {
        await chrome.scripting.executeScript({
            target: {tabId: currTabId},
            files: ['content.js']
        });
    } catch (err) {
        console.error("Failed to inject content script: ", err);
    }
}

async function applyColorblindMode(type) {
    await injectContentScript();
    try {
        await chrome.tabs.sendMessage(currTabId, { mode: type });
        console.log("Daltonization applied");
    } catch (error) {
        console.error("There was an error sending the message: " + error.message);
    }
}

function resetColorblindMode() {
    chrome.scripting.executeScript({
        target: {tabId: currTabId},
        func: () => location.reload(),
    });
}

function openTab(evt, tabName) {
    var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";
}

function handleCheckboxChange(event) {
    if (event.target.checked) {
        document.getElementById("protanopia").checked = event.target.id === "protanopia";
        document.getElementById("deuteranopia").checked = event.target.id === "deuteranopia";
        document.getElementById("tritanopia").checked = event.target.id === "tritanopia";
        localStorage.setItem("colorblindMode", event.target.id);
    }
}

// When DOM is loaded, adds event listeners to buttons
// Apply saved colorblind mode on page load
document.addEventListener('DOMContentLoaded', async function () {
    currTabId = await getCurrentTabId();
    loadSavedValues();

    // Existing event listeners
    var applyBtn = document.getElementById("apply-btn");
    applyBtn.addEventListener('click', apply);

    var resetBtn = document.getElementById("reset-btn");
    resetBtn.addEventListener('click', reset);

    var colorblindApplyBtn = document.getElementById("colorblind-apply-btn");
    colorblindApplyBtn.addEventListener('click', function () {
        if (document.getElementById("protanopia").checked) {
            applyColorblindMode("protanopia");
        } else if (document.getElementById("deuteranopia").checked) {
            applyColorblindMode("deuteranopia");
        } else if (document.getElementById("tritanopia").checked) {
            applyColorblindMode("tritanopia");
        }
    });

    var colorblindResetBtn = document.getElementById("colorblind-reset-btn");
    colorblindResetBtn.addEventListener('click', async function () {
        resetColorblindMode();
        document.getElementById("protanopia").checked = false;
        document.getElementById("deuteranopia").checked = false;
        document.getElementById("tritanopia").checked = false;
        localStorage.removeItem("colorblindMode");
    });

    document.getElementById("protanopia").addEventListener('change', handleCheckboxChange);
    document.getElementById("deuteranopia").addEventListener('change', handleCheckboxChange);
    document.getElementById("tritanopia").addEventListener('change', handleCheckboxChange);

    document.getElementById("generalTab").addEventListener('click', function(event) { openTab(event, 'General'); });
    document.getElementById("colorblindTab").addEventListener('click', function(event) { openTab(event, 'Colorblind'); });
});

document.addEventListener('visibilitychange', saveValues);

// https://stackoverflow.com/questions/77495555/how-do-i-execute-a-script-on-the-current-tab-using-chrome-scripting-api:
// https://stackoverflow.com/questions/11684454/getting-the-source-html-of-the-current-page-from-chrome-extension/11696154#11696154
// https://stackoverflow.com/questions/15195209/how-to-get-font-size-in-html
// Prof. Lumbroso's code
// https://stackoverflow.com/questions/23765628/javascript-how-to-set-checkbox-checked-based-on-a-variable
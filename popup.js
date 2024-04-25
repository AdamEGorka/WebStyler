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

function getSize() {
    var size_slider = document.getElementById("size-slider")
    return size-slider.value;
}

function getColor() {
    var color_wheel = document.getElementById("color-wheel")
    return color_wheel.value;
}

function getCSS() {
    return `
    * {
        color: ${getColor()} !important;
        /*font-family: "Georgia" !important;*/
    }
    `;
}
var prev_css = ''
var curr_css = ''

async function injectScriptIfNeeded(tab_Id, reset) {
    try {
        
        // Check if the script is already injected
        const [result] = await chrome.scripting.executeScript({
            target: { tabId : tab_Id },
            function: () => window.cssInjected,
        });
        // If the script is not injected, inject it. Or True
        if (!result?.result || true) {
            prev_css = curr_css;
            curr_css = reset ? '' : getCSS();
            console.log(prev_css);
            console.log(curr_css);
            await chrome.scripting.removeCSS({
                target : {tabId : tab_Id},
                css : prev_css
            });
            await chrome.scripting.insertCSS({
                target : { tabId : tab_Id },
                css : curr_css
            }).then(() => console.log("New CSS injected"));
            // After successful injection, mark the script as injected
            await chrome.scripting.executeScript({
                target: { tabId : tab_Id },
                function: () => { window.cssInjected = true; },
            });
        }
        
    } catch (err) {
        console.error("Failed to inject or check script: ", err);
    }
}

// This async function toggles the state of the extension.
// It sends a message with { toggle: true } to the content script
// running in the current tab. This approach simplifies the logic
// by not requiring the service worker to keep track of the auto-clicker's state.
async function toggleEnableExtension(reset) {
    let currentTabId = await getCurrentTabId();
    if (currentTabId) {
        await injectScriptIfNeeded(currentTabId, reset);
        chrome.tabs.sendMessage(currentTabId, { toggle: true }).catch(err =>
            console.error("failed to send message: ", err)
        );
    };
}

document.addEventListener('DOMContentLoaded', function () {
    var apply_btn = document.getElementById("apply-btn")
    apply_btn.addEventListener('click', () => toggleEnableExtension(false));
    console.log(getColor());

    var reset_btn = document.getElementById("reset-btn")
    reset_btn.addEventListener('click', () => toggleEnableExtension(true));
});
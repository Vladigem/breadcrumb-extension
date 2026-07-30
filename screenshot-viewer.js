import {
    loadScreenshot
} from "./image-storage.js";


const screenshotTitle =
    document.querySelector("#screenshot-title");

const screenshotImage =
    document.querySelector("#screenshot-image");

const viewerStatus =
    document.querySelector("#viewer-status");

const closeButton =
    document.querySelector("#close-button");


const parameters =
    new URLSearchParams(window.location.search);

const captureId = parameters.get("id");

const captureTitle =
    parameters.get("title") || "Saved screenshot";


closeButton.addEventListener("click", closeViewer);

document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
        closeViewer();
    }
});


loadViewer();


async function loadViewer() {
    screenshotTitle.textContent = captureTitle;

    if (!captureId) {
        viewerStatus.textContent =
            "Breadcrumb could not find this screenshot.";

        return;
    }

    try{
        const imageData =
            await loadScreenshot(captureId);

        if (!imageData) {
            viewerStatus.textContent =
                "This screenshot is unavailable.";

            return;
        }

        screenshotImage.src = imageData;
        screenshotImage.alt =
            `Screenshot of ${captureTitle}`;

        screenshotImage.hidden = false;
        viewerStatus.hidden = true;
    } catch (error) {
        console.error(error);

        viewerStatus.textContent =
            "Breadcrumb could not load this screenshot.";
    }
}


async function closeViewer() {
    const currentTab = await chrome.tabs.getCurrent();

    if (currentTab?.id) {
        await chrome.tabs.remove(currentTab.id);
    }
}
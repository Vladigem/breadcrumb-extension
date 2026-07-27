import {
    loadStoredData,
    updateStoredData,
    removeStoredData
} from "./storage.js";


import {
    filterCaptures,
    getPageUrl,
    getTags,
    isValidCapture,
    isValidCollection,
    sortCaptures
} from "./capture-utils.js";


import {
    renderCaptureCards,
    renderTimeline
} from "./capture-renderer.js";


import {
    renderCollectionControls,
    renderCollectionManager
} from "./collection-renderer.js";


import {
    clearScreenshots,
    deleteScreenshot,
    loadScreenshot,
    saveScreenshot
} from "./image-storage.js";


const saveButton = document.querySelector("#save-button");
const savePageButton = document.querySelector(
    "#save-page-button"
);
const clearButton = document.querySelector("#clear-button");
const noteInput = document.querySelector("#note-input");
const noteCount = document.querySelector("#note-count");
const searchInput = document.querySelector("#search-input");
const statusMessage = document.querySelector("#status-message");
const captureCount = document.querySelector("#capture-count");
const emptyMessage = document.querySelector("#empty-message");
const captureList = document.querySelector("#capture-list");
const editPanel = document.querySelector("#edit-panel");
const editNoteInput = document.querySelector("#edit-note-input");
const editNoteCount = document.querySelector("#edit-note-count");
const cancelEditButton = document.querySelector("#cancel-edit-button");
const saveEditButton = document.querySelector("#save-edit-button");
const tagsInput = document.querySelector("#tags-input");
const editTagsInput = document.querySelector("#edit-tags-input");
const settingsButton = document.querySelector("#settings-button");
const settingsPanel = document.querySelector("#settings-panel");
const remindersEnabled = document.querySelector("#reminders-enabled");
const currentPageButton = document.querySelector("#current-page-button");
const clearPageFilterButton = document.querySelector("#clear-page-filter-button");
const pageFilterMessage = document.querySelector("#page-filter-message");
const exportButton = document.querySelector("#export-button");
const importButton = document.querySelector("#import-button");
const importInput = document.querySelector("#import-input");
const tagBrowser = document.querySelector("#tag-browser");
const tagList = document.querySelector("#tag-list");
const clearTagButton = document.querySelector("#clear-tag-button");
const favouritesButton = document.querySelector("#favourites-button");
const totalCaptures = document.querySelector("#total-captures");
const totalPages = document.querySelector("#total-pages");
const totalFavourites = document.querySelector("#total-favourites");
const sortSelect = document.querySelector("#sort-select");
const timelineButton = document.querySelector("#timeline-button");
const sortControl = document.querySelector("#sort-control");
const collectionSelect = document.querySelector("#collection-select");
const editCollectionSelect = document.querySelector("#edit-collection-select");
const collectionFilter = document.querySelector("#collection-filter");
const collectionNameInput = document.querySelector("#collection-name-input");
const createCollectionButton = document.querySelector("#create-collection-button");
const collectionManager = document.querySelector("#collection-manager");
const typeFilter = document.querySelector("#type-filter");
const saveScreenshotButton = document.querySelector(
    "#save-screenshot-button"
);

let editingCaptureId = null;
let currentPageFilterUrl = null;
let selectedTag = null;
let showFavouritesOnly = false;
let timelineMode = false;


const captureActions = {
    filterByTag: filterByTag,
    toggleFavourite: toggleFavourite,
    startEditing: startEditing,
    deleteCapture: deleteCapture
};


const collectionControls = {
    saveSelect: collectionSelect,
    editSelect: editCollectionSelect,
    filterSelect: collectionFilter
};


function setupEventListeners() {
    noteInput.addEventListener("input", updateNoteCount);
    searchInput.addEventListener("input", renderCaptures);
    editNoteInput.addEventListener("input", updateEditNoteCount);

    cancelEditButton.addEventListener("click", closeEditPanel);
    saveEditButton.addEventListener("click", saveEditedNote);

    settingsButton.addEventListener("click", toggleSettingsPanel);
    remindersEnabled.addEventListener("change", updateReminderSetting);

    currentPageButton.addEventListener("click", showCurrentPageCaptures);
    clearPageFilterButton.addEventListener("click", showAllCaptures);

    exportButton.addEventListener("click", exportCaptures);
    importButton.addEventListener("click", openImportPicker);
    importInput.addEventListener("change", importCaptures);

    clearTagButton.addEventListener("click", clearTagFilter);
    favouritesButton.addEventListener("click", toggleFavouriteFilter);

    sortSelect.addEventListener("change", renderCaptures);
    timelineButton.addEventListener("click", toggleTimelineMode);
    collectionFilter.addEventListener("change", renderCaptures);

    createCollectionButton.addEventListener("click", createCollection);

    saveButton.addEventListener(
        "click",
        saveHighlightCapture
    );

    savePageButton.addEventListener(
        "click",
        savePageCapture
    );

    clearButton.addEventListener("click", clearAllCaptures);

    typeFilter.addEventListener("change", renderCaptures);
    saveScreenshotButton.addEventListener(
        "click",
        saveScreenshotCapture
    );
}


function toggleSettingsPanel() {
    settingsPanel.hidden = !settingsPanel.hidden;
}


async function updateReminderSetting() {
    await updateStoredData({
        remindersEnabled: remindersEnabled.checked
    });

    if (remindersEnabled.checked) {
        statusMessage.textContent = "Revisit reminders turned on.";
    } else {
        statusMessage.textContent = "Revisit reminders turned off.";
    }
}


function openImportPicker() {
    importInput.click();
}


async function getCurrentTab() {
    const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true
    });

    return tabs[0];
}


function isNormalWebPage(tab) {
    return (
        tab &&
        typeof tab.url === "string" &&
        (
            tab.url.startsWith("http://") ||
            tab.url.startsWith("https://")
        )
    );
}


function createCaptureDetails(currentTab) {
    return {
        id: crypto.randomUUID(),
        favourite: false,
        collectionId: collectionSelect.value || null,
        note: noteInput.value.trim(),
        tags: getTags(tagsInput.value),
        title: currentTab.title,
        url: currentTab.url,
        savedAt: new Date().toISOString()
    };
}


async function addCapture(capture) {
    const storedData = await loadStoredData();

    await updateStoredData({
        captures: [capture, ...storedData.captures]
    });
}


function resetCaptureInputs() {
    noteInput.value = "";
    tagsInput.value = "";
    updateNoteCount();
}


async function saveHighlightCapture() {
    const currentTab = await getCurrentTab();

    if (!isNormalWebPage(currentTab)) {
        statusMessage.textContent =
            "Breadcrumb works on normal webpages, not Chrome pages.";
        return;
    }

    try {
        const results = await chrome.scripting.executeScript({
            target: { tabId: currentTab.id },
            func: getSelectedText
        });

        const selectedText = results[0].result.trim();

        if (selectedText === "") {
            statusMessage.textContent =
                "Select some text on the page first.";
            return;
        }

        const capture = {
            ...createCaptureDetails(currentTab),
            type: "highlight",
            text: selectedText
        };

        await addCapture(capture);
        resetCaptureInputs();

        statusMessage.textContent = "Saved your breadcrumb.";
        await renderCaptures();
    } catch (error) {
        console.error(error);
        statusMessage.textContent =
            "Breadcrumb could not read this page.";
    }
}


async function savePageCapture() {
    const currentTab = await getCurrentTab();

    if (!isNormalWebPage(currentTab)) {
        statusMessage.textContent =
            "Breadcrumb saves normal webpages, not Chrome pages.";
        return;
    }

    try {
        const capture = {
            ...createCaptureDetails(currentTab),
            type: "page",
            text: ""
        };

        await addCapture(capture);
        resetCaptureInputs();

        statusMessage.textContent = "Saved this page.";
        await renderCaptures();
    } catch (error) {
        console.error(error);
        statusMessage.textContent =
            "Breadcrumb could not save this page.";
    }
}


async function saveScreenshotCapture() {
    const currentTab = await getCurrentTab();

    if (!isNormalWebPage(currentTab)) {
        statusMessage.textContent =
            "Breadcrumb captures normal webpages, not Chrome pages.";
        return;
    }

    try {
        const capture = {
            ...createCaptureDetails(currentTab),
            type: "screenshot",
            text: ""
        };

        const imageData = await chrome.tabs.captureVisibleTab(
            currentTab.windowId,
            {
                format: "jpeg",
                quality: 75
            }
        );

        await saveScreenshot(capture.id, imageData);

        try {
            await addCapture(capture);
        } catch (error) {
            await deleteScreenshot(capture.id);
            throw error;
        }

        resetCaptureInputs();

        statusMessage.textContent =
            "Saved a screenshot of this page.";

        await renderCaptures();
    } catch (error) {
        console.error(error);
        statusMessage.textContent =
            "Breadcrumb could not capture this page.";
    }
}


async function clearAllCaptures() {
    await removeStoredData("captures");
    await clearScreenshots();

    statusMessage.textContent = "Cleared saved breadcrumbs.";
    await renderCaptures();
}


async function showCurrentPageCaptures() {
    const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true
    });

    const currentTab = tabs[0];

    const isWebPage =
        currentTab.url.startsWith("http://") ||
        currentTab.url.startsWith("https://");

    if (!isWebPage) {
        statusMessage.textContent =
            "This filter works on normal webpages, not Chrome pages.";
        return;
    }

    currentPageFilterUrl = getPageUrl(currentTab.url);

    currentPageButton.hidden = true;
    clearPageFilterButton.hidden = false;

    pageFilterMessage.hidden = false;
    pageFilterMessage.textContent =
        "Showing only breadcrumbs saved from this page.";

    await renderCaptures();
}


async function showAllCaptures() {
    currentPageFilterUrl = null;

    currentPageButton.hidden = false;
    clearPageFilterButton.hidden = true;

    pageFilterMessage.hidden = true;

    await renderCaptures();
}


async function filterByTag(tag) {
    selectedTag = tag;

    searchInput.value = "";
    clearTagButton.hidden = false;

    await renderCaptures();
}


async function clearTagFilter() {
    selectedTag = null;

    clearTagButton.hidden = true;

    await renderCaptures();
}


function renderTagBrowser(captures) {
    const tagCounts = new Map();

    for (const capture of captures) {
        for (const tag of capture.tags || []) {
            const currentCount = tagCounts.get(tag) || 0;

            tagCounts.set(tag, currentCount + 1);
        }
    }

    if (tagCounts.size === 0) {
        tagBrowser.hidden = true;
        return;
    }

    tagBrowser.hidden = false;
    tagList.innerHTML = "";

    const sortedTags = [...tagCounts.entries()].sort(function (firstEntry, secondEntry) {
        return firstEntry[0].localeCompare(secondEntry[0]);
    });

    for (const entry of sortedTags) {
        const tag = entry[0];
        const count = entry[1];

        const tagButton = document.createElement("button");
        tagButton.className = "tag-browser-button";
        tagButton.textContent = `#${tag} (${count})`;

        if (tag === selectedTag) {
            tagButton.classList.add("active-tag");
        }

        tagButton.addEventListener("click", function () {
            filterByTag(tag);
        });

        tagList.append(tagButton);
    }
}


async function toggleFavouriteFilter() {
    showFavouritesOnly = !showFavouritesOnly;

    if (showFavouritesOnly) {
        favouritesButton.textContent = "Show all captures";
        favouritesButton.classList.add("active-favourites");
    } else {
        favouritesButton.textContent = "Show favourites";
        favouritesButton.classList.remove("active-favourites");
    }

    await renderCaptures();
}


async function toggleFavourite(captureId) {
    const storedData = await loadStoredData();

    const captureToUpdate = storedData.captures.find(function (capture) {
        return capture.id === captureId;
    });

    const updatedCaptures = storedData.captures.map(function (capture) {
        if (capture.id === captureId) {
            return {
                ...capture,
                favourite: !capture.favourite
            };
        }

        return capture;
    });

    await updateStoredData({
        captures: updatedCaptures
    });

    if (captureToUpdate.favourite) {
        statusMessage.textContent = "Removed from favourites.";
    } else {
        statusMessage.textContent = "Added to favourites.";
    }

    await renderCaptures();
}


function renderTrailSummary(captures) {
    const savedPages = new Set(
        captures.map(function (capture) {
            return getPageUrl(capture.url);
        })
    );

    const favouriteCount = captures.filter(function (capture) {
        return capture.favourite === true;
    }).length;

    totalCaptures.textContent = captures.length;
    totalPages.textContent = savedPages.size;
    totalFavourites.textContent = favouriteCount;
}


async function toggleTimelineMode() {
    timelineMode = !timelineMode;

    if (timelineMode) {
        timelineButton.textContent = "Card view";
        timelineButton.classList.add("active-timeline");
        sortControl.hidden = true;
    } else {
        timelineButton.textContent = "Timeline view";
        timelineButton.classList.remove("active-timeline");
        sortControl.hidden = false;
    }

    await renderCaptures();
}


async function createCollection() {
    const name = collectionNameInput.value.trim();

    if (name === "") {
        statusMessage.textContent = "Give the collection a name first.";
        return;
    }

    const storedData = await loadStoredData();

    const nameAlreadyExists = storedData.collections.some(function (collection) {
        return collection.name.toLowerCase() === name.toLowerCase();
    });

    if (nameAlreadyExists) {
        statusMessage.textContent = "That collection already exists.";
        return;
    }

    const collection = {
        id: crypto.randomUUID(),
        name: name
    };

    await updateStoredData({
        collections: [...storedData.collections, collection]
    });

    collectionNameInput.value = "";

    statusMessage.textContent = `Created ${collection.name}.`;

    await renderCaptures();

    collectionSelect.value = collection.id;
}


async function deleteCollection(collectionId) {
    const storedData = await loadStoredData();

    const collection = storedData.collections.find(function (item) {
        return item.id === collectionId;
    });

    const confirmed = window.confirm(
        `Remove "${collection.name}"? Its breadcrumbs will stay saved without a collection.`
    );

    if (!confirmed) {
        return;
    }

    const updatedCollections = storedData.collections.filter(function (item) {
        return item.id !== collectionId;
    });

    const updatedCaptures = storedData.captures.map(function (capture) {
        if (capture.collectionId === collectionId) {
            return {
                ...capture,
                collectionId: null
            };
        }

        return capture;
    });

    await updateStoredData({
        collections: updatedCollections,
        captures: updatedCaptures
    });

    if (collectionFilter.value === collectionId) {
        collectionFilter.value = "";
    }

    statusMessage.textContent = `Removed ${collection.name}.`;

    await renderCaptures();
}


async function renderCaptures() {
    const storedData = await loadStoredData();

    const captures = storedData.captures;
    const collections = storedData.collections;

    renderCollectionControls(
        collections,
        collectionControls
    );
    renderCollectionManager(
        collections,
        collectionManager,
        deleteCollection
    );
    renderTagBrowser(captures);
    renderTrailSummary(captures);
    const searchTerm = searchInput.value.trim().toLowerCase();

    const visibleCaptures = filterCaptures(captures, {
        searchTerm: searchTerm,
        selectedTag: selectedTag,
        showFavouritesOnly: showFavouritesOnly,
        collectionId: collectionFilter.value,
        currentPageFilterUrl: currentPageFilterUrl,
        captureType: typeFilter.value
    });

    const sortedCaptures = sortCaptures(
        visibleCaptures,
        sortSelect.value
    );

    if (currentPageFilterUrl !== null) {
        captureCount.textContent = `${sortedCaptures.length} on this page`;
    } else if (showFavouritesOnly) {
        captureCount.textContent = `${sortedCaptures.length} favourites`;
    } else {
        captureCount.textContent = `${captures.length} saved`;
    }

    captureList.innerHTML = "";

    if (sortedCaptures.length === 0) {
        emptyMessage.hidden = false;

        if (captures.length === 0) {
            emptyMessage.textContent =
                "Nothing saved yet. Your trail starts here.";
        } else if (currentPageFilterUrl !== null && searchTerm !== "") {
            emptyMessage.textContent =
                "No breadcrumbs from this page match that search.";
        } else if (currentPageFilterUrl !== null) {
            emptyMessage.textContent =
                "No breadcrumbs have been saved from this page yet.";
        } else if (collectionFilter.value !== "") {
            emptyMessage.textContent =
                "No breadcrumbs in this collection match your current filters.";
        } else if (showFavouritesOnly) {
            emptyMessage.textContent =
                "No favourite breadcrumbs match your current filters."
        } else if (typeFilter.value === "page") {
            emptyMessage.textContent =
                "No saved pages match your current filters.";
        } else if (typeFilter.value === "highlight") {
            emptyMessage.textContent =
                "No highlights match your current filters.";
        } else if (typeFilter.value === "screenshot") {
            emptyMessage.textContent =
                "No screenshots match your current filters.";
        } else {
            emptyMessage.textContent =
                "No saved breadcrumbs match that search.";
        }

        return;
    }

    emptyMessage.hidden = true;

    if (timelineMode) {
        renderTimeline(
            sortedCaptures,
            collections,
            captureList,
            captureActions
        );
    } else {
        renderCaptureCards(
            sortedCaptures,
            collections,
            captureList,
            captureActions
        );
    }
}


async function deleteCapture(captureId) {
    const storedData = await loadStoredData();

    const captureToDelete = storedData.captures.find(function (
        capture
    ) {
        return capture.id === captureId;
    });

    if (captureToDelete?.type === "screenshot") {
        await deleteScreenshot(captureId);
    }

    const updatedCaptures = storedData.captures.filter(function (capture) {
        return capture.id !== captureId;
    });

    await updateStoredData({
        captures: updatedCaptures
    });

    statusMessage.textContent = "Deleted breadcrumb.";
    await renderCaptures();
}


function startEditing(capture) {
    editingCaptureId = capture.id;

    editNoteInput.value = capture.note || "";
    editCollectionSelect.value = capture.collectionId || "";
    editTagsInput.value = (capture.tags || []).join(", ");
    updateEditNoteCount();

    editPanel.hidden = false;
    editNoteInput.focus();
}

function closeEditPanel() {
    editingCaptureId = null;
    editPanel.hidden = true;
    editNoteInput.value = "";
    editTagsInput.value = "";
    editCollectionSelect.value = "";
    updateEditNoteCount();
}

async function saveEditedNote() {
    if (editingCaptureId === null) {
        return;
    }

    const storedData = await loadStoredData();

    const updatedCaptures = storedData.captures.map(function (capture) {
        if (capture.id === editingCaptureId) {
            return {
                ...capture,
                note: editNoteInput.value.trim(),
                tags: getTags(editTagsInput.value),
                collectionId: editCollectionSelect.value || null,
                updatedAt: new Date().toISOString()
            };
        }

        return capture;
    });

    await updateStoredData({
        captures: updatedCaptures
    });

    statusMessage.textContent = "Updated breadcrumb note.";

    closeEditPanel();
    await renderCaptures();
}


async function exportCaptures() {
    const storedData = await loadStoredData();

    if (storedData.captures.length === 0) {
        statusMessage.textContent = "Save a breadcrumb before exporting."
        return;
    }

    const screenshots = {};

    for (const capture of storedData.captures) {
        if (capture.type === "screenshot") {
            const imageData = await loadScreenshot(capture.id);

            if (imageData) {
                screenshots[capture.id] = imageData;
            }
        }
    }

    const backup = {
        app: "Breadcrumb",
        version: 2,
        exportedAt: new Date().toISOString(),
        collections: storedData.collections,
        captures: storedData.captures,
        screenshots: screenshots
    };

    const backupText = JSON.stringify(backup, null, 2);

    const backupFile = new Blob([backupText], {
        type: "application/json"
    });

    const backupUrl = URL.createObjectURL(backupFile);

    await chrome.downloads.download({
        url: backupUrl,
        filename: "breadcrumb-backup.json",
        saveAs: true
    });

    statusMessage.textContent = "Downloaded Breadcrumb backup.";
}


async function importCaptures(event) {
    const selectedFile = event.target.files[0];

    if(!selectedFile) {
        return;
    }

    try{
        const fileText = await selectedFile.text();
        const backup = JSON.parse(fileText);

        if (!Array.isArray(backup.captures)) {
            throw new Error("Invalid backup");
        }

        const validCaptures = backup.captures.filter(isValidCapture);

        const validCollections = Array.isArray(backup.collections)
            ? backup.collections.filter(isValidCollection)
            : [];

        const screenshots =
            backup.screenshots &&
            typeof backup.screenshots === "object"
                ? backup.screenshots
                : {};

        const importableCaptures = validCaptures.filter(function (
            capture
        ) {
            if (capture.type !== "screenshot") {
                return true;
            }

            const imageData = screenshots[capture.id];

            return (
                typeof imageData === "string" &&
                imageData.startsWith("data:image/")
            );
        });

        const storedData = await loadStoredData();

        const existingIds = new Set(
            storedData.captures.map(function (capture) {
                return capture.id;
            })
        );

        const existingCollectionIds = new Set(
            storedData.collections.map(function (collection) {
                return collection.id;
            })
        );

        const newCollections = validCollections.filter(function (collection) {
            return !existingCollectionIds.has(collection.id);
        });

        const newCaptures = importableCaptures.filter(function (
            capture
        ) {
            return !existingIds.has(capture.id);
        });

        const combinedCaptures = [
            ...storedData.captures,
            ...newCaptures
        ];

        combinedCaptures.sort(function (firstCapture, secondCapture) {
            return new Date(secondCapture.savedAt) - new Date(firstCapture.savedAt);
        });

        for (const capture of newCaptures) {
            if (capture.type === "screenshot") {
                await saveScreenshot(
                    capture.id,
                    screenshots[capture.id]
                );
            }
        }

        await updateStoredData({
            captures: combinedCaptures,
            collections: [...storedData.collections, ...newCollections]
        });

        statusMessage.textContent =
            `Imported ${newCaptures.length} new breadcrumbs.`;

        await renderCaptures();
    } catch (error) {
        console.error(error);
        statusMessage.textContent =
            "That file is not a valid Breadcrumb backup.";
    } finally {
        importInput.value = "";
    }
}


async function loadSettings() {
    const storedData = await loadStoredData();

    remindersEnabled.checked = storedData.remindersEnabled;
}


function updateEditNoteCount() {
    editNoteCount.textContent = `${editNoteInput.value.length} / 240`;
}


function updateNoteCount() {
    noteCount.textContent = `${noteInput.value.length} / 240`;
}


function getSelectedText() {
    return window.getSelection().toString()
}


setupEventListeners();
updateNoteCount();
updateEditNoteCount();
renderCaptures();
loadSettings();
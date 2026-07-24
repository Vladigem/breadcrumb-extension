const saveButton = document.querySelector("#save-button");
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

let editingCaptureId = null;
let currentPageFilterUrl = null;


noteInput.addEventListener("input", updateNoteCount);

searchInput.addEventListener("input", renderCaptures);

editNoteInput.addEventListener("input", updateEditNoteCount);

cancelEditButton.addEventListener("click", closeEditPanel);

saveEditButton.addEventListener("click", saveEditedNote);

settingsButton.addEventListener("click", function () {
    settingsPanel.hidden = !settingsPanel.hidden;
});

remindersEnabled.addEventListener("change", async function () {
    await chrome.storage.local.set({
        remindersEnabled: remindersEnabled.checked
    });

    if (remindersEnabled.checked) {
        statusMessage.textContent = "Revisit reminders turned on.";
    } else {
        statusMessage.textContent = "Revisit reminders turned off.";
    }
});

currentPageButton.addEventListener("click", showCurrentPageCaptures);

clearPageFilterButton.addEventListener("click", showAllCaptures);

exportButton.addEventListener("click", exportCaptures);

importButton.addEventListener("click", function () {
    importInput.click();
});

importInput.addEventListener("change", importCaptures);

saveButton.addEventListener("click", async function () {
    const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true
    });

    const currentTab = tabs [0];

    const isWebPage =
    currentTab.url.startsWith("http://") ||
    currentTab.url.startsWith("https://");

    if (!isWebPage) {
        statusMessage.textContent =
            "Breadcrumb works on normal webpages, not Chrome pages.";
        return;
    }

    try {
        const results = await chrome.scripting.executeScript({
            target: { tabId: currentTab.id },
            func: getSelectedText
        });

        const selectedText = results[0].result.trim()

        if (selectedText === "") {
            statusMessage.textContent = "Select some text on the page first.";
            return;
        }

        const capture = {
            id: crypto.randomUUID(),
            text: selectedText,
            note: noteInput.value.trim(),
            tags: getTags(tagsInput.value),
            title: currentTab.title,
            url: currentTab.url,
            savedAt: new Date().toISOString()
        };

        const storedData = await chrome.storage.local.get({
            captures: []
        });

        const captures = storedData.captures;

        captures.unshift(capture);

        await chrome.storage.local.set({
            captures: captures
        });

        noteInput.value = "";
        tagsInput.value = "";
        updateNoteCount();

        statusMessage.textContent = "Saved your breadcrumb.";
        await renderCaptures();
    } catch (error) {
        console.error(error);
        statusMessage.textContent = "Breadcrumb could not read this page.";
    }
});


clearButton.addEventListener("click", async function () {
    await chrome.storage.local.remove("captures");

    statusMessage.textContent = "Cleared saved breadcrumbs.";
    await renderCaptures();
});


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


async function renderCaptures() {
    const storedData = await chrome.storage.local.get({
        captures: []
    });

    const captures = storedData.captures;
    const searchTerm = searchInput.value.trim().toLowerCase();

    const matchingCaptures = captures.filter(function (capture) {
        const searchableText = `
            ${capture.text}
            ${capture.note || ""}
            ${capture.title}
            ${(capture.tags || []).join(" ")}
        `.toLowerCase();

        return searchableText.includes(searchTerm);
    });

    const visibleCaptures = matchingCaptures.filter(function (capture) {
        if (currentPageFilterUrl === null) {
            return true;
        }

        return getPageUrl(capture.url) === currentPageFilterUrl;
    });

    if (currentPageFilterUrl === null) {
        captureCount.textContent = `${captures.length} saved`;
    } else {
        captureCount.textContent = `${visibleCaptures.length} on this page`;
    }

    captureList.innerHTML = "";

    if (visibleCaptures.length === 0) {
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
        } else {
            emptyMessage.textContent =
                "No saved breadcrumbs match that search.";
        }

        return;
    }

    emptyMessage.hidden = true;

    for (const capture of visibleCaptures) {
        const card = createCaptureCard(capture);
        captureList.append(card);
    }
}


function createCaptureCard(capture) {
    const card = document.createElement("article");
    card.className = "capture-card";

    const quote = document.createElement("blockquote");
    quote.textContent = `"${capture.text}"`;

    const note = document.createElement("p");
    note.className = "capture-note";
    note.textContent = capture.note || "";

    const tags = document.createElement("div");
    tags.className = "capture-tags";

    for (const tag of capture.tags || []) {
        const tagButton = document.createElement("button");
        tagButton.className = "tag-button";
        tagButton.textContent = `#${tag}`;

        tagButton.addEventListener("click", function () {
            searchInput.value = tag;
            renderCaptures();
        });

        tags.append(tagButton);
    }

    const source = document.createElement("a");
    source.href = capture.url;
    source.target = "_blank";
    source.textContent = capture.title;

    const editButton = document.createElement("button");
    editButton.className = "edit-button";
    editButton.textContent = "Edit note";

    editButton.addEventListener("click", function () {
        startEditing(capture);
    });

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-button";
    deleteButton.textContent = "Delete";

    deleteButton.addEventListener("click", async function () {
        await deleteCapture(capture.id);
    });

    const actions = document.createElement("div");
    actions.className = "capture-actions";
    actions.append(editButton);
    actions.append(deleteButton);

    const footer = document.createElement("div");
    footer.className = "capture-footer";
    footer.append(source);
    footer.append(actions);

    const displayTime = capture.updatedAt || capture.savedAt;
    const savedTime = new Date(displayTime);

    const date = document.createElement("p");
    date.className = "saved-date";

    if (capture.updatedAt) {
        date.textContent = `Updated ${savedTime.toLocaleString()}`;
    } else {
        date.textContent = `Saved ${savedTime.toLocaleString()}`;
    }

    card.append(quote);

    if (capture.note) {
        card.append(note);
    }

    if (capture.tags && capture.tags.length > 0) {
        card.append(tags);
    }

    card.append(footer);
    card.append(date);

    return card;
}


async function deleteCapture(captureId) {
    const storedData = await chrome.storage.local.get({
        captures: []
    });

    const updatedCaptures = storedData.captures.filter(function (capture) {
        return capture.id !== captureId;
    });

    await chrome.storage.local.set({
        captures: updatedCaptures
    });

    statusMessage.textContent = "Deleted breadcrumb.";
    await renderCaptures();
}


function startEditing(capture) {
    editingCaptureId = capture.id;

    editNoteInput.value = capture.note || "";
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
    updateEditNoteCount();
}

async function saveEditedNote() {
    if (editingCaptureId === null) {
        return;
    }

    const storedData = await chrome.storage.local.get({
        captures: []
    });

    const updatedCaptures = storedData.captures.map(function (capture) {
        if (capture.id === editingCaptureId) {
            return {
                ...capture,
                note: editNoteInput.value.trim(),
                tags: getTags(editTagsInput.value),
                updatedAt: new Date().toISOString()
            };
        }

        return capture;
    });

    await chrome.storage.local.set({
        captures: updatedCaptures
    });

    statusMessage.textContent = "Updated breadcrumb note.";

    closeEditPanel();
    await renderCaptures();
}


async function exportCaptures() {
    const storedData = await chrome.storage.local.get({
        captures: []
    });

    if (storedData.captures.length === 0) {
        statusMessage.textContent = "Save a breadcrumb before exporting."
        return;
    }

    const backup = {
        app: "Breadcrumb",
        version: 1,
        exportedAt: new Date().toISOString(),
        captures: storedData.captures
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

        const storedData = await chrome.storage.local.get({
            captures: []
        });

        const existingIds = new Set(
            storedData.captures.map(function (capture) {
                return capture.id;
            })
        );

        const newCaptures = validCaptures.filter(function (capture) {
            return !existingIds.has(capture.id);
        });

        const combinedCaptures = [
            ...storedData.captures,
            ...newCaptures
        ];

        combinedCaptures.sort(function (firstCapture, secondCapture) {
            return new Date(secondCapture.savedAt) - new Date(firstCapture.savedAt);
        });

        await chrome.storage.local.set({
            captures: combinedCaptures
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


function isValidCapture(capture) {
    return (
        typeof capture.id === "string" &&
        typeof capture.text === "string" &&
        typeof capture.title === "string" &&
        typeof capture.url === "string" &&
        typeof capture.savedAt === "string"
    );
}


async function loadSettings() {
    const storedData = await chrome.storage.local.get({
        remindersEnabled: true
    });

    remindersEnabled.checked = storedData.remindersEnabled;
}


function updateEditNoteCount() {
    editNoteCount.textContent = `${editNoteInput.value.length} / 240`;
}


function getPageUrl(url) {
    const pageUrl = new URL(url);

    pageUrl.hash = "";

    return pageUrl.href
}


function getTags(tagText) {
    const tags = tagText.split(",").map(function (tag) {
        return tag.trim().toLowerCase();
    });

    const nonEmptyTags = tags.filter(function (tag) {
        return tag !== "";
    });

    return [...new Set(nonEmptyTags)];
}


function updateNoteCount() {
    noteCount.textContent = `${noteInput.value.length} / 240`;
}


function getSelectedText() {
    return window.getSelection().toString()
}


updateNoteCount();
updateEditNoteCount();
renderCaptures();
loadSettings();
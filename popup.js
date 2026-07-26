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

let editingCaptureId = null;
let currentPageFilterUrl = null;
let selectedTag = null;
let showFavouritesOnly = false;
let timelineMode = false;


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

clearTagButton.addEventListener("click", clearTagFilter);

favouritesButton.addEventListener("click", toggleFavouriteFilter);

sortSelect.addEventListener("change", renderCaptures);

timelineButton.addEventListener("click", toggleTimelineMode);

collectionFilter.addEventListener("change", renderCaptures);

createCollectionButton.addEventListener("click", createCollection);

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
            favourite: false,
            collectionId: collectionSelect.value || null,
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
    const storedData = await chrome.storage.local.get({
        captures: []
    });

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

    await chrome.storage.local.set({
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


function sortCaptures(captures) {
    const sortedCaptures = [...captures];

    if (sortSelect.value === "oldest") {
        sortedCaptures.sort(function (firstCapture, secondCapture) {
            return new Date(firstCapture.savedAt) - new Date(secondCapture.savedAt);
        });
    } else if (sortSelect.value === "favourites") {
        sortedCaptures.sort(function (firstCapture, secondCapture) {
            const favouriteDifference =
                Number(secondCapture.favourite) - Number(firstCapture.favourite);

            if (favouriteDifference !== 0) {
                return favouriteDifference;
            }

            return new Date(secondCapture.savedAt) - new Date(firstCapture.savedAt);
        });
    } else {
        sortedCaptures.sort(function (firstCapture, secondCapture) {
            return new Date(secondCapture.savedAt) - new Date(firstCapture.savedAt);
        });
    }

    return sortedCaptures;
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


function renderTimeline(captures, collections) {
    const timelineCaptures = [...captures].sort(function (
        firstCapture,
        secondCapture
    ) {
        return new Date(secondCapture.savedAt) - new Date(firstCapture.savedAt);
    });

    const capturesByDate = new Map();

    for (const capture of timelineCaptures) {
        const savedDate = new Date(capture.savedAt);
        const dateKey = savedDate.toDateString();

        if (!capturesByDate.has(dateKey)) {
            capturesByDate.set(dateKey, []);
        }

        capturesByDate.get(dateKey).push(capture);
    }

    for (const entry of capturesByDate) {
        const dateKey = entry[0];
        const dailyCaptures = entry[1];

        const group = document.createElement("section");
        group.className = "timeline-group";

        const dateHeading = document.createElement("p");
        dateHeading.className = "timeline-date";
        dateHeading.textContent = formatTimelineDate(dateKey);

        const items = document.createElement("div");
        items.className = "timeline-items";

        for (const capture of dailyCaptures) {
            const item = document.createElement("div");
            item.className = "timeline-item";

            item.append(createCaptureCard(capture, collections));
            items.append(item);
        }

        group.append(dateHeading);
        group.append(items);

        captureList.append(group);
    }
}


function formatTimelineDate(dateText) {
    const date = new Date(dateText);

    return date.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric"
    });
}


function renderCollectionOptions(select, collections, emptyLabel) {
    const selectedValue = select.value;

    select.innerHTML = "";

    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = emptyLabel;

    select.append(emptyOption);

    for (const collection of collections) {
        const option = document.createElement("option");
        option.value = collection.id;
        option.textContent = collection.name;

        select.append(option);
    }

    const collectionStillExists = collections.some(function (collection) {
        return collection.id === selectedValue;
    });

    if (collectionStillExists) {
        select.value = selectedValue;
    } else {
        select.value = "";
    }
}


function renderCollectionControls(collections) {
    renderCollectionOptions(
        collectionSelect,
        collections,
        "No collection"
    );

    renderCollectionOptions(
        editCollectionSelect,
        collections,
        "No collection"
    );

    renderCollectionOptions(
        collectionFilter,
        collections,
        "All collections"
    );
}


function renderCollectionManager(collections) {
    collectionManager.innerHTML = "";

    if (collections.length === 0) {
        const message = document.createElement("p");
        message.className = "settings-help";
        message.textContent = "No collections yet.";

        collectionManager.append(message);
        return;
    }

    for (const collection of collections) {
        const row = document.createElement("div");
        row.className = "collection-row";

        const name = document.createElement("p");
        name.textContent = collection.name;

        const deleteButton = document.createElement("button");
        deleteButton.className = "collection-delete-button";
        deleteButton.textContent = "Remove";

        deleteButton.addEventListener("click", async function () {
            await deleteCollection(collection.id);
        });

        row.append(name);
        row.append(deleteButton);

        collectionManager.append(row);
    }
}


async function createCollection() {
    const name = collectionNameInput.value.trim();

    if (name === "") {
        statusMessage.textContent = "Give the collection a name first.";
        return;
    }

    const storedData = await chrome.storage.local.get({
        collections: []
    });

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

    await chrome.storage.local.set({
        collections: [...storedData.collections, collection]
    });

    collectionNameInput.value = "";

    statusMessage.textContent = `Created ${collection.name}.`;

    await renderCaptures();

    collectionSelect.value = collection.id;
}


async function deleteCollection(collectionId) {
    const storedData = await chrome.storage.local.get({
        captures: [],
        collections: []
    });

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

    await chrome.storage.local.set({
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
    const storedData = await chrome.storage.local.get({
        captures: [],
        collections: []
    });

    const captures = storedData.captures;
    const collections = storedData.collections;

    renderCollectionControls(collections);
    renderCollectionManager(collections);
    renderTagBrowser(captures);
    renderTrailSummary(captures);
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

    const tagFilteredCaptures = matchingCaptures.filter(function (capture) {
        if (selectedTag === null) {
            return true;
        }

        return (capture.tags || []).includes(selectedTag);
    });

    const favouriteCaptures = tagFilteredCaptures.filter(function (capture) {
        if (!showFavouritesOnly) {
            return true;
        }

        return capture.favourite === true;
    });

    const collectionFilteredCaptures = favouriteCaptures.filter(function (capture) {
        if (collectionFilter.value === "") {
            return true;
        }

        return capture.collectionId === collectionFilter.value;
    });

    const visibleCaptures = collectionFilteredCaptures.filter(function (capture) {
        if (currentPageFilterUrl === null) {
            return true;
        }

        return getPageUrl(capture.url) === currentPageFilterUrl;
    });

    const sortedCaptures = sortCaptures(visibleCaptures);

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
        } else {
            emptyMessage.textContent =
                "No saved breadcrumbs match that search.";
        }

        return;
    }

    emptyMessage.hidden = true;

    if (timelineMode) {
        renderTimeline(sortedCaptures, collections);
    } else {
        for (const capture of sortedCaptures) {
            const card = createCaptureCard(capture, collections);
            captureList.append(card);
        }
    }
}


function createCaptureCard(capture, collections) {
    const card = document.createElement("article");
    card.className = "capture-card";

    const quote = document.createElement("blockquote");
    quote.textContent = `"${capture.text}"`;

    const note = document.createElement("p");
    note.className = "capture-note";
    note.textContent = capture.note || "";

    const collection = collections.find(function (item) {
        return item.id === capture.collectionId;
    });

    const collectionBadge = document.createElement("p");
    collectionBadge.className = "collection-badge";
    collectionBadge.textContent = collection ? collection.name : "";

    const tags = document.createElement("div");
    tags.className = "capture-tags";

    for (const tag of capture.tags || []) {
        const tagButton = document.createElement("button");
        tagButton.className = "tag-button";
        tagButton.textContent = `#${tag}`;

        tagButton.addEventListener("click", function () {
            filterByTag(tag);
        });

        tags.append(tagButton);
    }

    const source = document.createElement("a");
    source.href = capture.url;
    source.target = "_blank";
    source.textContent = capture.title;
    source.className = "source-link";

    const favouriteButton = document.createElement("button");
    favouriteButton.className = "favourite-button";

    if (capture.favourite) {
        favouriteButton.classList.add("is-favourite");
        favouriteButton.textContent = "\u2605";
        favouriteButton.setAttribute(
            "aria-label",
            "Remove breadcrumb from favourites"
        );
    } else {
        favouriteButton.textContent = "\u2606";
        favouriteButton.setAttribute(
            "aria-label",
            "Add breadcrumb to favourites"
        );
    }

    favouriteButton.addEventListener("click", async function () {
        await toggleFavourite(capture.id);
    });

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
    actions.append(favouriteButton);
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

    if (collection) {
        card.append(collectionBadge);
    }

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

    const storedData = await chrome.storage.local.get({
        captures: []
    });

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

    await chrome.storage.local.set({
        captures: updatedCaptures
    });

    statusMessage.textContent = "Updated breadcrumb note.";

    closeEditPanel();
    await renderCaptures();
}


async function exportCaptures() {
    const storedData = await chrome.storage.local.get({
        captures: [],
        collections: []
    });

    if (storedData.captures.length === 0) {
        statusMessage.textContent = "Save a breadcrumb before exporting."
        return;
    }

    const backup = {
        app: "Breadcrumb",
        version: 1,
        exportedAt: new Date().toISOString(),
        collections: storedData.collections,
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

        const validCollections = Array.isArray(backup.collections)
            ? backup.collections.filter(isValidCollection)
            : [];

        const storedData = await chrome.storage.local.get({
            captures: [],
            collections: []
        });

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


function isValidCollection(collection) {
    return (
        typeof collection.id === "string" &&
        typeof collection.name === "string"
    );
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
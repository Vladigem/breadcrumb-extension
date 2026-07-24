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


let editingCaptureId = null;


noteInput.addEventListener("input", updateNoteCount);
searchInput.addEventListener("input", renderCaptures);

editNoteInput.addEventListener("input", updateEditNoteCount);

cancelEditButton.addEventListener("click", closeEditPanel);

saveEditButton.addEventListener("click", saveEditedNote);


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

    captureCount.textContent = `${captures.length} saved`;
    captureList.innerHTML = "";

    if (matchingCaptures.length === 0) {
        emptyMessage.hidden = false;

        if (captures.length === 0) {
            emptyMessage.textContent =
                "Nothing saved yet. Your trail starts here.";
        } else {
            emptyMessage.textContent = "No saved breadcrumbs match that search."
        }

        return;
    }

    emptyMessage.hidden = true;

    for (const capture of matchingCaptures) {
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

    const displayTime = capture.updateAt || capture.savedAt;
    const savedTime = new Date(displayTime);

    const date = document.creatElement("p");
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


function updateEditNoteCount() {
    editNoteCount.textContent = `${editNoteInput.value.length} / 240`;
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
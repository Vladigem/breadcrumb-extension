const saveButton = document.querySelector("#save-button");
const clearButton = document.querySelector("#clear-button");
const noteInput = document.querySelector("#note-input");
const noteCount = document.querySelector("#note-count");
const searchInput = document.querySelector("#search-input");
const statusMessage = document.querySelector("#status-message");
const captureCount = document.querySelector("#capture-count");
const emptyMessage = document.querySelector("#empty-message");
const captureList = document.querySelector("#capture-list");


noteInput.addEventListener("input", updateNoteCount);
searchInput.addEventListener("input", renderCaptures);


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
            text: selectedText,
            note: noteInput.value.trim(),
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

    const source = document.createElement("a");
    source.href = capture.url;
    source.target = "_blank";
    source.textContent = capture.title;

    const savedTime = new Date(capture.savedAt);

    const date = document.createElement("p");
    date.id = "saved-date";
    date.textContent = `Saved ${savedTime.toLocaleString()}`;

    card.append(quote);

    if (capture.note) {
        card.append(note);
    }

    card.append(source);
    card.append(date);

    return card;
}


function updateNoteCount() {
    noteCount.textContent = `${noteInput.value.length} / 240`;
}


function getSelectedText() {
    return window.getSelection().toString()
}


updateNoteCount();
renderCaptures();
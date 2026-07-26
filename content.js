const reminderId = "breadcrumb-revisit-reminder";
const quickCaptureButtonId = "breadcrumb-quick-capture-button";
const quickCapturePanelId = "breadcrumb-quick-capture-panel";


async function showRevisitReminder() {
    if (document.querySelector(`#${reminderId}`)) {
        return;
    }

    const storedData = await chrome.storage.local.get({
        captures: [],
        remindersEnabled: true
    });

    if (!storedData.remindersEnabled) {
        return;
    }

    const currentPageUrl = getPageUrl(window.location.href);

    const matchingCaptures = storedData.captures.filter(function (capture) {
        return getPageUrl(capture.url) === currentPageUrl;
    });

    if (matchingCaptures.length === 0) {
        return;
    }

    const latestCapture = matchingCaptures[0];

    const reminder = document.createElement("aside");
    reminder.id = reminderId;

    const heading = document.createElement("p");
    heading.className = "breadcrumb-reminder-heading";
    heading.textContent = "BREADCRUMB REMINDER";

    const message = document.createElement("p");
    message.className = "breadcrumb-reminder-message";

    if (matchingCaptures.length === 1) {
        message.textContent = "You already saved a breadcrumb from this page.";
    } else {
        message.textContent =
            `You saved ${matchingCaptures.length} breadcrumbs from this page. Here is the latest:`;
    }

    const quote = document.createElement("blockquote");
    quote.className = "breadcrumb-reminder-quote";
    quote.textContent = `"${shortenText(latestCapture.text, 170)}"`;

    const note = document.createElement("p");
    note.className = "breadcrumb-reminder-note";
    note.textContent = latestCapture.note || "";

    const tags = document.createElement("div");
    tags.className = "breadcrumb-reminder-tags";

    for (const tag of latestCapture.tags || []) {
        const tagLabel = document.createElement("span");
        tagLabel.textContent = `#${tag}`;
        tags.append(tagLabel);
    }

    const closeButton = document.createElement("button");
    closeButton.className = "breadcrumb-reminder-close";
    closeButton.textContent = "Got it";

    closeButton.addEventListener("click", function () {
        reminder.remove();
    });

    reminder.append(heading);
    reminder.append(message);
    reminder.append(quote);

    if (latestCapture.note) {
        reminder.append(note);
    }

    if (latestCapture.tags && latestCapture.tags.length > 0) {
        reminder.append(tags);
    }

    reminder.append(closeButton);

    document.body.append(reminder);
}


function showQuickCaptureButton() {
    if (document.querySelector(`#${quickCapturePanelId}`)) {
        return;
    }

    removeQuickCaptureButton();

    const selectedText = window.getSelection().toString().trim();

    if (selectedText === "") {
        return;
    }

    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    const rectangle = range.getBoundingClientRect();

    const button = document.createElement("button");
    button.id = quickCaptureButtonId;
    button.textContent = "Save to Breadcrumb";

    const top = Math.min(window.innerHeight - 46, rectangle.bottom + 8);
    const left = Math.min(window.innerWidth - 170, rectangle.left);

    button.style.top = `${Math.max(12, top)}px`;
    button.style.left = `${Math.max(12, left)}px`;

    button.addEventListener("click", function () {
        openQuickCapturePanel(selectedText, left, top);
    });

    document.body.append(button);
}


function removeQuickCaptureButton() {
    const existingButton = document.querySelector(
        `#${quickCaptureButtonId}`
    );

    if (existingButton) {
        existingButton.remove();
    }
}


function openQuickCapturePanel(selectedText, left, top) {
    removeQuickCaptureButton();

    const panel = document.createElement("aside");
    panel.id = quickCapturePanelId;

    panel.style.top = `${Math.max(12, top)}px`;
    panel.style.left = `${Math.max(12, left)}px`;

    const heading = document.createElement("p");
    heading.className = "breadcrumb-quick-heading";
    heading.textContent = "SAVE BREADCRUMB";

    const quote = document.createElement("blockquote");
    quote.className = "breadcrumb-quick-quote";
    quote.textContent = `"${shortenText(selectedText, 170)}"`;

    const noteInput = document.createElement("textarea");
    noteInput.className = "breadcrumb-quick-note";
    noteInput.maxLength = 240;
    noteInput.placeholder = "Why is this useful? (optional)";

    const saveButton = document.createElement("button");
    saveButton.className = "breadcrumb-quick-save";
    saveButton.textContent = "Save";

    const cancelButton = document.createElement("button");
    cancelButton.className = "breadcrumb-quick-cancel";
    cancelButton.textContent = "Cancel";

    cancelButton.addEventListener("click", function () {
        panel.remove();
    });

    saveButton.addEventListener("click", async function () {
        await saveQuickCapture(selectedText, noteInput.value.trim());

        saveButton.textContent = "Saved";
        saveButton.disabled = true;

        window.setTimeout(function () {
            panel.remove();
        }, 700);
    });

    const actions = document.createElement("div");
    actions.className = "breadcrumb-quick-actions";
    actions.append(saveButton);
    actions.append(cancelButton);

    panel.append(heading);
    panel.append(quote);
    panel.append(noteInput);
    panel.append(actions);

    document.body.append(panel);

    noteInput.focus();
}


async function saveQuickCapture(text, note) {
    const storedData = await chrome.storage.local.get({
        captures: []
    });

    const capture = {
        id: crypto.randomUUID(),
        favourite: false,
        collectionId: null,
        text: text,
        note: note,
        tags: [],
        title: document.title,
        url: window.location.href,
        savedAt: new Date().toISOString()
    };

    storedData.captures.unshift(capture);

    await chrome.storage.local.set({
        captures: storedData.captures
    });
}


function shortenText(text, maximumLength) {
    if (text.length <= maximumLength) {
        return text;
    }

    return `${text.slice(0, maximumLength)}...`;
}


function getPageUrl(url) {
    const pageUrl = new URL(url);

    pageUrl.hash = "";

    return pageUrl.href;
}

document.addEventListener("mouseup", function () {
    window.setTimeout(showQuickCaptureButton, 0);
});


document.addEventListener("keyup", function () {
    window.setTimeout(showQuickCaptureButton, 0);
});


document.addEventListener("mousedown", function (event) {
    const clickedQuickButton = event.target.closest(
        `#${quickCaptureButtonId}`
    );

    const clickedQuickPanel = event.target.closest(
        `#${quickCapturePanelId}`
    );

    if (!clickedQuickButton && !clickedQuickPanel) {
        removeQuickCaptureButton();
    }
});


showRevisitReminder();
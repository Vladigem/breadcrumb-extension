const reminderId = "breadcrumb-revisit-reminder";


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


showRevisitReminder();
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

    const reminder = document.createElement("aside");
    reminder.id = reminderId;

    const heading = document.createElement("p");
    heading.className = "breadcrumb-reminder-heading";
    heading.textContent = "BREADCRUMB REMINDER";

    const message = document.createElement("p");
    message.className = "breadcrumb-reminder-message";

    if (matchingCaptures.length === 1) {
        message.textContent = "You already saved 1 breadcrumb from this page.";
    } else {
        message.textContent =
            `You already saved ${matchingCaptures.length} breadcrumbs from this page.`;
    }

    const closeButton = document.createElement("button");
    closeButton.className = "breadcrumb-reminder-close";
    closeButton.textContent = "Got it";

    closeButton.addEventListener("click", function () {
        reminder.remove();
    });

    reminder.append(heading);
    reminder.append(message);
    reminder.append(closeButton);

    document.body.append(reminder);
}


function getPageUrl(url) {
    const pageUrl = new URL(url);

    pageUrl.hash = "";
    return pageUrl.href;
}


showRevisitReminder();
import {
    formatTimelineDate
} from "./capture-utils.js";


export function renderCaptureCards(
    captures,
    collections,
    captureList,
    captureActions
) {
    for (const capture of captures) {
        const card = createCaptureCard(
            capture,
            collections,
            captureActions
        );

        captureList.append(card);
    }
}


export function renderTimeline(
    captures,
    collections,
    captureList,
    captureActions
) {
    const timelineCaptures = [...captures].sort(function (
        firstCapture,
        secondCapture
    ) {
        return (
            new Date(secondCapture.savedAt) -
            new Date(firstCapture.savedAt)
        );
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

            const card = createCaptureCard(
                capture,
                collections,
                captureActions
            );

            item.append(card);
            items.append(item);
        }

        group.append(dateHeading);
        group.append(items);
        captureList.append(group);
    }
}


function createCaptureCard(
    capture,
    collections,
    captureActions
) {
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
            captureActions.filterByTag(tag);
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
        await captureActions.toggleFavourite(capture.id);
    });

    const editButton = document.createElement("button");
    editButton.className = "edit-button";
    editButton.textContent = "Edit note";

    editButton.addEventListener("click", function () {
        captureActions.startEditing(capture);
    });

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-button";
    deleteButton.textContent = "Delete";

    deleteButton.addEventListener("click", async function () {
        await captureActions.deleteCapture(capture.id);
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
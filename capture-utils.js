export function getPageUrl(url) {
    const pageUrl = new URL(url);

    pageUrl.hash = "";

    return pageUrl.href;
}


export function getTags(tagText) {
    const tags = tagText.split(",").map(function (tag) {
        return tag.trim().toLowerCase();
    });

    const nonEmptyTags = tags.filter(function (tag) {
        return tag !== "";
    });

    return [...new Set(nonEmptyTags)];
}


export function sortCaptures(captures, sortMode) {
    const sortedCaptures = [...captures];

    if (sortMode === "oldest") {
        sortedCaptures.sort(function (firstCapture, secondCapture) {
            return (
                new Date(firstCapture.savedAt) -
                new Date(secondCapture.savedAt)
            );
        });
    } else if (sortMode === "favourites") {
        sortedCaptures.sort(function (firstCapture, secondCapture) {
            const favouriteDifference =
                Number(secondCapture.favourite) -
                Number(firstCapture.favourite);

            if (favouriteDifference !== 0) {
                return favouriteDifference;
            }

            return (
                new Date(secondCapture.savedAt) -
                new Date(firstCapture.savedAt)
            );
        });
    } else {
        sortedCaptures.sort(function (firstCapture, secondCapture) {
            return (
                new Date(secondCapture.savedAt) -
                new Date(firstCapture.savedAt)
            );
        });
    }

    return sortedCaptures;
}

export function filterCaptures(captures, filters) {
    return captures.filter(function (capture) {
        const searchableText = `
            ${capture.text}
            ${capture.note || ""}
            ${capture.title}
            ${capture.url}
            ${(capture.tags || []).join(" ")}
        `.toLowerCase();

        const matchesSearch =
            searchableText.includes(filters.searchTerm);

        const matchesTag =
            filters.selectedTag === null ||
            (capture.tags || []).includes(filters.selectedTag);

        const matchesFavourite =
            !filters.showFavouritesOnly ||
            capture.favourite === true;

        const matchesCollection =
            filters.collectionId === "" ||
            capture.collectionId === filters.collectionId;

        const matchesPage =
            filters.currentPageFilterUrl === null ||
            getPageUrl(capture.url) === filters.currentPageFilterUrl;

        const captureType = capture.type || "highlight";

        const matchesType =
            filters.captureType === "" ||
            captureType === filters.captureType;

        return (
            matchesSearch &&
            matchesTag &&
            matchesFavourite &&
            matchesCollection &&
            matchesPage &&
            matchesType
        );
    });
}


export function formatTimelineDate(dateText) {
    const date = new Date(dateText);

    return date.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric"
    });
}


export function isValidCollection(collection) {
    return (
        typeof collection.id === "string" &&
        typeof collection.name === "string"
    );
}


export function isValidCapture(capture) {
    return (
        typeof capture.id === "string" &&
        typeof capture.text === "string" &&
        typeof capture.title === "string" &&
        typeof capture.url === "string" &&
        typeof capture.savedAt === "string"
    );
}
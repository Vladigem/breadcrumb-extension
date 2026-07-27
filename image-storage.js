const databaseName = "breadcrumb-media";
const databaseVersion = 2;
const screenshotStore = "screenshots";

function openImageDatabase() {
    return new Promise(function (resolve, reject) {
        const request = indexedDB.open(
            databaseName,
            databaseVersion
        );

        request.onupgradeneeded = function () {
            const database = request.result;

            if (
                !database.objectStoreNames.contains(
                    screenshotStore
                )
            ) {
                database.createObjectStore(screenshotStore);
            }
        };

        request.onsuccess = function () {
            resolve(request.result);
        };

        request.onerror = function () {
            reject(request.error);
        };
    });
}


export async function saveScreenshot(id, imageData) {
    const database = await openImageDatabase();

    return new Promise(function (resolve, reject) {
        const transaction = database.transaction(
            screenshotStore,
            "readwrite"
        );

        transaction
            .objectStore(screenshotStore)
            .put(imageData, id);

        transaction.oncomplete = function () {
            database.close();
            resolve();
        };

        transaction.onerror = function () {
            database.close();
            reject(transaction.error);
        };
    });
}


export async function loadScreenshot(id) {
    const database = await openImageDatabase();

    return new Promise(function (resolve, reject) {
        const transaction = database.transaction(
            screenshotStore,
            "readonly"
        );

        const request = transaction
            .objectStore(screenshotStore)
            .get(id);

        request.onsuccess = function () {
            database.close();
            resolve(request.result || null);
        };

        request.onerror = function () {
            database.close();
            reject(request.error);
        };
    });
}


export async function deleteScreenshot(id) {
    const database = await openImageDatabase();

    return new Promise(function (resolve, reject) {
        const transaction = database.transaction(
            screenshotStore,
            "readwrite"
        );

        transaction
            .objectStore(screenshotStore)
            .delete(id);

        transaction.oncomplete = function () {
            database.close();
            resolve();
        };

        transaction.onerror = function () {
            database.close();
            reject(transaction.error);
        };
    });
}


export async function clearScreenshots() {
    const database = await openImageDatabase();

    return new Promise(function (resolve, reject) {
        const transaction = database.transaction(
            screenshotStore,
            "readwrite"
        );

        transaction
            .objectStore(screenshotStore)
            .clear();

        transaction.oncomplete = function () {
            database.close();
            resolve();
        };

        transaction.onerror = function () {
            database.close();
            reject(transaction.error);
        };
    });
}
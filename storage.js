export async function loadStoredData() {
    return chrome.storage.local.get({
        captures: [],
        collections: [],
        remindersEnabled: true
    });
}


export async function updateStoredData(changes) {
    await chrome.storage.local.set(changes);
}


export async function removeStoredData(key) {
    await chrome.storage.local.remove(key);
}
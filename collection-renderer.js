export function renderCollectionControls(
    collections,
    collectionControls
) {
    renderCollectionOptions(
        collectionControls.saveSelect,
        collections,
        "No collection"
    );

    renderCollectionOptions(
        collectionControls.editSelect,
        collections,
        "No collection"
    );

    renderCollectionOptions(
        collectionControls.filterSelect,
        collections,
        "All collections"
    );
}


export function renderCollectionManager(
    collections,
    collectionManager,
    deleteCollection
) {
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


function renderCollectionOptions(
    select,
    collections,
    emptyLabel
) {
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

    const collectionStillExists = collections.some(function (
        collection
    ) {
        return collection.id === selectedValue;
    });

    if (collectionStillExists) {
        select.value = selectedValue;
    } else {
        select.value = "";
    }
}
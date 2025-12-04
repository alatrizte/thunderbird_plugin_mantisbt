document.getElementById("options").addEventListener("submit", async e => {
    e.preventDefault();
    await messenger.storage.sync.set({
        mantisUrl: document.getElementById("mantisUrl").value.trim().replace(/\/+$/, ""),
        mantisToken: document.getElementById("mantisToken").value
    });
    alert("Guardado!");
    window.close();
});

// Cargar valores guardados
messenger.storage.sync.get(["mantisUrl", "mantisToken"]).then(data => {
    if (data.mantisUrl) document.getElementById("mantisUrl").value = data.mantisUrl;
    if (data.mantisToken) document.getElementById("mantisToken").value = data.mantisToken;
});
document.getElementById("options").addEventListener("submit", async e => {
    e.preventDefault();
    await messenger.storage.sync.set({
        mantisUrl: document.getElementById("mantisUrl").value.trim().replace(/\/+$/, ""),
        mantisToken: document.getElementById("mantisToken").value,
        mantisProjects: document.getElementById("mantisProjects").value.trim()
    });
    alert("Guardado!");
    window.close();
});

// Cargar valores guardados
messenger.storage.sync.get(["mantisUrl", "mantisToken", "mantisProjects"]).then(data => {
    if (data.mantisUrl) document.getElementById("mantisUrl").value = data.mantisUrl;
    if (data.mantisToken) document.getElementById("mantisToken").value = data.mantisToken;
    if (data.mantisProjects) document.getElementById("mantisProjects").value = data.mantisProjects;
});
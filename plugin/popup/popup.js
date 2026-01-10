document.addEventListener("DOMContentLoaded", async () => {
    const select = document.getElementById("project");
    const sendBtn = document.getElementById("send");

    const config = await messenger.storage.sync.get(["mantisProjects"]);

    let [tab] = await messenger.tabs.query({ active: true, currentWindow: true });
    let message = await messenger.messageDisplay.getDisplayedMessage(tab.id);

    // Intentamos obtener proyecto desde libreta
    const fromHeader = message.author || "";
    const emailMatch = fromHeader.match(/<(.+?)>/);
    const email = emailMatch ? emailMatch[1] : fromHeader;
    const autoProject = await getProjectFromAddressBook(email);

    console.log("Proyecto automático desde libreta:", autoProject);

    if (autoProject) {
        // Llamamos al background con el proyecto elegido
        await messenger.runtime.sendMessage({
            action: "sendToMantis",
            projectFromPopup: autoProject
        });

        window.close();
    }

    if (!config.mantisProjects) {
        alert("No hay proyectos configurados. Ve a las opciones del complemento para añadirlos.");
        return;
    }

    // "Proyecto1,Proyecto2,Proyecto3"
    const projects = config.mantisProjects
        .split(",")
        .map(p => p.trim())
        .filter(Boolean);

    for (const project of projects) {
        const opt = document.createElement("option");
        opt.value = project;
        opt.textContent = project;
        select.appendChild(opt);
    }

    sendBtn.addEventListener("click", async () => {
        const projectName = select.value;

        if (!projectName) {
            alert("Selecciona un proyecto");
            return;
        }

        // Llamamos al background con el proyecto elegido
        await messenger.runtime.sendMessage({
            action: "sendToMantis",
            projectFromPopup: projectName
        });

        window.close();
    });
});

async function getProjectFromAddressBook(email) {
    const contacts = await messenger.contacts.quickSearch(email);

    for (const contact of contacts) {
        if (contact.properties.Custom1 && contact.properties.Custom1.trim()) {
            return contact.properties.Custom1.trim(); // ← Proyecto Mantis
        }
    }

    return null;
}

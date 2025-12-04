// background.js
async function sendToMantis() {
    let [tab] = await messenger.tabs.query({ active: true, currentWindow: true });
    let message = await messenger.messageDisplay.getDisplayedMessage(tab.id);

    if (!message) {
        alert("No hay correo abierto o seleccionado");
        return;
    }

    let full = await messenger.messages.getFull(message.id);
    // Extraemos el mejor cuerpo de texto posible
    let rawBody = await extractBestTextBody(full);

    const config = await messenger.storage.sync.get([
        "mantisUrl",
        "mantisToken"
    ]);

    if (!config.mantisUrl || !config.mantisToken) {
        alert("Configura tu URL y token en las opciones del complemento");
        messenger.runtime.openOptionsPage();
        return;
    }

    try {
        const resp = await fetch(`${config.mantisUrl}/api/mantis-proxy.php`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": config.mantisToken // opcional si tu proxy no lo pide
            },
            body: JSON.stringify({
                mantis_url: config.mantisUrl,     // importante: le pasas la URL base
                token: config.mantisToken,
                summary: `[MAIL] ${full.headers.subject?.[0] || "Sin asunto"}`,
                description: `${rawBody}`,
                project_id: 1,
                category_id: 1
            })
        });

        if (resp.ok) {
            const data = await resp.json();
            const issueId = data.issues?.[0]?.id || data.issue?.id;
            notify(`Tarea creada: #${issueId}`);
        } else {
            notify(`Error: ${resp.status} ${await resp.text()}`);
        }
    } catch (e) {
        notify("Error de red: " + e.message);
    }
}

/**
 * Busca recursivamente la mejor parte de texto plano en un mensaje completo (getFull)
 * Prioridad: text/plain > text/html (convertido) > cualquier otra cosa
 */
async function extractBestTextBody(partsOrMessage, maxLength = 30000) {
    // Si no es un array de partes, lo convertimos (puede venir message directamente)
    let parts = Array.isArray(partsOrMessage) ? partsOrMessage : partsOrMessage.parts || [];

    let plainText = "";
    let htmlText = "";

    function traverse(part) {
        if (!part) return;

        // Si es una parte con subpartes (multipart)
        if (part.parts && part.parts.length > 0) {
            part.parts.forEach(traverse);
            return;
        }

        // Si tiene body y contentType
        if (part.body && part.contentType) {
            const ct = part.contentType.toLowerCase();

            if (ct.startsWith("text/plain")) {
                // ¡Encontramos texto plano! Prioridad máxima
                if (part.body.length > plainText.length) {
                    plainText = part.body;
                }
            } else if (ct.startsWith("text/html") && !plainText) {
                // Guardamos HTML solo si aún no tenemos texto plano
                if (part.body.length > htmlText.length) {
                    htmlText = part.body;
                }
            }
        }
    }

    parts.forEach(traverse);

    let finalText = plainText || htmlText || "Sin contenido";

    // Si solo tenemos HTML, lo limpiamos
    if (!plainText && htmlText) {
        // Quitamos etiquetas HTML + entidades + espacios extra
        finalText = htmlText
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')  // elimina <style>
            .replace(/<[^>]+>/g, ' ')                        // elimina todas las etiquetas
            .replace(/&[a-z]+;/gi, ' ')                      // entidades como &nbsp;
            .replace(/\s+/g, ' ')                            // colapsa espacios
            .trim();
    }

    // Limitamos longitud (MantisBT suele tener límite ~32k)
    return finalText.substring(0, maxLength);
}

function notify(text) {
    messenger.notifications.create({
        type: "basic",
        iconUrl: "icons/mantis-48.png",
        title: "MantisBT",
        message: text
    });
}

// Atajo de teclado y botón contextual
messenger.commands.onCommand.addListener(command => {
    if (command === "send-to-mantis") sendToMantis();
});

messenger.messageDisplayAction.onClicked.addListener(sendToMantis);
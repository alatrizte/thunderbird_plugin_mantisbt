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
        // === 1. Procesar adjuntos (versión que SÍ encuentra tu octet-stream) ===
        const attachments = [];

        async function findAttachmentsRecursively(parts) {
            for (const part of parts) {
                console.log(`Analizando parte: partName=${part.partName}, contentType=${part.contentType}, filename=${part.filename}, name=${part.name}`); // DEBUG: mira esto en consola

                // Si es contenedor, buceamos
                if (part.parts && part.parts.length > 0) {
                    await findAttachmentsRecursively(part.parts);
                    continue;
                }

                // CLAVE: adjunto si NO es texto/HTML/multipart Y tiene partName (para getAttachmentFile)
                const isTextOrHtml = part.contentType?.startsWith('text/') || part.contentType?.startsWith('multipart/');
                if (!isTextOrHtml && part.partName) {
                    // Prioridad: filename > name > "sin_nombre"
                    const fileName = part.filename || part.name || "archivo_sin_nombre";
                    
                    try {
                        console.log(`¡ADJUNTO DETECTADO! ${fileName} (${part.contentType})`);
                        const file = await messenger.messages.getAttachmentFile(message.id, part.partName);
                        const arrayBuffer = await file.arrayBuffer();
                        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

                        attachments.push({
                            name: fileName,
                            content_type: part.contentType || "application/octet-stream",
                            content: base64
                        });
                    } catch (err) {
                        console.error(`Error cargando ${fileName}:`, err);
                    }
                }
            }
        }

        // Lanzamos
        if (full.parts && full.parts.length > 0) {
            console.log("Iniciando búsqueda en parts...");
            await findAttachmentsRecursively(full.parts);
        }

        const resp = await fetch(`${config.mantisUrl}/api/mantis-proxy.php`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                // "Authorization": config.mantisToken // opcional si tu proxy no lo pide
            },
            body: JSON.stringify({
                mantis_url: config.mantisUrl,     // importante: le pasas la URL base
                token: config.mantisToken,
                summary: `[MAIL] ${full.headers.subject?.[0] || "Sin asunto"}`,
                description: `${rawBody}`,
                project_id: 1,
                category_id: 1,
                files: attachments
            })
        });

        if (resp.ok) {
            const data = await resp.json();
            const issueId = data.issues?.[0]?.id || data.issue?.id;
            notify(`Tarea creada: #${issueId} ${attachments.length ? `(${attachments.length} adjunto${attachments.length > 1 ? 's' : ''})` : ''}`);
        } else { 
            notify(`Error: ${resp.status} ${await resp.text()}`);
            console.log("Error al intentar crear tarea:", await resp.text());
        }
    } catch (e) {
        console.log("Error al crear tarea:", e.message);
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
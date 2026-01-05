# Plugin MantisBT para Thunderbird

Una extensión web de Thunderbird que convierte correos electrónicos seleccionados en incidencias de MantisBT con un solo clic.

## Descripción General

Este plugin agiliza el seguimiento de incidencias permitiéndote crear incidencias de MantisBT directamente desde los correos de Thunderbird. Extrae el asunto y el cuerpo del correo, luego los envía a tu instancia de MantisBT a través de un proxy PHP ligero.

## Características

- **Creación de incidencias con un clic** desde cualquier correo de Thunderbird
- **Soporte de atajo de teclado** (`Ctrl+Shift+M`)
- **Extracción automática de mensajes** con conversión de HTML a texto
- **URL y token de autenticación de MantisBT configurables**
- **Proxy local** para comunicación segura con la API

## Arquitectura

- **`plugin/`** — Extensión web de Thunderbird (manifest, lógica de fondo, interfaz)
- **`mantis_proxi/mantis-proxy.php`** — Proxy PHP que autentica solicitudes a la API REST de MantisBT
- **Almacenamiento** — Credenciales almacenadas localmente en el almacenamiento sincronizado de Thunderbird

## Instalación

### Requisitos Previos

- Thunderbird (se recomienda la última versión)
- Una instancia de MantisBT con API REST habilitada
- Servidor web con PHP habilitado para el proxy

### Pasos de Configuración

1. **Carga la extensión en Thunderbird**:
    - Abre Thunderbird → Configuración → Extensiones y Temas
    - Haz clic en el icono de engranaje → "Depurar complementos"
    - Haz clic en "Cargar complemento temporal" y selecciona `plugin/manifest.json`

2. **Despliega el proxy PHP**:
    - Coloca `mantis_proxi/mantis-proxy.php` en tu servidor web PHP
    - Actualiza la constante `$token` en el proxy para que coincida con tu token de API de MantisBT
    - Anota la URL del proxy (ej: `http://localhost/mantis-proxy.php`)

3. **Configura el plugin**:
    - Haz clic derecho en el icono del plugin → "Administrar extensión" → "Opciones"
    - Ingresa tu **URL de MantisBT** (ej: `http://localhost`)
    - Ingresa tu **Token de API de MantisBT**
    - Guarda

4. **Verifica la conectividad**:
    - Comprueba que `mantis_proxi/mantis-proxy.php` tenga el token correcto
    - Asegúrate de que tu instancia de MantisBT sea accesible desde Thunderbird

## Uso

- **Botón de barra de herramientas**: Haz clic en el icono de MantisBT en cualquier correo para crear una incidencia
- **Atajo de teclado**: Presiona `Ctrl+Shift+M` mientras ves un correo
- El asunto del correo se convierte en el resumen de la incidencia
- El cuerpo del correo se convierte en la descripción de la incidencia
- Las incidencias se crean en **Proyecto 1**, **Categoría: General** (personalizable en el código)

## Solución de Problemas

| Problema | Solución |
|----------|----------|
| "Error: 401" o "Error: 403" | Verifica que el `$token` del proxy coincida con tu token de MantisBT y que el token de la extensión esté guardado correctamente |
| Errores de red | Verifica que la URL de MantisBT sea correcta y que el proxy esté ejecutándose en tu servidor PHP |
| Texto distorsionado | Consulta la consola del navegador (`Ctrl+Shift+K`) para errores de extracción |

## Desarrollo

No hay paso de compilación requerido—los archivos son estáticos. Para probar localmente:
1. Carga la extensión en Thunderbird como se describe en Instalación
2. Abre la consola del navegador (`Ctrl+Shift+K`) para ver los logs de `background.js`
3. Verifica los logs del servidor PHP para `mantis-proxy.php`
4. Modifica el código según sea necesario y recarga la extensión

## Licencia

MIT

## Contribuciones

Las contribuciones son bienvenidas. Por favor, abre un issue o pull request con tus cambios.
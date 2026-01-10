<?php
header("Content-Type: application/json");
header('Access-Control-Allow-Headers: Authorization, Content-Type');

$input = file_get_contents("php://input");
$data  = json_decode($input, true);

if (!$data) {
    http_response_code(400);
    echo json_encode(["error" => "JSON inválido"]);
    exit;
}

// Buscar el id del proyecto
$projectName = $data["project_id"] ?? null;

if (!$projectName) {
    http_response_code(400);
    echo json_encode(["error" => "project_id requerido"]);
    exit;
}

// --- 1️⃣ Pedimos proyectos a Mantis ---
$projectsUrl = "http://localhost/mantisbt/api/rest/index.php/projects";

$ch = curl_init($projectsUrl);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        "Authorization: " . $data["token"],
        "Content-Type: application/json",
        "User-Agent: mantisbt-rest"
    ],
]);

$projectsResp = curl_exec($ch);
$httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpcode !== 200) {
    http_response_code(500);
    echo json_encode(["error" => "Error obteniendo proyectos"]);
    exit;
}

$projectsData = json_decode($projectsResp, true);
$projectId = null;

foreach ($projectsData["projects"] as $project) {
    if (strcasecmp($project["name"], $projectName) === 0) {
        $projectId = $project["id"];
        break;
    }
}

if (!$projectId) {
    http_response_code(404);
    echo json_encode([
        "error" => "Proyecto no encontrado",
        "project_name" => $projectName
    ]);
    exit;
}

$payload = [
    "summary"     => $data["summary"] ?? "Issue desde frontend – FUNCIONA",
    "description" => $data["description"] ?? "¡Por fin!",
    "project"     => ["id" => $projectId],
    "category"    => ["name" => "General"],
    "files"       => array_map(function ($f) {
        return [
            "name"         => $f["name"],
            "content"      => $f["content"],
            "content_type" => $f["content_type"] ?? "application/octet-stream"
        ];
    }, $data["files"] ?? [])
];

$url = "http://localhost/mantisbt/api/rest/index.php/issues";

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => json_encode($payload),
    CURLOPT_HTTPHEADER     => [
        "Authorization: " . $data["token"],
        "Content-Type: application/json",
        "User-Agent: mantisbt-rest"          // ← ESTA LÍNEA ES LA QUE LO ARREGLA TODO
    ],
]);

$response = curl_exec($ch);
$httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

http_response_code($httpcode);
echo $response;

?>
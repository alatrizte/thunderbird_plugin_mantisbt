<?php
header("Content-Type: application/json");
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type');

$token = 'Y_gWGcWtMQBPjHA2Q2n8HKYFmaNFr1tC';
$input = file_get_contents("php://input");
$data  = json_decode($input, true);

if (!$data) {
    http_response_code(400);
    echo json_encode(["error" => "JSON inválido"]);
    exit;
}

$payload = [
    "summary"     => $data["summary"] ?? "Issue desde frontend – FUNCIONA",
    "description" => $data["description"] ?? "¡Por fin!",
    "project"     => ["id" => 1],
    "category"    => ["name" => "General"]
];

$url = "http://localhost/mantisbt/api/rest/index.php/issues";

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => json_encode($payload),
    CURLOPT_HTTPHEADER     => [
        "Authorization: $token",
        "Content-Type: application/json",
        "User-Agent: mantisbt-rest"          // ← ESTA LÍNEA ES LA QUE LO ARREGLA TODO
    ],
]);

$response = curl_exec($ch);
$httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

http_response_code($httpcode);
echo $response;
<?php
/**
 * Vérifie si un email est banni de la plateforme B404.
 *
 * POST /api/check-email.php
 * Body: { "email": "user@example.com" }
 * Retour: 200 { "ok": true } | 403 { "message": "..." } | 400 { "message": "..." }
 */

require_once __DIR__ . '/config.php';

sendCorsHeaders();
handlePreflight();
requirePost();

$data = getJsonBody();
$email = isset($data['email']) && is_string($data['email'])
    ? trim(strtolower($data['email']))
    : '';

if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['message' => 'Adresse e-mail invalide.']);
    exit;
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
    http_response_code(500);
    echo json_encode(['message' => 'Service non configuré côté serveur.']);
    exit;
}

$result = supabaseServiceQuery(
    'GET',
    '/rest/v1/banned_emails?email=eq.' . rawurlencode($email) . '&select=email'
);

if ($result['error']) {
    logB404Error('check-email: ' . $result['error']);
    http_response_code(200);
    echo json_encode(['ok' => true]);
    exit;
}

$isBanned = is_array($result['data']) && count($result['data']) > 0;

if ($isBanned) {
    http_response_code(403);
    echo json_encode(['message' => 'Cette adresse e-mail ne peut pas créer de compte B404.']);
    exit;
}

http_response_code(200);
echo json_encode(['ok' => true]);

<?php
/**
 * Inscrit un utilisateur à un événement B404.
 *
 * POST /api/event-register.php
 * Headers: Authorization: Bearer <supabase_token>
 * Body: { "eventId": "uuid", "carCategory": "...", "note": "..." }
 * Retour: 200 { "message": "...", "registration": {...} }
 */

require_once __DIR__ . '/config.php';

sendCorsHeaders();
handlePreflight();
requirePost();

$token = getBearerToken();
$user = verifySupabaseToken($token);

if (!$user) {
    http_response_code(401);
    echo json_encode(['message' => 'Connexion requise.']);
    exit;
}

$data = getJsonBody();
$eventId = isset($data['eventId']) && is_string($data['eventId']) ? trim($data['eventId']) : '';
$carCategory = isset($data['carCategory']) && is_string($data['carCategory'])
    ? mb_substr(trim($data['carCategory']), 0, 80)
    : '';
$note = isset($data['note']) && is_string($data['note'])
    ? mb_substr(trim($data['note']), 0, 500)
    : '';

if (!$eventId) {
    http_response_code(400);
    echo json_encode(['message' => 'Course introuvable.']);
    exit;
}

// Vérifier inscription existante
$existing = supabaseUserQuery(
    'GET',
    '/rest/v1/event_registrations?event_id=eq.' . rawurlencode($eventId)
        . '&user_id=eq.' . rawurlencode($user['id'])
        . '&status=in.(registered,confirmed)&select=id,status',
    $token
);

if (is_array($existing['data']) && count($existing['data']) > 0) {
    http_response_code(409);
    echo json_encode([
        'message' => 'Tu es déjà inscrit à cette course.',
        'registration' => $existing['data'][0],
    ]);
    exit;
}

// Créer l'inscription
$insertPayload = [
    'event_id' => $eventId,
    'user_id' => $user['id'],
    'car_category' => $carCategory ?: null,
    'note' => $note ?: null,
];

$insertResult = supabaseUserQuery(
    'POST',
    '/rest/v1/event_registrations',
    $token,
    $insertPayload
);

if ($insertResult['error'] || $insertResult['status'] >= 400) {
    logB404Error('event-register: ' . ($insertResult['error'] ?? 'HTTP ' . $insertResult['status']));
    http_response_code(400);
    echo json_encode(['message' => "Impossible de s'inscrire."]);
    exit;
}

$registration = is_array($insertResult['data']) && count($insertResult['data']) > 0
    ? $insertResult['data'][0]
    : null;

http_response_code(200);
echo json_encode([
    'message' => 'Inscription enregistrée.',
    'registration' => $registration,
]);

<?php
/**
 * Annule l'inscription d'un utilisateur à un événement B404.
 *
 * POST /api/event-cancel-registration.php
 * Headers: Authorization: Bearer <supabase_token>
 * Body: { "eventId": "uuid" }
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

if (!$eventId) {
    http_response_code(400);
    echo json_encode(['message' => 'Course introuvable.']);
    exit;
}

// Mettre à jour le statut de l'inscription
$now = date('c');
$updatePayload = [
    'status' => 'cancelled',
    'cancelled_at' => $now,
];

$updateResult = supabaseUserQuery(
    'PATCH',
    '/rest/v1/event_registrations?event_id=eq.' . rawurlencode($eventId)
        . '&user_id=eq.' . rawurlencode($user['id'])
        . '&status=in.(registered,confirmed)&select=id,status,cancelled_at',
    $token,
    $updatePayload
);

if ($updateResult['error']) {
    logB404Error('event-cancel: ' . $updateResult['error']);
    http_response_code(400);
    echo json_encode(['message' => "Impossible d'annuler l'inscription."]);
    exit;
}

$registration = is_array($updateResult['data']) && count($updateResult['data']) > 0
    ? $updateResult['data'][0]
    : null;

if (!$registration) {
    http_response_code(404);
    echo json_encode(['message' => "Aucune inscription active à annuler."]);
    exit;
}

http_response_code(200);
echo json_encode([
    'message' => 'Inscription annulée.',
    'registration' => $registration,
]);

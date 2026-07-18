<?php
/**
 * Gestion des inscriptions aux événements (admin/staff).
 *
 * GET  /api/admin-registrations.php?eventId=uuid  → liste des inscriptions
 * POST /api/admin-registrations.php               → ajouter/retirer un inscrit
 *   Body: { "eventId": "...", "userId": "...", "action": "add"|"remove" }
 *
 * Headers: Authorization: Bearer <supabase_token>
 */

require_once __DIR__ . '/config.php';

sendCorsHeaders();
handlePreflight();

$token = getBearerToken();
$user = verifySupabaseToken($token);

if (!$user) {
    http_response_code(401);
    echo json_encode(['message' => 'Connexion requise.']);
    exit;
}

$profile = getUserProfile($user['id']);

if (!$profile || !isStaffUser($profile)) {
    http_response_code(403);
    echo json_encode(['message' => 'Accès staff requis.']);
    exit;
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
    http_response_code(500);
    echo json_encode(['message' => 'SUPABASE_SERVICE_ROLE_KEY est requis côté serveur.']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

// --- GET : lister les inscriptions ---
if ($method === 'GET') {
    $eventId = isset($_GET['eventId']) ? trim($_GET['eventId']) : '';

    if (!$eventId) {
        http_response_code(400);
        echo json_encode(['message' => 'Paramètre eventId requis.']);
        exit;
    }

    $result = supabaseServiceQuery(
        'GET',
        '/rest/v1/event_registrations?event_id=eq.' . rawurlencode($eventId)
            . '&select=*,user_profiles(pseudo,first_name,last_name,email,role)&order=registered_at.desc'
    );

    if ($result['error']) {
        logB404Error('admin-registrations GET: ' . $result['error']);
        http_response_code(500);
        echo json_encode(['message' => $result['error']]);
        exit;
    }

    http_response_code(200);
    echo json_encode(['registrations' => $result['data'] ?? []]);
    exit;
}

// --- POST : ajouter ou retirer un inscrit ---
if ($method === 'POST') {
    $data = getJsonBody();
    $eventId = isset($data['eventId']) && is_string($data['eventId']) ? trim($data['eventId']) : '';
    $userId = isset($data['userId']) && is_string($data['userId']) ? trim($data['userId']) : '';
    $action = isset($data['action']) && is_string($data['action']) ? trim($data['action']) : '';

    if (!$eventId || !$userId) {
        http_response_code(400);
        echo json_encode(['message' => 'Paramètres invalides.']);
        exit;
    }

    if ($action === 'remove') {
        $now = date('c');
        $result = supabaseServiceQuery(
            'PATCH',
            '/rest/v1/event_registrations?event_id=eq.' . rawurlencode($eventId)
                . '&user_id=eq.' . rawurlencode($userId)
                . '&status=in.(registered,confirmed)',
            ['status' => 'cancelled', 'cancelled_at' => $now]
        );

        if ($result['error']) {
            logB404Error('admin-registrations remove: ' . $result['error']);
            http_response_code(500);
            echo json_encode(['message' => $result['error']]);
            exit;
        }

        http_response_code(200);
        echo json_encode(['message' => 'Pilote retiré de la course.']);
        exit;
    }

    // action === 'add'
    $result = supabaseServiceQuery(
        'POST',
        '/rest/v1/event_registrations',
        ['event_id' => $eventId, 'user_id' => $userId, 'status' => 'confirmed']
    );

    if ($result['error']) {
        logB404Error('admin-registrations add: ' . $result['error']);
        http_response_code(500);
        echo json_encode(['message' => $result['error']]);
        exit;
    }

    $registration = is_array($result['data']) && count($result['data']) > 0
        ? $result['data'][0]
        : null;

    http_response_code(200);
    echo json_encode(['message' => 'Pilote ajouté à la course.', 'registration' => $registration]);
    exit;
}

http_response_code(405);
echo json_encode(['message' => 'Méthode non autorisée.']);

<?php
/**
 * Export CSV des inscriptions à un événement (admin/staff).
 *
 * GET /api/admin-registrations-export.php?eventId=uuid
 * Headers: Authorization: Bearer <supabase_token>
 * Retour: text/csv (fichier téléchargeable)
 */

require_once __DIR__ . '/config.php';

sendCorsHeaders();
handlePreflight();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['message' => 'Méthode non autorisée.']);
    exit;
}

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

$eventId = isset($_GET['eventId']) ? trim($_GET['eventId']) : '';

if (!$eventId) {
    http_response_code(400);
    echo json_encode(['message' => 'Paramètre eventId requis.']);
    exit;
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
    http_response_code(500);
    echo json_encode(['message' => 'SUPABASE_SERVICE_ROLE_KEY est requis côté serveur.']);
    exit;
}

$result = supabaseServiceQuery(
    'GET',
    '/rest/v1/event_registrations?event_id=eq.' . rawurlencode($eventId)
        . '&select=status,car_category,registered_at,cancelled_at,user_profiles(pseudo,first_name,last_name,email,role)'
        . '&order=registered_at.desc'
);

if ($result['error']) {
    logB404Error('admin-registrations-export: ' . $result['error']);
    http_response_code(500);
    echo json_encode(['message' => $result['error']]);
    exit;
}

$rows = $result['data'] ?? [];

// Générer le CSV
$csv = "pseudo;prenom;nom;email;role;status;categorie;inscrit_le;annule_le\n";

foreach ($rows as $row) {
    $profile = $row['user_profiles'] ?? [];
    if (is_array($profile) && isset($profile[0])) {
        $profile = $profile[0];
    }
    if (!is_array($profile)) {
        $profile = [];
    }

    $csv .= implode(';', [
        '"' . str_replace('"', '""', $profile['pseudo'] ?? '') . '"',
        '"' . str_replace('"', '""', $profile['first_name'] ?? '') . '"',
        '"' . str_replace('"', '""', $profile['last_name'] ?? '') . '"',
        '"' . str_replace('"', '""', $profile['email'] ?? '') . '"',
        '"' . str_replace('"', '""', $profile['role'] ?? '') . '"',
        '"' . str_replace('"', '""', $row['status'] ?? '') . '"',
        '"' . str_replace('"', '""', $row['car_category'] ?? '') . '"',
        '"' . str_replace('"', '""', $row['registered_at'] ?? '') . '"',
        '"' . str_replace('"', '""', $row['cancelled_at'] ?? '') . '"',
    ]) . "\n";
}

header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="b404-inscriptions-' . $eventId . '.csv"');
echo $csv;

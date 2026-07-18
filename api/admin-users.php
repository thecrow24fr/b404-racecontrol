<?php
/**
 * Gestion des utilisateurs B404 (admin uniquement).
 *
 * GET   /api/admin-users.php              → liste des utilisateurs
 * PATCH /api/admin-users.php              → modifier rôle/suspension/ban
 *        Body: { "userId": "...", "role"?: "...", "isSuspended"?: bool, "isBanned"?: bool }
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

if (!$profile || !isAdminUser($profile)) {
    http_response_code(403);
    echo json_encode(['message' => 'Accès administrateur requis.']);
    exit;
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
    http_response_code(500);
    echo json_encode(['message' => 'SUPABASE_SERVICE_ROLE_KEY est requis côté serveur.']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

// --- GET : lister les utilisateurs ---
if ($method === 'GET') {
    $result = supabaseServiceQuery(
        'GET',
        '/rest/v1/user_profiles?select=*&order=created_at.desc'
    );

    if ($result['error']) {
        logB404Error('admin-users GET: ' . $result['error']);
        http_response_code(500);
        echo json_encode(['message' => $result['error']]);
        exit;
    }

    // Ajouter le statut is_banned pour chaque utilisateur
    $users = $result['data'] ?? [];
    $emails = array_filter(array_map(function ($u) {
        return isset($u['email']) && is_string($u['email']) ? strtolower(trim($u['email'])) : null;
    }, $users));

    $bannedEmails = [];
    if (count($emails) > 0) {
        $bannedResult = supabaseServiceQuery(
            'POST',
            '/rest/v1/banned_emails?select=email',
            null
        );
        // Alternative: GET with in filter
        $emailFilter = array_map(function ($e) { return 'email=eq.' . rawurlencode($e); }, $emails);
        $bannedResult = supabaseServiceQuery(
            'GET',
            '/rest/v1/banned_emails?select=email&or=(' . implode(',', $emailFilter) . ')'
        );
        if (is_array($bannedResult['data'])) {
            foreach ($bannedResult['data'] as $banned) {
                $bannedEmails[] = strtolower(trim($banned['email'] ?? ''));
            }
        }
    }

    $usersWithBan = array_map(function ($userRow) use ($bannedEmails) {
        $userRow['is_banned'] = in_array(
            strtolower(trim($userRow['email'] ?? '')),
            $bannedEmails,
            true
        );
        return $userRow;
    }, $users);

    http_response_code(200);
    echo json_encode(['users' => $usersWithBan]);
    exit;
}

// --- PATCH : modifier un utilisateur ---
if ($method === 'PATCH') {
    $data = getJsonBody();
    $userId = isset($data['userId']) && is_string($data['userId']) ? trim($data['userId']) : '';
    $role = isset($data['role']) && is_string($data['role']) ? trim($data['role']) : '';
    $isSuspended = isset($data['isSuspended']) ? (bool)$data['isSuspended'] : null;
    $isBanned = isset($data['isBanned']) ? (bool)$data['isBanned'] : null;

    if (!$userId) {
        http_response_code(400);
        echo json_encode(['message' => 'Utilisateur invalide.']);
        exit;
    }

    $allowedRoles = ['member', 'vip', 'moderator', 'admin', 'founder'];
    if ($role && !in_array($role, $allowedRoles, true)) {
        http_response_code(400);
        echo json_encode(['message' => 'Rôle invalide.']);
        exit;
    }

    $updatePayload = [];
    if ($role) $updatePayload['role'] = $role;
    if ($isSuspended !== null) $updatePayload['is_suspended'] = $isSuspended;

    // Gestion du ban/unban
    if ($isBanned !== null) {
        // Récupérer l'email de l'utilisateur cible
        $targetUser = getUserProfile($userId);
        if (!$targetUser || !isset($targetUser['email'])) {
            http_response_code(404);
            echo json_encode(['message' => 'Utilisateur introuvable.']);
            exit;
        }

        $email = strtolower(trim($targetUser['email']));

        if ($isBanned) {
            // Bannir
            supabaseServiceQuery(
                'POST',
                '/rest/v1/banned_emails',
                ['email' => $email, 'reason' => 'Banni depuis le panneau B404.', 'banned_by' => $profile['id']]
            );
            $updatePayload['is_suspended'] = true;
        } else {
            // Débannir
            supabaseServiceQuery(
                'DELETE',
                '/rest/v1/banned_emails?email=eq.' . rawurlencode($email)
            );
        }
    }

    if (count($updatePayload) > 0) {
        $updateResult = supabaseServiceQuery(
            'PATCH',
            '/rest/v1/user_profiles?id=eq.' . rawurlencode($userId) . '&select=*',
            $updatePayload
        );

        if ($updateResult['error']) {
            logB404Error('admin-users PATCH: ' . $updateResult['error']);
            http_response_code(500);
            echo json_encode(['message' => $updateResult['error']]);
            exit;
        }

        $updatedUser = is_array($updateResult['data']) && count($updateResult['data']) > 0
            ? $updateResult['data'][0]
            : null;

        if ($updatedUser) {
            $updatedUser['is_banned'] = $isBanned ?? false;
            http_response_code(200);
            echo json_encode(['user' => $updatedUser]);
            exit;
        }
    }

    // Aucune modification nécessaire, retourner l'utilisateur actuel
    $currentUser = getUserProfile($userId);
    http_response_code(200);
    echo json_encode(['user' => $currentUser]);
    exit;
}

http_response_code(405);
echo json_encode(['message' => 'Méthode non autorisée.']);

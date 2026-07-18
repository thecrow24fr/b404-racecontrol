<?php
/**
 * Configuration partagée B404 — API RaceControl.
 * Utilisée par tous les endpoints PHP B404.
 */

// --- Supabase ---
define('SUPABASE_URL', 'https://iyuqzsyrnfkcdiclnxpv.supabase.co');
define('SUPABASE_ANON_KEY', 'sb_publishable_cMN9vY9wb0ZwGzP5S-rsJQ_KXg5DE7X');
define('SUPABASE_SERVICE_ROLE_KEY', getenv('SUPABASE_SERVICE_ROLE_KEY') ?: '');

// --- CORS ---
define('ALLOWED_ORIGINS', serialize([
    'https://racecontrol.b404ldc.fr',
    'https://b404ldc.fr',
    'http://localhost:3000',
    'http://localhost:3001',
]));

// --- Logging ---
define('LOG_FILE', __DIR__ . '/b404-errors.log');
define('RATE_LIMIT_WINDOW', 60);
define('RATE_LIMIT_MAX', 30);

function logB404Error(string $message): void {
    $timestamp = date('Y-m-d H:i:s');
    $log = "[{$timestamp}] {$message}" . PHP_EOL;
    @file_put_contents(LOG_FILE, $log, FILE_APPEND | LOCK_EX);
}

function sendCorsHeaders(): void {
    $allowedOrigins = unserialize(ALLOWED_ORIGINS);
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if (in_array($origin, $allowedOrigins, true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
    } elseif ($origin !== '') {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Origine non autorisee.']);
        exit;
    }
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Methods: POST, GET, PATCH, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Max-Age: 86400');
}

function handlePreflight(): void {
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

function requirePost(): void {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Methode non autorisee. Utilisez POST.']);
        exit;
    }
}

function getJsonBody(): array {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    return is_array($data) ? $data : [];
}

function getBearerToken(): string {
    $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (preg_match('/^Bearer\s+(.+)$/i', $auth, $matches)) {
        return trim($matches[1]);
    }
    return '';
}

/**
 * Verifie un token Supabase et retourne l'utilisateur.
 */
function verifySupabaseToken(string $token): ?array {
    if (!$token) return null;

    $url = SUPABASE_URL . '/auth/v1/user';
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' =>
                "Authorization: Bearer $token\r\n" .
                "apiKey: " . SUPABASE_ANON_KEY . "\r\n",
            'timeout' => 10,
        ],
    ]);

    $response = @file_get_contents($url, false, $context);
    if ($response === false) return null;
    $data = json_decode($response, true);
    return isset($data['id']) ? $data : null;
}

/**
 * Appelle l'API REST Supabase avec le service role key.
 */
function supabaseServiceQuery(string $method, string $path, ?array $body = null): array {
    $url = SUPABASE_URL . $path;
    $headers =
        "Authorization: Bearer " . SUPABASE_SERVICE_ROLE_KEY . "\r\n" .
        "apiKey: " . SUPABASE_SERVICE_ROLE_KEY . "\r\n" .
        "Content-Type: application/json\r\n" .
        "Prefer: return=representation\r\n";

    $options = [
        'http' => [
            'method' => $method,
            'header' => $headers,
            'timeout' => 15,
        ],
    ];

    if ($body !== null) {
        $options['http']['content'] = json_encode($body);
    }

    $response = @file_get_contents($url, false, stream_context_create($options));
    $statusCode = 0;
    if (isset($http_response_header)) {
        preg_match('/HTTP\/\d\.\d\s+(\d+)/', $http_response_header[0], $matches);
        $statusCode = (int)($matches[1] ?? 0);
    }

    return [
        'data' => $response !== false ? json_decode($response, true) : null,
        'status' => $statusCode,
        'error' => $response === false ? (error_get_last()['message'] ?? 'Erreur reseau') : null,
    ];
}

/**
 * Appelle l'API REST Supabase avec un token utilisateur (anon key).
 */
function supabaseUserQuery(string $method, string $path, string $token, ?array $body = null): array {
    $url = SUPABASE_URL . $path;
    $headers =
        "Authorization: Bearer $token\r\n" .
        "apiKey: " . SUPABASE_ANON_KEY . "\r\n" .
        "Content-Type: application/json\r\n" .
        "Prefer: return=representation\r\n";

    $options = [
        'http' => [
            'method' => $method,
            'header' => $headers,
            'timeout' => 15,
        ],
    ];

    if ($body !== null) {
        $options['http']['content'] = json_encode($body);
    }

    $response = @file_get_contents($url, false, stream_context_create($options));
    $statusCode = 0;
    if (isset($http_response_header)) {
        preg_match('/HTTP\/\d\.\d\s+(\d+)/', $http_response_header[0], $matches);
        $statusCode = (int)($matches[1] ?? 0);
    }

    return [
        'data' => $response !== false ? json_decode($response, true) : null,
        'status' => $statusCode,
        'error' => $response === false ? (error_get_last()['message'] ?? 'Erreur reseau') : null,
    ];
}

/**
 * Recupere le profil utilisateur depuis Supabase via service role.
 */
function getUserProfile(string $userId): ?array {
    $result = supabaseServiceQuery(
        'GET',
        '/rest/v1/user_profiles?id=eq.' . rawurlencode($userId) . '&select=*'
    );

    if ($result['status'] >= 200 && $result['status'] < 300 && is_array($result['data']) && count($result['data']) > 0) {
        return $result['data'][0];
    }

    return null;
}

/**
 * Verifie si l'utilisateur a un role admin (admin ou founder).
 */
function isAdminUser(array $profile): bool {
    $adminRoles = ['admin', 'founder'];
    return isset($profile['role']) && in_array($profile['role'], $adminRoles, true);
}

/**
 * Verifie si l'utilisateur a un role staff.
 */
function isStaffUser(array $profile): bool {
    $staffRoles = ['moderator', 'admin', 'founder', 'staff'];
    return isset($profile['role']) && in_array($profile['role'], $staffRoles, true);
}

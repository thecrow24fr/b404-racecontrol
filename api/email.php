<?php
/**
 * API d'envoi d'email pour B404 RaceControl.
 *
 * Service technique commun a tous les projets B404.
 * Hebergee sur le sous-domaine RaceControl.
 * Utilisee par b404-racecontrol et b404-site.
 *
 * Installation :
 *   1. Deployer l'export statique sur racecontrol.b404ldc.fr
 *   2. Creer un dossier /api/ a la racine du sous-domaine
 *   3. Copier ce fichier dans /api/email.php
 *   4. Configurer les permissions en 644
 *   5. Le formulaire React appelle automatiquement cette URL
 *
 * Format attendu (POST JSON) :
 *   {
 *     "from":    "B404 RaceControl <noreply@b404ldc.fr>",
 *     "to":      "recrutement@b404ldc.fr",
 *     "subject": "Nouvelle candidature - Recrutement",
 *     "html":    "<div>...</div>",
 *     "replyTo": "candidat@email.fr"
 *   }
 *
 * Retourne :
 *   200 { "success": true, "messageId": "..." }
 *   400 { "success": false, "error": "..." }
 *   429 { "success": false, "error": "Trop de requetes" }
 *   500 { "success": false, "error": "Erreur serveur" }
 */

// --- Configuration ---
define('ALLOWED_ORIGINS', serialize([
    'https://racecontrol.b404ldc.fr',
    'https://b404ldc.fr',
    'http://localhost:3000',
    'http://localhost:3001',
]));

define('RATE_LIMIT_WINDOW', 60);   // Fenetre de rate limiting (secondes)
define('RATE_LIMIT_MAX', 5);       // Requetes autorisees par fenetre
define('LOG_FILE', __DIR__ . '/email-errors.log');

// --- Initialisation ---
ini_set('display_errors', '0');
error_reporting(E_ALL);

// Fonction de log serveur (jamais exposee au client)
function logError(string $message): void {
    $timestamp = date('Y-m-d H:i:s');
    $log = "[{$timestamp}] {$message}" . PHP_EOL;
    @file_put_contents(LOG_FILE, $log, FILE_APPEND | LOCK_EX);
}

// --- Headers ---
header('Content-Type: application/json; charset=utf-8');

// --- CORS restreint ---
$allowedOrigins = unserialize(ALLOWED_ORIGINS);
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
} else {
    if ($origin !== '') {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Origine non autorisee.']);
        exit;
    }
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Max-Age: 86400');

// --- Preflight CORS ---
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// --- Verification de la methode ---
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'error' => 'Methode non autorisee. Utilisez POST.',
    ]);
    exit;
}

// --- Rate limiting par IP ---
$clientIp = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$rateFile = __DIR__ . '/.rate-' . md5($clientIp);

$now = time();
$rateData = ['count' => 0, 'window_start' => $now];

if (file_exists($rateFile)) {
    $stored = @file_get_contents($rateFile);
    if ($stored !== false) {
        $decoded = json_decode($stored, true);
        if (is_array($decoded) && isset($decoded['count'], $decoded['window_start'])) {
            $rateData = $decoded;
        }
    }
}

if ($now - $rateData['window_start'] > RATE_LIMIT_WINDOW) {
    $rateData = ['count' => 0, 'window_start' => $now];
}

$rateData['count']++;
@file_put_contents($rateFile, json_encode($rateData), LOCK_EX);

if ($rateData['count'] > RATE_LIMIT_MAX) {
    logError("Rate limit depasse pour IP: {$clientIp} ({$rateData['count']} requetes)");
    http_response_code(429);
    echo json_encode([
        'success' => false,
        'error' => 'Trop de requetes. Veuillez attendre avant de reessayer.',
    ]);
    exit;
}

// --- Lecture du corps JSON ---
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data || !is_array($data)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Corps de requete JSON invalide.',
    ]);
    exit;
}

// --- Validation des champs requis ---
$required = ['from', 'to', 'subject', 'html'];
$missing = [];

foreach ($required as $field) {
    if (empty($data[$field]) || !is_string($data[$field])) {
        $missing[] = $field;
    }
}

if (!empty($missing)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Champs requis manquants : ' . implode(', ', $missing),
    ]);
    exit;
}

// --- Nettoyage et validation ---
$from    = trim($data['from']);
$to      = trim($data['to']);
$subject = trim($data['subject']);
$html    = $data['html'];
$replyTo = isset($data['replyTo']) ? trim($data['replyTo']) : '';

// Sujet limite a 200 caracteres
$subject = mb_substr($subject, 0, 200, 'UTF-8');

// Prevention Header Injection : supprimer les retours a la ligne
$from    = str_replace(["\r", "\n"], '', $from);
$to      = str_replace(["\r", "\n"], '', $to);
$subject = str_replace(["\r", "\n"], '', $subject);
$replyTo = str_replace(["\r", "\n"], '', $replyTo);

// Extraction de l'email depuis "Nom <email>" si present
function extractEmail(string $address): string {
    if (preg_match('/<([^>]+)>/', $address, $matches)) {
        return trim($matches[1]);
    }
    return trim($address);
}

// Validation du destinataire
$toEmail = extractEmail($to);
if (!filter_var($toEmail, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Adresse email du destinataire invalide.',
    ]);
    exit;
}

// Validation de l'expediteur
$fromEmail = extractEmail($from);
if (!filter_var($fromEmail, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Adresse email de l\'expediteur invalide.',
    ]);
    exit;
}

// Validation de replyTo si fourni
if (!empty($replyTo) && !filter_var($replyTo, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Adresse email de reponse invalide.',
    ]);
    exit;
}

// --- Construction des headers securises ---
$headers = [
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    'From: ' . $from,
    'X-Mailer: B404-RaceControl/1.0',
];

if (!empty($replyTo)) {
    $headers[] = 'Reply-To: ' . $replyTo;
}

// --- Envoi via mail() OVH ---
try {
    $success = @mail($to, $subject, $html, implode("\r\n", $headers));

    if ($success) {
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'messageId' => 'php-' . time() . '-' . substr(md5($to . $subject), 0, 12),
        ]);
    } else {
        logError("Echec mail() pour {$to} - sujet: {$subject}");
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => "L'envoi de l'email a echoue. Veuillez reessayer plus tard.",
        ]);
    }
} catch (Throwable $e) {
    logError("Exception mail(): " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => "Erreur interne du serveur. Veuillez reessayer plus tard.",
    ]);
}

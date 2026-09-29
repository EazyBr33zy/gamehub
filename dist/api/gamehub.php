<?php
/**
 * Game Hub — salvamento no servidor (HostGator / qualquer hospedagem com PHP).
 *
 * Este arquivo pode ser sobrescrito a cada publicação: a SENHA fica em outro arquivo
 * (gamehub-config.php), fora da pasta do site, e os DADOS ficam em uma pasta
 * (gamehub-data) também fora do site.
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function out(int $code, array $body): void {
    http_response_code($code);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// ---------- 1) achar o arquivo de configuração (senha) ----------
$configFile = null;
foreach ([dirname(__DIR__, 2), dirname(__DIR__, 3), dirname(__DIR__, 4)] as $dir) {
    if ($dir && is_file($dir . '/gamehub-config.php')) {
        $configFile = $dir . '/gamehub-config.php';
        break;
    }
}
if ($configFile === null) {
    out(503, ['error' => 'not_configured', 'message' => 'Arquivo gamehub-config.php não encontrado.']);
}
$config = include $configFile;
$secret = is_array($config) ? (string)($config['key'] ?? '') : '';
if (strlen($secret) < 12) {
    out(503, ['error' => 'not_configured', 'message' => 'A senha no gamehub-config.php precisa ter 12 caracteres ou mais.']);
}

// ---------- 2) conferir a senha ----------
$provided = (string)($_SERVER['HTTP_X_GAMEHUB_KEY'] ?? '');
if (!hash_equals($secret, $provided)) {
    usleep(400000); // dificulta tentativas de adivinhar a senha
    out(401, ['error' => 'unauthorized', 'message' => 'Senha incorreta.']);
}

// ---------- 3) pasta de dados (fora do site) ----------
$dataDir = dirname($configFile) . '/gamehub-data';
$backupDir = $dataDir . '/backups';
if (!is_dir($backupDir) && !@mkdir($backupDir, 0750, true)) {
    out(500, ['error' => 'storage', 'message' => 'Não consegui criar a pasta de dados.']);
}
@file_put_contents($dataDir . '/.htaccess', "Require all denied\nDeny from all\n");
$dataFile = $dataDir . '/data.json';

function readCurrent(string $file): ?array {
    if (!is_file($file)) return null;
    $raw = @file_get_contents($file);
    $data = $raw === false ? null : json_decode($raw, true);
    return is_array($data) ? $data : null;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// ---------- GET: devolve os dados salvos ----------
if ($method === 'GET') {
    $current = readCurrent($dataFile);
    if ($current === null) {
        out(200, ['exists' => false, 'revision' => 0]);
    }
    $current['exists'] = true;
    out(200, $current);
}

if ($method !== 'POST') {
    out(405, ['error' => 'method_not_allowed']);
}

// ---------- POST: grava os dados ----------
@ini_set('memory_limit', '256M');
$raw = file_get_contents('php://input');
$payload = json_decode($raw ?: '', true);
if (!is_array($payload) || !isset($payload['games']) || !is_array($payload['games'])) {
    out(400, ['error' => 'bad_request', 'message' => 'Dados inválidos.']);
}
$baseRevision = (int)($payload['baseRevision'] ?? 0);
$force = !empty($payload['force']);

$lock = fopen($dataDir . '/.lock', 'c');
if (!$lock || !flock($lock, LOCK_EX)) {
    out(500, ['error' => 'lock', 'message' => 'Não consegui travar o arquivo de dados.']);
}

$current = readCurrent($dataFile);
$currentRevision = $current ? (int)($current['revision'] ?? 0) : 0;

// Outro aparelho gravou depois da última vez que este viu os dados -> conflito (nunca sobrescreve sem avisar)
if (!$force && $current !== null && $baseRevision !== $currentRevision) {
    flock($lock, LOCK_UN);
    $current['exists'] = true;
    out(409, ['error' => 'conflict', 'server' => $current]);
}

// Cópia de segurança da versão anterior (no máximo 1 por hora; guarda as 40 mais recentes)
if ($current !== null) {
    $last = glob($backupDir . '/data-*.json') ?: [];
    sort($last);
    $lastFile = $last ? end($last) : null;
    if ($lastFile === null || (time() - filemtime($lastFile)) > 3600 || $force) {
        @copy($dataFile, $backupDir . '/data-' . date('Ymd-His') . '.json');
        $all = glob($backupDir . '/data-*.json') ?: [];
        sort($all);
        while (count($all) > 40) {
            @unlink(array_shift($all));
        }
    }
}

$newRevision = $currentRevision + 1;
$doc = [
    'revision' => $newRevision,
    'updatedAt' => gmdate('c'),
    'games' => $payload['games'],
    'config' => is_array($payload['config'] ?? null) ? $payload['config'] : new stdClass(),
];
$tmp = $dataFile . '.tmp';
$ok = @file_put_contents($tmp, json_encode($doc, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)) !== false
    && @rename($tmp, $dataFile);
flock($lock, LOCK_UN);

if (!$ok) {
    out(500, ['error' => 'write_failed', 'message' => 'Não consegui gravar no servidor.']);
}
out(200, ['ok' => true, 'revision' => $newRevision, 'updatedAt' => $doc['updatedAt']]);

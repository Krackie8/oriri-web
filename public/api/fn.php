<?php
// Same-origin relay to the Supabase edge function, so the browser never makes a
// cross-site request. iPhone Safari was dropping those after the CORS check.
// Only forwards to the one fixed function URL; the path is checked below.
const UPSTREAM = 'https://lemtlurqzmjdahbhunhz.supabase.co/functions/v1/make-server-a278ea32/';

$path = isset($_GET['p']) ? $_GET['p'] : '';
if (!preg_match('#^[A-Za-z0-9_\-./]{1,200}$#', $path) || strpos($path, '..') !== false) {
  http_response_code(400);
  header('Content-Type: application/json');
  echo '{"success":false,"error":"Bad path"}';
  exit;
}
$query = $_GET;
unset($query['p']);
$url = UPSTREAM . $path . ($query ? '?' . http_build_query($query) : '');

$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'OPTIONS') { http_response_code(204); exit; }

$auth = '';
if (!empty($_SERVER['HTTP_AUTHORIZATION'])) $auth = $_SERVER['HTTP_AUTHORIZATION'];
elseif (!empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) $auth = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
elseif (function_exists('getallheaders')) {
  foreach (getallheaders() as $k => $v) if (strcasecmp($k, 'Authorization') === 0) $auth = $v;
}

$headers = [];
if ($auth !== '') $headers[] = 'Authorization: ' . $auth;
if (!empty($_SERVER['CONTENT_TYPE'])) $headers[] = 'Content-Type: ' . $_SERVER['CONTENT_TYPE'];
if (!empty($_SERVER['HTTP_APIKEY'])) $headers[] = 'apikey: ' . $_SERVER['HTTP_APIKEY'];
if (!empty($_SERVER['REMOTE_ADDR'])) $headers[] = 'X-Forwarded-For: ' . $_SERVER['REMOTE_ADDR'];
if (!empty($_SERVER['HTTP_USER_AGENT'])) $headers[] = 'User-Agent: ' . $_SERVER['HTTP_USER_AGENT'];
$headers[] = 'Origin: https://' . ($_SERVER['HTTP_HOST'] ?? 'www.oriri.me');

$ch = curl_init($url);
curl_setopt_array($ch, [
  CURLOPT_CUSTOMREQUEST => $method,
  CURLOPT_HTTPHEADER => $headers,
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HEADER => false,
  CURLOPT_CONNECTTIMEOUT => 8,
  CURLOPT_TIMEOUT => 25,
  CURLOPT_ENCODING => '',
]);
if (!in_array($method, ['GET', 'HEAD'], true)) {
  curl_setopt($ch, CURLOPT_POSTFIELDS, file_get_contents('php://input'));
}
$body = curl_exec($ch);
if ($body === false) {
  http_response_code(502);
  header('Content-Type: application/json');
  echo json_encode(['success' => false, 'error' => 'Upstream unreachable']);
  exit;
}
$status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
$type = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
curl_close($ch);

http_response_code($status ?: 502);
header('Content-Type: ' . ($type ?: 'application/json'));
header('Cache-Control: no-store');
echo $body;

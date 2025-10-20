<?php
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type");

ini_set('session.cookie_samesite', 'None');
ini_set('session.cookie_secure', 'false');
session_start();

$_SESSION = [];
session_destroy();

setcookie("PHPSESSID", "", time() - 3600, "/");

echo json_encode(['success' => true, 'message' => '已登出']);
exit;

<?php
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

session_start();

if (isset($_SESSION['admin_user'])) {
  echo json_encode([
    'loggedIn' => true,
    'user' => $_SESSION['admin_user']
  ]);
} else {
  echo json_encode(['loggedIn' => false]);
}

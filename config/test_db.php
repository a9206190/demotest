<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/Database.php';

echo "<h3>🧪 測試資料庫連線</h3>";

$db = new Database();
$db->testConnection();

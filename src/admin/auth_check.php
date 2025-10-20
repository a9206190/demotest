<?php
// ==============================
// ✅ auth_check.php
// - 用來保護所有後台頁面
// - 若使用者未登入，導回登入頁
// ==============================

session_start();

if (!isset($_SESSION['admin_user'])) {
  // ❌ 未登入 → 導回登入頁
  header("Location: ../../login.html");
  exit;
}

// ✅ 已登入 → 提供 $user 給頁面使用
$user = $_SESSION['admin_user'];

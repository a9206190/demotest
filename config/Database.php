<?php
// ============================
// config/Database.php (MySQL 自動切換版本)
// ============================
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

class Database {
    private $conn; // PDO 連線物件

    // ✅ 自動切換主機設定
    private $config = [
        "local" => [
            "host" => "localhost",
            "port" => "3306",
            "dbname" => "moneyfast",
            "username" => "moneyfast",
            "password" => "Moneyfast20251010", 
        ],
        "remote" => [
            "host" => "61.219.192.39",
            "port" => "3306",
            "dbname" => "moneyfast",
            "username" => "moneyfast",
            "password" => "Moneyfast20251010", 
        ]
    ];

    // ✅ 判斷目前要連哪個環境
    private function getEnvironment() {
        // 若伺服器名稱包含 "localhost" 或 "127.0.0.1" 就用本地設定
        if (isset($_SERVER['SERVER_NAME']) && 
            (strpos($_SERVER['SERVER_NAME'], 'localhost') !== false || 
             strpos($_SERVER['SERVER_NAME'], '127.0.0.1') !== false)) {
            return "local";
        }

        // 或者明確定義環境變數（例如：$_ENV['APP_ENV'] = 'remote';）
        if (isset($_ENV['APP_ENV']) && $_ENV['APP_ENV'] === 'remote') {
            return "remote";
        }

        // 預設使用 local
        return "local";
    }

    // ✅ 統一取得連線物件
    public function getConnection() {
        if ($this->conn !== null) {
            return $this->conn;
        }

        $env = $this->getEnvironment();
        $dbConf = $this->config[$env];

        try {
            $dsn = "mysql:host={$dbConf['host']};port={$dbConf['port']};dbname={$dbConf['dbname']};charset=utf8mb4";
            $this->conn = new PDO($dsn, $dbConf['username'], $dbConf['password']);
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

            // ✅ 顯示成功訊息
            // echo "✅ 已連線至 {$env} 環境 ({$dbConf['host']})<br>";

        } catch (PDOException $e) {
            echo "<div style='color: red; font-weight: bold;'>❌ 資料庫連線失敗（{$env}）："
                . $e->getMessage() . "</div>";
            $this->conn = null;
        }

        return $this->conn;
    }

    // ✅ 測試連線
    public function testConnection() {
        $conn = $this->getConnection();
        if ($conn) {
            $version = $conn->query("SELECT VERSION();")->fetchColumn();
            echo "✅ 已成功連線 MySQL！<br>";
            echo "📦 MySQL 版本：$version";
        } else {
            echo "❌ 無法建立資料庫連線。";
        }
    }
}
?>

<?php
// ============================
// config/Database.php
// ============================
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);


class Database {
    // 資料庫設定
    private $host = "localhost";       // 主機名稱
    private $port = "5432";            // PostgreSQL 預設 port
    private $dbname = "Moneyfast";     // 資料庫名稱
    private $username = "postgres";    // 使用者帳號
    private $password = "admin";   // 密碼

    private $conn; // PDO 連線物件

    // ✅ 統一使用 getConnection()
    public function getConnection() {
        if ($this->conn !== null) {
            return $this->conn; // 若已連線就直接回傳
        }

        try {
            $dsn = "pgsql:host={$this->host};port={$this->port};dbname={$this->dbname}";
            $this->conn = new PDO($dsn, $this->username, $this->password);

            // 設定 PDO 屬性
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

        } catch (PDOException $e) {
            echo "<div style='color: red; font-weight: bold;'>❌ 資料庫連線失敗：" . $e->getMessage() . "</div>";
            $this->conn = null;
        }

                return $this->conn;
            }

    // （可選）測試用：快速驗證連線成功
    public function testConnection() {
        $conn = $this->getConnection();
        if ($conn) {
            $version = $conn->query("SELECT version();")->fetchColumn();
            echo "✅ 已成功連線 PostgreSQL！<br>";
            echo "📦 PostgreSQL 版本：$version";
        } else {
            echo "❌ 無法建立資料庫連線。";
        }
    }
}
?>

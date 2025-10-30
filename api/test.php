(async () => {
  const API_URL = "https://www.moneyfast.cc/api/submit_loan.php";

  const formData = new FormData();
  formData.append("name", "測試用戶");
  formData.append("phone", "0912345678");
  formData.append("idNumber", "A123456789");
  formData.append("birthDate", "1990-01-01");
  formData.append("loanAmount", "12000");
  formData.append("referral_code", "TEST123");
  formData.append("address", "桃園市中壢區測試路1號");
  formData.append("residentArea", "桃園市");
  formData.append("debtDetail", "無負債");
  formData.append("lineId", "testlineid");
  formData.append("companyName", "測試股份有限公司");
  formData.append("salary", "35000");
  formData.append("creditStatus", "正常");

  // ✅ 使用合法的最小透明 PNG base64
  const dummyBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAn8BH3VfZy0AAAAASUVORK5CYII=";

  function base64ToBlob(base64) {
    const arr = base64.split(",");
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new Blob([u8arr], { type: mime });
  }

  const blob = base64ToBlob(dummyBase64);
  formData.append("id_front", new File([blob], "id_front.png", { type: "image/png" }));
  formData.append("id_back", new File([blob], "id_back.png", { type: "image/png" }));
  formData.append("bankbook", new File([blob], "bankbook.png", { type: "image/png" }));
  formData.append("selfie", new File([blob], "selfie.png", { type: "image/png" }));
  formData.append("signature", new File([blob], "signature.png", { type: "image/png" }));


  console.log("🚀 Sending to:", API_URL);
  for (let [k, v] of formData.entries()) {
    console.log(k, v instanceof File ? `[File] ${v.name}` : v);
  }

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    const text = await res.text();
    console.log("📩 Raw response:", text);

    let result;
    try {
      result = JSON.parse(text);
    } catch {
      console.error("❌ 無法解析 JSON:", text);
      return;
    }

    if (result.success) {
      console.log("✅ 成功！申請編號：", result.application_no);
    } else {
      console.error("❌ 送出失敗：", result.error || "未知錯誤");
    }
  } catch (err) {
    console.error("💥 Fetch 錯誤：", err);
  }
})();

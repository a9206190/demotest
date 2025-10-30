// public/bootstrap.js
(async function () {
  function b64ToArrayBuffer(b64) {
    const bin = atob(b64);
    const len = bin.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  }

  function pemToArrayBuffer(pem) {
    const b64 = pem
      .replace(/-----BEGIN [^-]+-----/g, "")
      .replace(/-----END [^-]+-----/g, "")
      .replace(/\s+/g, "");
    return b64ToArrayBuffer(b64);
  }

  async function verify(publicPem, digestBuf, signatureB64) {
    const pubKey = await crypto.subtle.importKey(
      "spki",
      pemToArrayBuffer(publicPem),
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const sigBuf = b64ToArrayBuffer(signatureB64);
    return crypto.subtle.verify("RSASSA-PKCS1-v1_5", pubKey, sigBuf, digestBuf);
  }

  try {
    const manifestResp = await fetch("/assets/manifest-sign.json", { cache: "no-store" });
    if (!manifestResp.ok) throw new Error("manifest fetch failed");
    const manifest = await manifestResp.json();

    const jsFiles = Object.keys(manifest).filter((n) => n.endsWith(".js"));
    const targetFile = jsFiles.find((n) => n.includes("main")) || jsFiles[0];
    const sig = manifest[targetFile].signature;

    const bundleResp = await fetch("/assets/" + targetFile, { cache: "no-store" });
    if (!bundleResp.ok) throw new Error("bundle fetch failed");
    const bundleArrBuf = await bundleResp.arrayBuffer();

    const digest = await crypto.subtle.digest("SHA-256", bundleArrBuf);

    const publicPem = `-----BEGIN PUBLIC KEY-----
        MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAur2mkkWV4e9+zuH5EvKW
        3cwoGI3tdibuW2YIpgxH97FAZtkfYDKWQHokhAnACelP3oFQmj80rZ/qMISh81RI
        GFv72DtXbpgwpZfW9B88Osq81arnmnXk0EBKeaj1wfLdKjICM5ix58DDCLgIWS79
        KS5AFL0ZssEbkNJ3+1A1Mvqqi09PUEyGitF+znlwxat942Q5CdyQnAIdHtdFt22c
        9sQlCikW8zkKTfmjnBFMjd3VZP2R46qGHpL0GR7h0E+KwTSReUCwj1oGz7h66HO1
        8WDKaRfi0RmTiy+lBZ3hAJD75SF3HCy8nl8o2yqez7WNV6wbNqP4YDF4l3y0MoVp
        0wIDAQAB
        -----END PUBLIC KEY-----`;

    const verified = await verify(publicPem, digest, sig);
    if (!verified) throw new Error("bundle signature invalid");

    const blob = new Blob([bundleArrBuf], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const s = document.createElement("script");
    s.src = url;
    s.onload = () => URL.revokeObjectURL(url);
    document.head.appendChild(s);
  } catch (err) {
    console.error(err);
    document.body.innerHTML = "<h1>Unauthorized or tampered build</h1>";
  }
})();

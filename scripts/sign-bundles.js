/* eslint-env node */
/* global process */

// scripts/sign-bundles.js

import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const distAssetsDir = process.argv[2] || "dist/assets";
const privateKeyPath = process.env.PRIVATE_KEY_PATH || "./private.pem";

async function toBase64(buf) {
  return Buffer.from(buf).toString("base64");
}
async function sha256(buf) {
  return crypto.createHash("sha256").update(buf).digest();
}
async function sign(privateKeyPem, buf) {
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(buf);
  sign.end();
  return sign.sign(privateKeyPem);
}

async function main() {
  const privateKey = await fs.readFile(privateKeyPath, "utf8");
  const files = await fs.readdir(distAssetsDir);
  const out = {};

  for (const file of files) {
    if (!file.endsWith(".js")) continue;
    const fp = path.join(distAssetsDir, file);
    const content = await fs.readFile(fp);
    const digestBuf = await sha256(content);
    const sigBuf = await sign(privateKey, digestBuf);

    out[file] = {
      sha256: await toBase64(digestBuf),
      signature: await toBase64(sigBuf),
    };
    console.log("✅ Signed", file);
  }

  await fs.writeFile(
    path.join(distAssetsDir, "manifest-sign.json"),
    JSON.stringify(out, null, 2),
    "utf8"
  );
  console.log("🎉 Wrote manifest-sign.json");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});

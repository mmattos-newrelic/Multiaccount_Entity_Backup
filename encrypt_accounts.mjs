import fs from "fs";
import crypto from "crypto";

// Read public key
const publicKey = fs.readFileSync("public_key.pem", "utf8");

function encryptFile(inputFile, outputFile) {
  const data = fs.readFileSync(inputFile, "utf8");
  const buffer = Buffer.from(data, "utf8");

  const encrypted = crypto.publicEncrypt(
    {
      key: publicKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, // OAEP padding
      oaepHash: "sha256", // recommended
    },
    buffer
  );

  fs.writeFileSync(outputFile, encrypted.toString("base64"));
  console.log(`✅ File encrypted successfully: ${outputFile}`);
}

// Usage
encryptFile("accounts_keys.csv", "accounts_keys.enc");

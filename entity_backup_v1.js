import fs from "fs";
import crypto from "crypto";
import fetch from "node-fetch";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

const OUTPUT_DIR = "./dashboards_output";
const ACCOUNTS_FILE = "./accounts_keys.enc";
const PRIVATE_KEY_FILE = "./private_key.pem"; // RSA private key file

// ========================
// 🔐 RSA DECRYPTION LOGIC
// ========================
function decryptAccountsKeys(encFile, privateKeyFile) {
  console.log("🔑 Decrypting accounts_keys.enc...");
  const encryptedBase64 = fs.readFileSync(encFile, "utf8");
  const encryptedBuffer = Buffer.from(encryptedBase64, "base64");
  const privateKey = fs.readFileSync(privateKeyFile, "utf8");

  try {
    const decryptedBuffer = crypto.privateDecrypt(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      encryptedBuffer
    );
    return decryptedBuffer.toString("utf8");
  } catch (err) {
    throw new Error(
      `❌ Decryption failed. Ensure accounts_keys.enc was encrypted with your matching public key.\n${err.message}`
    );
  }
}

// ========================
// 🌐 Fetch data from NerdGraph API
// ========================
async function fetchNerdgraph(query, apiKey) {
  const response = await fetch("https://api.newrelic.com/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "API-Key": apiKey,
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  const result = await response.json();
  if (result.errors) {
    console.error("GraphQL Errors:", JSON.stringify(result.errors, null, 2));
    throw new Error("GraphQL query failed");
  }

  return result.data;
}

// ========================
// 🧭 GraphQL Queries
// ========================
const dashboardsQuery = (accountId) => `
{
  actor {
    entitySearch(query: "type = 'DASHBOARD' AND accountId = ${accountId}") {
      results {
        entities {
          guid
          name
        }
      }
    }
  }
}`;

const detailsQuery = (guid) => `
{
  actor {
    entity(guid: "${guid}") {
      ... on DashboardEntity {
        permissions
        pages {
          name
          widgets {
            visualization { id }
            title
            layout { row width height column }
            rawConfiguration
            id
            linkedEntities { guid }
          }
          guid
          description
        }
        name
        description
      }
    }
  }
}`;

// ========================
// ✅ Validation Function
// ========================
function validateDashboardStructure(entity, filePath) {
  const missingFields = [];

  // Top-level validation
  const topLevelFields = ["name", "description", "permissions", "pages"];
  for (const field of topLevelFields) {
    if (!(field in entity)) missingFields.push(field);
  }

  // Page and widget validation
  if (Array.isArray(entity.pages)) {
    entity.pages.forEach((page, pIndex) => {
      const pageFields = ["name", "guid", "description", "widgets"];
      for (const field of pageFields) {
        if (!(field in page)) missingFields.push(`pages[${pIndex}].${field}`);
      }

      if (Array.isArray(page.widgets)) {
        page.widgets.forEach((widget, wIndex) => {
          const widgetFields = [
            "visualization",
            "title",
            "layout",
            "rawConfiguration",
            "id",
            "linkedEntityGuids",
          ];
          for (const field of widgetFields) {
            if (!(field in widget))
              missingFields.push(`pages[${pIndex}].widgets[${wIndex}].${field}`);
          }
        });
      }
    });
  }

  if (missingFields.length === 0) {
    console.log(`✅ Structure validated for ${filePath}`);
  } else {
    console.warn(`⚠️ Missing fields in ${filePath}:`, missingFields.join(", "));
  }
}

// ========================
// 🚀 MAIN EXECUTION
// ========================
(async () => {
  try {
    const decryptedCSV = decryptAccountsKeys(ACCOUNTS_FILE, PRIVATE_KEY_FILE);

    console.log("📖 Parsing decrypted CSV...");
    const records = parse(decryptedCSV, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR);
      console.log(`📁 Created folder: ${OUTPUT_DIR}`);
    }

    for (const record of records) {
      const accountId = record.accountNumber || record.AccountID || record.accountId;
      const apiKey = record.apiKey || record.ApiKey || record.api_key;

      if (!accountId || !apiKey) {
        console.warn("⚠️ Skipping row with missing AccountID or ApiKey:", record);
        continue;
      }

      console.log(`🚀 Searching dashboards for account ${accountId}...`);

      const dashboardsData = await fetchNerdgraph(dashboardsQuery(accountId), apiKey);
      const dashboards =
        dashboardsData.actor.entitySearch?.results?.entities?.filter((d) => !d.name.includes("/")) || [];

      console.log(`📊 Found ${dashboards.length} dashboards for account ${accountId}.`);

      for (const dashboard of dashboards) {
        const name = dashboard.name.replace(/[\\/:"*?<>|]+/g, "_").replace(/\s+/g, "_");
        const filepath = `${OUTPUT_DIR}/${accountId}_${name}.json`;

        console.log(`📥 Fetching dashboard "${dashboard.name}" (${dashboard.guid})...`);

        try {
          const detailsData = await fetchNerdgraph(detailsQuery(dashboard.guid), apiKey);
          const entity = detailsData.actor.entity;

          if (entity?.pages) {
            entity.pages.forEach((page) => {
              if (page.widgets) {
                page.widgets.forEach((widget) => {
                  if (widget.linkedEntities) {
                    widget.linkedEntityGuids = widget.linkedEntities.map((le) => le.guid);
                    delete widget.linkedEntities;
                  }
                });
              }
            });
          }

          // Match UI-exported JSON structure
          const formattedEntity = {
            name: entity.name || dashboard.name,
            description: entity.description || "",
            permissions: entity.permissions || "PUBLIC_READ_WRITE",
            pages: (entity.pages || []).map((page) => ({
              name: page.name || "",
              guid: page.guid || "",
              description: page.description || "",
              widgets: (page.widgets || []).map((w) => ({
                visualization: w.visualization || {},
                title: w.title || "",
                layout: w.layout || {},
                rawConfiguration: w.rawConfiguration || {},
                id: w.id || "",
                linkedEntityGuids: w.linkedEntityGuids || [],
              })),
            })),
          };

          fs.writeFileSync(filepath, JSON.stringify(formattedEntity, null, 2));
          console.log(`✅ Saved dashboard as ${filepath}`);

          // 🔍 Validate structure after save
          validateDashboardStructure(formattedEntity, filepath);
        } catch (err) {
          console.error(`❌ Failed to fetch dashboard ${dashboard.guid}: ${err.message}`);
        }
      }
    }

    console.log("🎉 Dashboard backup completed successfully!");
  } catch (err) {
    console.error("💥 Error during execution:", err.message);
  }
})();

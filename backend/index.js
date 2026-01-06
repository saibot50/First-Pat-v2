import express from "express";
import { google } from "googleapis";
import { chromium } from "playwright";

const app = express();
app.use(express.json({ limit: "2mb" }));

app.post("/report/pdf", async (req, res) => {
    let browser;
    try {
        const title = req.body?.title || "First Patent Report";
        const content = req.body?.content || "Hello from HTML → PDF 👋";

        browser = await chromium.launch({
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });

        const page = await browser.newPage();

        const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${String(title).replaceAll("<", "&lt;")}</title>
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 40px; }
    h1 { margin: 0 0 12px; }
    .card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; }
    .meta { color: #6b7280; font-size: 12px; margin-bottom: 16px; }
    @page { size: A4; margin: 16mm; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <h1>${String(title).replaceAll("<", "&lt;")}</h1>
  <div class="meta">Generated ${new Date().toISOString()}</div>
  <div class="card">${String(content).replaceAll("<", "&lt;")}</div>
</body>
</html>`;

        await page.setContent(html, { waitUntil: "networkidle" });

        const pdf = await page.pdf({
            format: "A4",
            printBackground: true,
            preferCSSPageSize: true,
        });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="report.pdf"`);
        res.status(200).send(Buffer.from(pdf));
    } catch (err) {
        res.status(500).json({ ok: false, error: String(err?.message || err) });
    } finally {
        if (browser) await browser.close().catch(() => { });
    }
});

app.get("/health", (_, res) => res.status(200).send("ok"));

function mustEnv(name) {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env var ${name}`);
    return v;
}

const TEMPLATE_ID = () => mustEnv("SLIDES_TEMPLATE_ID");

async function getAuth(scopes) {
    const auth = new google.auth.GoogleAuth({ scopes });
    return await auth.getClient();
}

async function driveClient() {
    const auth = await getAuth([
        "https://www.googleapis.com/auth/drive",
    ]);
    return google.drive({ version: "v3", auth });
}

async function slidesClient() {
    const auth = await getAuth([
        "https://www.googleapis.com/auth/presentations",
        "https://www.googleapis.com/auth/drive",
    ]);
    return google.slides({ version: "v1", auth });
}

function safeFilename(name) {
    return String(name || "report")
        .replace(/[^a-z0-9._-]+/gi, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 80) || "report";
}

app.get("/drive-check", async (_req, res) => {
    try {
        const drive = await driveClient();
        const r = await drive.files.get({
            fileId: TEMPLATE_ID(),
            supportsAllDrives: true,
            fields: "id,name,mimeType,driveId,modifiedTime",
        });
        res.json({ ok: true, file: r.data });
    } catch (err) {
        res.status(500).json({ ok: false, error: String(err?.message || err) });
    }
});

/**
 * POST /generate-report
 * Body:
 * {
 *   "replacements": {
 *     "{{name}}": "Toby",
 *     "{{date}}": "06 Jan 2026"
 *   },
 *   "outputName": "First Patent Report"
 * }
 *
 * Returns: application/pdf
 */
app.post("/generate-report", async (req, res) => {
    let copiedId = null;

    try {
        const replacements = req.body?.replacements || {};
        const outputName = req.body?.outputName || "First Patent Report";

        if (typeof replacements !== "object" || Array.isArray(replacements)) {
            return res.status(400).json({ ok: false, error: "replacements must be an object map" });
        }

        const drive = await driveClient();
        const slides = await slidesClient();

        // 1) Copy the template
        const copyResp = await drive.files.copy({
            fileId: TEMPLATE_ID(),
            supportsAllDrives: true,
            requestBody: {
                name: `${outputName} (${new Date().toISOString().slice(0, 10)})`,
            },
            fields: "id,name",
        });

        copiedId = copyResp.data.id;

        // 2) Replace all {{variables}} in one batchUpdate
        const requests = Object.entries(replacements)
            .filter(([k, v]) => typeof k === "string" && (typeof v === "string" || typeof v === "number"))
            .map(([k, v]) => ({
                replaceAllText: {
                    containsText: { text: k, matchCase: true },
                    replaceText: String(v),
                },
            }));

        if (requests.length > 0) {
            await slides.presentations.batchUpdate({
                presentationId: copiedId,
                requestBody: { requests },
            });
        }

        // 3) Export to PDF
        const pdfResp = await drive.files.export(
            { fileId: copiedId, mimeType: "application/pdf" },
            { responseType: "arraybuffer" }
        );

        const pdfBuffer = Buffer.from(pdfResp.data);

        // 4) Return as a download
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${safeFilename(outputName)}.pdf"`
        );
        res.status(200).send(pdfBuffer);
    } catch (err) {
        res.status(500).json({ ok: false, error: String(err?.message || err) });
    } finally {
        // 5) Cleanup the copied deck (optional, but keeps Drive tidy)
        if (copiedId) {
            try {
                const drive = await driveClient();
                await drive.files.delete({ fileId: copiedId, supportsAllDrives: true });
            } catch {
                // ignore cleanup errors
            }
        }
    }
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Listening on ${port}`));
// push comment 2
import express from "express";
import { google } from "googleapis";
import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: "2mb" }));

// Serve static files from the 'dist' directory
const distPath = path.join(__dirname, "..", "dist");
app.use(express.static(distPath));


import { renderTemplate } from "./services/templateRenderer.js";

app.post("/report/html", async (req, res) => {
    try {
        const data = req.body.data || {};
        const html = renderTemplate("first-patent", data);
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.status(200).send(html);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error generating report preview");
    }
});


app.post("/report/pdf", async (req, res) => {
    let browser;
    try {
        const data = req.body.data || {};
        const outputName = req.body.outputName || "report";
        const html = renderTemplate("first-patent", data);

        browser = await chromium.launch({
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });

        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "networkidle" });

        const pdf = await page.pdf({
            format: "A4",
            printBackground: true,
            preferCSSPageSize: true, // Respects our @page size
        });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${safeFilename(outputName)}.pdf"`);
        res.status(200).send(Buffer.from(pdf));
    } catch (err) {
        console.error(err);
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

// Catch-all route to serve index.html for React Router
app.get("*", (req, res) => {
    // If it's not an API call, serve the index.html
    if (!req.path.startsWith("/api") && !req.path.startsWith("/report")) {
        res.sendFile(path.join(distPath, "index.html"));
    } else {
        res.status(404).send("Not Found");
    }
});

app.listen(port, () => console.log(`Listening on ${port}`));
// push comment 2
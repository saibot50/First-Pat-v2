import express from "express";
import { google } from "googleapis";

const app = express();
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_, res) => res.status(200).send("ok"));

function getTemplateId() {
    const id = process.env.SLIDES_TEMPLATE_ID;
    if (!id) throw new Error("Missing env var SLIDES_TEMPLATE_ID");
    return id;
}

async function getDriveClient() {
    const auth = new google.auth.GoogleAuth({
        scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    });
    const authClient = await auth.getClient();
    return google.drive({ version: "v3", auth: authClient });
}

app.get("/drive-check", async (_req, res) => {
    try {
        const templateId = getTemplateId();
        const drive = await getDriveClient();

        const r = await drive.files.get({
            fileId: templateId,
            supportsAllDrives: true,
            fields: "id,name,mimeType,driveId,modifiedTime",
        });

        res.json({ ok: true, file: r.data });
    } catch (err) {
        res.status(500).json({ ok: false, error: String(err?.message || err) });
    }
});

app.post("/generate-report", async (req, res) => {
    res.json({ ok: true, received: Object.keys(req.body || {}) });
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Listening on ${port}`));
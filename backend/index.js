import express from "express";

const app = express();
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_, res) => res.status(200).send("ok"));

// placeholder endpoint (we’ll wire Drive/Slides/Vertex next)
app.post("/generate-report", async (req, res) => {
    res.json({ ok: true, received: Object.keys(req.body || {}) });
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Listening on ${port}`));

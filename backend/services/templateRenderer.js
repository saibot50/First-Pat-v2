import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function escapeHtml(s) {
    if (typeof s !== 'string') return s;
    return s
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

export const renderTemplate = (templateName, data) => {
    try {
        const templatePath = path.join(__dirname, '..', 'templates', `${templateName}.html`);
        let html = fs.readFileSync(templatePath, 'utf8');

        // Replace all {{key}} with escaped value
        Object.keys(data).forEach(key => {
            const val = data[key] ?? '';
            // We use a regex to replace global instances of {{key}}
            // Safe to assume keys are alphanumeric underscore
            const regex = new RegExp(`{{${key}}}`, 'g');
            html = html.replace(regex, escapeHtml(String(val)));
        });

        return html;
    } catch (error) {
        console.error("Template rendering error", error);
        throw new Error(`Failed to render template: ${templateName}`);
    }
};

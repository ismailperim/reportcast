import fs from 'fs/promises';
import pdf from 'pdf-parse';
export class PDFParser {
    /**
     * Extract text from PDF file
     */
    async extractText(pdfPath) {
        const dataBuffer = await fs.readFile(pdfPath);
        const data = await pdf(dataBuffer);
        // Clean up text (remove excessive whitespace, etc.)
        return data.text
            .replace(/\r\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }
    /**
     * Get PDF metadata
     */
    async getMetadata(pdfPath) {
        const dataBuffer = await fs.readFile(pdfPath);
        const data = await pdf(dataBuffer);
        return {
            pages: data.numpages,
            title: data.info?.Title,
            author: data.info?.Author,
        };
    }
}
//# sourceMappingURL=pdf-parser.js.map
import fs from 'fs/promises';
import pdf from 'pdf-parse';

export class PDFParser {
  /**
   * Extract text from PDF file
   */
  async extractText(pdfPath: string): Promise<string> {
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
  async getMetadata(pdfPath: string): Promise<{
    pages: number;
    title?: string;
    author?: string;
  }> {
    const dataBuffer = await fs.readFile(pdfPath);
    const data = await pdf(dataBuffer);

    return {
      pages: data.numpages,
      title: data.info?.Title,
      author: data.info?.Author,
    };
  }
}

import express, { Request, Response } from 'express';
import cors from 'cors';
import PDFDocument from 'pdfkit';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

interface ExportPdfRequest {
  title: string;
  content: string;
}

app.post('/api/v1/export/pdf', (req: Request<{}, {}, ExportPdfRequest>, res: Response) => {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const doc = new PDFDocument();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="document.pdf"');

    doc.pipe(res);

    doc.fontSize(24).text(title, { align: 'center' });
    doc.moveDown(2);
    doc.fontSize(12).text(content);

    doc.end();
  } catch (error) {
    console.error('Error generating PDF:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error while generating PDF' });
    }
  }
});

app.listen(PORT, () => {
  console.log(`Export service listening on port ${PORT}`);
});

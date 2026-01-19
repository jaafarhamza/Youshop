import { Injectable, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import { TemplateService } from './template.service';

export interface InvoiceItem {
  name: string;
  quantity: number;
  price: number;
  currency: string;
}

export interface InvoiceData {
  orderId: string;
  customerName: string;
  customerEmail: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  paidAt?: Date | string | null;
}

@Injectable()
export class PDFService {
  private readonly logger = new Logger(PDFService.name);

  constructor(private readonly templateService: TemplateService) {}

  async generateInvoice(orderData: InvoiceData): Promise<Buffer> {
    this.logger.log(`Generating PDF invoice for order ${orderData.orderId}`);

    let browser;
    try {
      // 1. Compile HTML
      const html = this.templateService.compileTemplate('invoice', {
        ...orderData,
        date: new Date().toLocaleDateString(),
        paidAt: orderData.paidAt
          ? new Date(orderData.paidAt).toLocaleDateString()
          : 'N/A',
      });

      // 2. Launch Puppeteer
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();

      // 3. Set content and wait
      await page.setContent(html, { waitUntil: 'networkidle0' });

      // 4. Generate PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px',
        },
      });

      return Buffer.from(pdfBuffer);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to generate PDF invoice: ${message}`);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}

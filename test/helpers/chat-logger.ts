export type Event = { role: 'bot'; text: string; buttons?: string[] } | { role: 'user'; text: string };

export class ChatLogger {
  private events: Event[] = [];

  logBot(text: string, buttons?: string[]) {
    this.events.push({ role: 'bot', text, buttons });
  }

  logUser(text: string) {
    this.events.push({ role: 'user', text });
  }

  getEvents() {
    return this.events;
  }
}

import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

export function generatePdf(events: Event[], file: string) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const doc = new PDFDocument({ margin: 40 });
  doc.pipe(fs.createWriteStream(file));
  let y = 40;
  const left = 50;
  const right = 300;
  const lineHeight = 20;

  for (const ev of events) {
    const x = ev.role === 'bot' ? left : right;
    doc.text(ev.text, x, y, {
      width: 200,
    });
    y += lineHeight;
    if (ev.role === 'bot' && ev.buttons) {
      for (const b of ev.buttons) {
        doc.text(`[${b}]`, x + 10, y, { width: 180 });
        y += lineHeight;
      }
    }
    y += 5;
    if (y > doc.page.height - 40) {
      doc.addPage();
      y = 40;
    }
  }

  doc.end();
}

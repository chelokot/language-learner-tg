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

  clear() {
    this.events.length = 0;
  }
}

import type { Bot } from 'grammy';

export function attachLogger(bot: Bot, logger: ChatLogger) {
  bot.api.config.use(async (prev, method, payload, signal) => {
    const result = await prev(method, payload, signal);
    if (method === 'sendMessage' && (result as any).text) {
      const buttons = (
        (result as any).reply_markup?.inline_keyboard ?? []
      )
        .flat()
        .map((b: any) => ('text' in b ? b.text : ''));
      logger.logBot((result as any).text, buttons);
    }
    return result;
  });
}

import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

export function generatePdf(events: Event[], file: string) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const doc = new PDFDocument({ margin: 40 });
  doc.pipe(fs.createWriteStream(file));

  const margin = 40;
  const bubbleWidth = 220;
  const padding = 8;
  const spacing = 12;
  let y = margin;

  for (const ev of events) {
    const isBot = ev.role === 'bot';
    const x = isBot ? margin : doc.page.width - margin - bubbleWidth;

    const textWidth = bubbleWidth - padding * 2;
    const textHeight = doc.heightOfString(ev.text, { width: textWidth });
    let bubbleHeight = textHeight + padding * 2;

    if (isBot && ev.buttons && ev.buttons.length) {
      bubbleHeight += ev.buttons.length * (padding * 1.5 + textHeight / 2) + padding;
    }

    doc.roundedRect(x, y, bubbleWidth, bubbleHeight, 6).fillAndStroke(
      isBot ? '#e6e6e6' : '#cde4ff',
      '#c0c0c0',
    );
    if (!isBot && ev.text.startsWith('tap ')) {
      doc.fillColor('#0066cc');
      doc.font('Helvetica-Oblique');
    } else {
      doc.fillColor('#000');
      doc.font('Helvetica');
    }
    doc.text(ev.text, x + padding, y + padding, { width: textWidth });
    doc.font('Helvetica');
    doc.fillColor('#000');

    let curY = y + padding + textHeight + padding / 2;

    if (isBot && ev.buttons) {
      for (const b of ev.buttons) {
        const btnHeight = textHeight / 2 + padding / 2;
        doc.roundedRect(x + padding, curY, bubbleWidth - padding * 2, btnHeight, 4).stroke('#808080');
        doc.text(b, x + padding + 4, curY + 2, {
          width: bubbleWidth - padding * 2 - 8,
          align: 'center',
        });
        curY += btnHeight + padding / 2;
      }
    }

    y += bubbleHeight + spacing;
    if (y > doc.page.height - margin) {
      doc.addPage();
      y = margin;
    }
  }

  doc.end();
}

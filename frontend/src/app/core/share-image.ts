import { ListingDetail } from './models';

const W = 1080;
const H = 1350;
const FOREST = '#0e3b2e';
const LIME = '#c6f36b';
const ARABIC = /[؀-ۿ]/;

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) {
        break;
      }
    } else {
      line = test;
    }
  }
  if (lines.length < maxLines && line) {
    lines.push(line);
  } else if (lines.length === maxLines) {
    let last = lines[maxLines - 1]!;
    while (ctx.measureText(`${last}…`).width > maxWidth && last.length > 1) {
      last = last.slice(0, -1);
    }
    lines[maxLines - 1] = `${last}…`;
  }
  return lines;
}

function priceLabel(l: ListingDetail): string {
  return l.price === null || l.price === undefined ? 'Prix à discuter' : `${Math.round(l.price).toLocaleString('fr-FR')} DT`;
}

export async function buildListingImage(l: ListingDetail, shortUrl: string): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const font = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

  ctx.fillStyle = FOREST;
  ctx.fillRect(0, 0, W, H);

  const photoH = 780;
  const img = l.photos[0] ? await loadImage(l.photos[0]) : null;
  if (img) {
    const scale = Math.max(W / img.width, photoH / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.drawImage(img, (W - w) / 2, (photoH - h) / 2, w, h);
  } else {
    ctx.fillStyle = '#134a3a';
    ctx.fillRect(0, 0, W, photoH);
  }
  const grad = ctx.createLinearGradient(0, photoH - 160, 0, photoH);
  grad.addColorStop(0, 'rgba(14,59,46,0)');
  grad.addColorStop(1, 'rgba(14,59,46,1)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, photoH - 160, W, 160);

  ctx.fillStyle = LIME;
  roundRect(ctx, 48, 48, 250, 72, 20);
  ctx.fill();
  ctx.fillStyle = FOREST;
  ctx.font = `800 40px ${font}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText('Ferraille', 48 + 125, 86);

  const pad = 64;
  let y = photoH + 20;
  const rtl = ARABIC.test(l.title);
  ctx.textAlign = rtl ? 'right' : 'left';
  ctx.direction = rtl ? 'rtl' : 'ltr';
  const x = rtl ? W - pad : pad;
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 58px ${font}`;
  for (const line of wrap(ctx, l.title, W - pad * 2, 2)) {
    ctx.fillText(line, x, y);
    y += 70;
  }

  const fit = l.fits[0];
  const vehicle = fit && fit.model && fit.model.replace(/[^a-z0-9]/gi, '').length > 0 ? `${fit.make} ${fit.model}` : fit?.make ?? '';
  const meta = [vehicle, l.city].filter(Boolean).join(' · ');
  y += 6;
  ctx.direction = 'ltr';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#d3e3d9';
  ctx.font = `500 34px ${font}`;
  if (meta) {
    ctx.fillText(meta, pad, y);
    y += 56;
  }

  const price = priceLabel(l);
  ctx.font = `800 46px ${font}`;
  const pw = ctx.measureText(price).width + 56;
  ctx.fillStyle = LIME;
  roundRect(ctx, pad, y, pw, 80, 20);
  ctx.fill();
  ctx.fillStyle = FOREST;
  ctx.textBaseline = 'middle';
  ctx.fillText(price, pad + 28, y + 41);

  const bandY = H - 150;
  ctx.fillStyle = LIME;
  ctx.fillRect(0, bandY, W, 150);
  ctx.fillStyle = FOREST;
  ctx.textAlign = 'left';
  ctx.font = `600 30px ${font}`;
  ctx.fillText('Contact direct WhatsApp · gratuit', pad, bandY + 48);
  ctx.font = `800 50px ${font}`;
  ctx.fillText(shortUrl, pad, bandY + 102);

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('image'))), 'image/jpeg', 0.9),
  );
}

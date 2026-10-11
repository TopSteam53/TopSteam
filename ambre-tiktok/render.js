// Usage:
//   node render.js video out.mp4          -> full 12 s video (30 fps, H.264, no audio)
//   node render.js stills outdir 0.3,4.5  -> PNG stills at given seconds
//   node render.js frames outdir          -> all 360 frames as PNG (encode later with ENCODE_ARGS)
// Run `npm install` first. Needs ffmpeg on PATH and the
// CHROMIUM env var pointing at a Chromium binary.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('playwright-core');

const FPS = 30;
// Static (non-temporal) luma dither hides gradient banding without bloating the bitrate.
const ENCODE_ARGS = ['-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p,noise=c0s=3:c0f=u',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-profile:v', 'high', '-level', '4.2',
  '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-movflags', '+faststart', '-an'];
const [mode, out, times] = process.argv.slice(2);

function fontCss() {
  const pkg = path.dirname(require.resolve('@fontsource/cormorant-garamond/package.json'));
  const files = ['500.css', '600.css', '700.css', '500-italic.css', '600-italic.css'];
  return files.map(f => fs.readFileSync(path.join(pkg, f), 'utf8')
    .replace(/url\(\.\/files\/([^)]+\.woff2)\) format\('woff2'\), url\([^)]+\) format\('woff'\)/g, (_, name) =>
      `url(data:font/woff2;base64,${fs.readFileSync(path.join(pkg, 'files', name)).toString('base64')}) format('woff2')`)
  ).join('\n');
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM, args: ['--disable-gpu'] });
  const page = await browser.newPage();
  const scene = fs.readFileSync(path.join(__dirname, 'scene.js'), 'utf8');
  await page.setContent(`<!doctype html><html><head><style>${fontCss()}body{margin:0;background:#000}</style></head>
    <body><canvas id="c"></canvas><script>${scene}</script></body></html>`);
  await page.evaluate(async () => {
    const sample = 'АаЯяЁёAmbre’·';
    for (const f of ['500', '600', '700', 'italic 500', 'italic 600']) await document.fonts.load(`${f} 100px "Cormorant Garamond"`, sample);
    await document.fonts.ready;
  });

  const grab = async t => {
    const url = await page.evaluate(t => { renderFrame(t); return document.getElementById('c').toDataURL('image/png'); }, t);
    return Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
  };

  if (mode === 'stills') {
    fs.mkdirSync(out, { recursive: true });
    for (const t of times.split(',').map(Number)) {
      fs.writeFileSync(path.join(out, `t${t.toFixed(2)}.png`), await grab(t));
    }
  } else if (mode === 'frames') {
    fs.mkdirSync(out, { recursive: true });
    for (let i = 0; i < FPS * 12; i++) fs.writeFileSync(path.join(out, `f${String(i).padStart(4, '0')}.png`), await grab(i / FPS));
  } else {
    const total = Math.round(FPS * 12);
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
      ...ENCODE_ARGS, out], { stdio: ['pipe', 'inherit', 'inherit'] });
    const done = new Promise((res, rej) => ff.on('close', code => code ? rej(new Error('ffmpeg ' + code)) : res()));
    for (let i = 0; i < total; i++) {
      const buf = await grab(i / FPS);
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (i % 30 === 0) process.stdout.write(`frame ${i}/${total}\n`);
    }
    ff.stdin.end();
    await done;
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });

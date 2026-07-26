import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { chromium } from 'playwright';

const port = 8766;
const baseUrl = `http://127.0.0.1:${port}`;
const server = spawn('php', ['-S', `127.0.0.1:${port}`], {
  cwd: new URL('..', import.meta.url),
  stdio: ['ignore', 'pipe', 'pipe'],
});

function forecastFixture() {
  const time = [];
  for (let day = 0; day < 3; day += 1) {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + day);
    const prefix = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-');
    for (let hour = 0; hour < 24; hour += 1) {
      time.push(`${prefix}T${String(hour).padStart(2, '0')}:00`);
    }
  }
  const fill = value => Array(time.length).fill(value);
  return {
    hourly: {
      time,
      temperature_2m: fill(22),
      apparent_temperature: fill(21),
      relative_humidity_2m: fill(55),
      precipitation_probability: fill(10),
      precipitation: fill(0),
      wind_speed_10m: fill(8),
      wind_gusts_10m: fill(14),
      uv_index: fill(4),
      weather_code: fill(1),
    },
  };
}

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {
      // Sunucunun dinlemeye başlamasını bekle.
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('PHP test sunucusu başlatılamadı.');
}

let browser;
try {
  await waitForServer();
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    serviceWorkers: 'allow',
    permissions: ['geolocation'],
    geolocation: { latitude: 41.0082, longitude: 28.9784 },
  });
  const page = await context.newPage();
  await page.route('https://api.open-meteo.com/v1/forecast?**', route => (
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(forecastFixture()) })
  ));

  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.locator('#btn-start').focus();
  await page.evaluate(() => openModal(document.getElementById('os-select-modal')));
  assert.equal(await page.locator('#os-select-modal').isVisible(), true);
  assert.equal(await page.locator('#app').evaluate(element => element.inert), true);
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'btn-select-android');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#os-select-modal').isHidden(), true);
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'btn-start');

  await page.getByRole('button', { name: 'Başlayalım →' }).click();
  assert.equal(await page.locator('.date-btn').count(), 3);
  await page.locator('.date-btn[data-day="2"]').click();
  await page.getByRole('button', { name: '🥵 Çabuk terlerim' }).click();
  await page.getByRole('button', { name: '🏃 Spor' }).click();
  assert.equal(await page.locator('.date-btn[data-day="2"]').getAttribute('aria-pressed'), 'true');
  await page.getByRole('button', { name: '📍 Konumumu kullan' }).click();
  await assert.doesNotReject(() => page.getByText('Mevcut konum seçildi.').waitFor({ state: 'visible' }));
  assert.equal(await page.getByRole('button', { name: 'Kıyafet Seç →' }).isEnabled(), true);
  assert.equal(await page.locator('#screen-loading').getAttribute('aria-hidden'), 'true');
  assert.equal(await page.locator('#screen-1').getAttribute('aria-hidden'), 'false');
  await page.getByRole('button', { name: 'Kıyafet Seç →' }).click();
  await page.getByRole('button', { name: '👕 Tişört' }).click();
  await page.getByRole('button', { name: '👖 Pantolon' }).click();
  await page.getByRole('button', { name: '🌧️ Yağmurluk' }).click();
  await page.getByRole('button', { name: '👟 Spor' }).click();
  await page.getByRole('button', { name: '🧢 Şapka' }).click();
  await page.getByRole('button', { name: 'Analiz Et ✨' }).click();
  await page.locator('#screen-3.active').waitFor({ state: 'visible' });
  assert.equal(await page.getByText('📅 Ertesi gün').isVisible(), true);
  assert.equal(await page.locator('#decision-metrics').getByText('Çabuk terler').isVisible(), true);
  assert.equal(await page.locator('#decision-metrics .metric-card').count(), 8);

  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    if (!registration.active) throw new Error('Service Worker etkinleşmedi.');
  });
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(
    await page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    true,
    'Sayfa Service Worker tarafından kontrol edilmeli.'
  );

  await page.getByRole('button', { name: 'Başlayalım →' }).click();
  await page.getByRole('button', { name: 'Kıyafet Seç →' }).click();
  await page.unroute('https://api.open-meteo.com/v1/forecast?**');
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Analiz Et ✨' }).click();
  await page.getByText('⚠️ Son kayıtlı tahmin').waitFor({ state: 'visible' });
  assert.equal(await page.getByText('⚠️ Son kayıtlı tahmin').isVisible(), true);

  await page.reload({ waitUntil: 'domcontentloaded' });
  assert.equal(await page.title(), 'Bugün Ne Giysem?');
  assert.equal(await page.locator('#btn-start').isVisible(), true);

  const cachedAssets = await page.evaluate(async () => {
    const cache = await caches.open('negiysem-static-v5');
    const keys = await cache.keys();
    return keys.map(request => new URL(request.url).pathname);
  });
  for (const asset of ['/', '/index.html', '/style.css', '/app.js', '/manifest.json']) {
    assert.ok(cachedAssets.includes(asset), `${asset} uygulama cache'inde bulunmalı.`);
  }

  console.log('✔ Service Worker çevrimdışı entegrasyon testi geçti');
} finally {
  await browser?.close();
  server.kill('SIGTERM');
  if (server.exitCode === null) await once(server, 'exit');
}

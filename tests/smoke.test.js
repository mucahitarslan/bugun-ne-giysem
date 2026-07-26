'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const html = read('index.html');
const app = read('app.js');
const worker = read('service-worker.js');
const manifest = JSON.parse(read('manifest.json'));

test('JavaScript dosyaları geçerli sözdizimine sahip', () => {
  assert.doesNotThrow(() => new vm.Script(app));
  assert.doesNotThrow(() => new vm.Script(worker));
});

test('manifest gerekli PWA alanlarını ve ikonları içeriyor', () => {
  assert.equal(manifest.id, './');
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.scope, './');
  assert.equal(manifest.display, 'standalone');
  assert.deepEqual(manifest.icons.map(icon => icon.sizes), ['192x192', '512x512']);
});

test('HTML kaynakları uygulama kabuğundaki URLlerle eşleşiyor', () => {
  assert.match(html, /href="style\.css"/);
  assert.match(html, /src="app\.js"/);
  assert.match(worker, /'\.\/style\.css'/);
  assert.match(worker, /'\.\/app\.js'/);
  assert.doesNotMatch(html, /(?:app\.js|style\.css)\?v=/);
});

test('kıyafet seçimleri erişilebilir butonlardan oluşuyor', () => {
  const buttons = html.match(/<button type="button" class="outfit-btn"/g) || [];
  assert.equal(buttons.length, 14);
  assert.doesNotMatch(html, /user-scalable=no|maximum-scale=/);
});

test('güncel Open-Meteo alanları kullanılıyor', () => {
  assert.match(app, /wind_speed_10m/);
  assert.match(app, /weather_code/);
  assert.doesNotMatch(app, /windspeed_10m|weathercode/);
});

test('çok soğuk sandalet uyarısı genel serin uyarısından önce değerlendirilir', () => {
  const sectionStart = app.indexOf("shoes === 'sandalet'");
  const coldDanger = app.indexOf('avgTemp < 14', sectionStart);
  const coolWarning = app.indexOf('avgTemp < 18', coldDanger);
  assert.ok(sectionStart > -1 && coldDanger > sectionStart && coolWarning > coldDanger);
});

test('tercihler güvenli biçimde tarayıcı depolamasına yazılır', () => {
  assert.match(app, /localStorage\.setItem\(STORAGE_KEY/);
  assert.match(app, /restorePreferences\(\)/);
});

test('üç günlük tahmin, konum seçenekleri ve veri atıfları arayüzde bulunur', () => {
  assert.match(app, /forecast_days: '3'/);
  assert.match(html, /id="date-options"/);
  assert.match(html, /id="btn-use-location"/);
  assert.match(html, /id="district-query"/);
  assert.match(html, /Open-Meteo/);
  assert.match(html, /OpenStreetMap/);
});

test('modallar erişilebilir diyalog semantiğine sahiptir', () => {
  assert.equal((html.match(/role="dialog"/g) || []).length, 2);
  assert.equal((html.match(/aria-modal="true"/g) || []).length, 2);
  assert.doesNotMatch(html, /style="/);
  assert.match(app, /handleModalKeyboard/);
});

test('hava verisi için sınırlı süreli çevrimdışı fallback bulunur', () => {
  assert.match(app, /WEATHER_CACHE_MAX_AGE/);
  assert.match(app, /getCachedWeatherResponse/);
  assert.match(app, /Son kayıtlı tahmin/);
});

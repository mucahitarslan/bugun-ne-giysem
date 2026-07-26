'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  analyzeOutfit,
  getMostSignificantWeatherCode,
  validateWeatherResponse,
} = require('../app.js');

function weather(overrides = {}) {
  return {
    minTemp: 18,
    maxTemp: 22,
    avgTemp: 20,
    feelsLike: 19,
    willRain: false,
    rainAmount: 0,
    maxRainProb: 10,
    windSpeed: 8,
    windGust: 14,
    humidity: 50,
    uvIndex: 3,
    weatherCode: 1,
    ...overrides,
  };
}

test('zaman aralığındaki en riskli hava kodu temsil edilir', () => {
  assert.equal(getMostSignificantWeatherCode([0, 2, 95, 3]), 95);
  assert.equal(getMostSignificantWeatherCode([1, 63, 45]), 63);
  assert.equal(getMostSignificantWeatherCode([0, 1, 2]), 2);
});

test('çok sıcak havada mont ve bot tehlikeli değerlendirilir', () => {
  const result = analyzeOutfit(
    weather({ minTemp: 30, maxTemp: 34, avgTemp: 32, feelsLike: 35 }),
    { top: 'mont', bottom: 'pantolon', shoes: 'bot' }
  );
  assert.ok(result.tips.filter(tip => tip.type === 'danger').length >= 2);
  assert.equal(result.verdict.cls, 'bad');
});

test('soğuk havada sandalet tehlike uyarısı üretir', () => {
  const result = analyzeOutfit(
    weather({ minTemp: 4, maxTemp: 9, avgTemp: 7, feelsLike: 3 }),
    { top: 'mont', bottom: 'pantolon', shoes: 'sandalet' }
  );
  assert.ok(result.tips.some(tip => tip.type === 'danger' && tip.text.includes('sandalet')));
});

test('yoğun yağmurda loafer ve korumasız kombinasyon uyarılır', () => {
  const result = analyzeOutfit(
    weather({ willRain: true, rainAmount: 3.2, maxRainProb: 90, weatherCode: 65 }),
    { top: 'gomlek', bottom: 'etek', shoes: 'loafer' }
  );
  assert.ok(result.tips.some(tip => tip.type === 'danger' && tip.text.includes('loafer')));
  assert.ok(result.tips.some(tip => tip.type === 'danger' && tip.text.includes('Yoğun yağış')));
});

test('şiddetli rüzgâr ek güvenlik uyarısı üretir', () => {
  const result = analyzeOutfit(
    weather({ windSpeed: 48, feelsLike: 12 }),
    { top: 'hirka', bottom: 'etek', shoes: 'spor' }
  );
  assert.ok(result.tips.some(tip => tip.type === 'danger' && tip.text.includes('rüzgar')));
});

test('eksik saatlik API yanıtı reddedilir', () => {
  assert.throws(
    () => validateWeatherResponse({ hourly: { time: ['2026-07-26T09:00'] } }),
    /eksik veya tutarsız/
  );
});

test('yüksek UV ve nem kişisel koruma önerileri üretir', () => {
  const result = analyzeOutfit(
    weather({ minTemp: 26, maxTemp: 31, avgTemp: 28, humidity: 82, uvIndex: 7.4 }),
    { top: 'tisort', bottom: 'sort', outer: 'yok', shoes: 'spor', accessories: [] },
    { sensitivity: 'hot', activity: 'walking' }
  );
  assert.ok(result.tips.some(tip => tip.text.includes('UV indeksi')));
  assert.ok(result.tips.some(tip => tip.text.includes('Nem %82')));
});

test('kişisel hassasiyet ve aktivite ağır katmanları etkiler', () => {
  const result = analyzeOutfit(
    weather({ minTemp: 21, maxTemp: 27, avgTemp: 24 }),
    { top: 'sweatshirt', bottom: 'pantolon', outer: 'kaban', shoes: 'spor', accessories: [] },
    { sensitivity: 'hot', activity: 'sport' }
  );
  assert.ok(result.tips.some(tip => tip.text.includes('Çabuk terlediğini')));
  assert.ok(result.tips.some(tip => tip.text.includes('Hareket seviyen')));
});

test('yağış aksesuarı ve su geçirmez ayakkabı olumlu değerlendirilir', () => {
  const result = analyzeOutfit(
    weather({ willRain: true, rainAmount: 1.5, maxRainProb: 80 }),
    { top: 'gomlek', bottom: 'pantolon', outer: 'yagmurluk', shoes: 'waterproof', accessories: ['umbrella'] }
  );
  assert.ok(result.tips.some(tip => tip.type === 'success' && tip.text.includes('Su geçirmez')));
  assert.ok(result.tips.some(tip => tip.type === 'success' && tip.text.includes('Şemsiye')));
});

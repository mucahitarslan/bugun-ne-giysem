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

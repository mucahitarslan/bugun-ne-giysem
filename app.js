'use strict';

const state = {
  lat: null,
  lon: null,
  locationName: '',
  selectedDay: 0,
  sensitivity: 'balanced',
  activity: 'normal',
  startHour: 9,
  endHour: 18,
  outfit: { top: null, bottom: null, outer: 'yok', shoes: null, accessories: [] },
  rawWeather: null,
  weather: null,
  weatherIsCached: false,
};
const STORAGE_KEY = 'bugun-ne-giysem-preferences-v1';
const WEATHER_CACHE_KEY = 'bugun-ne-giysem-weather-v1';
const WEATHER_CACHE_MAX_AGE = 3 * 60 * 60 * 1000;

function savePreferences() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      locationName: state.locationName,
      lat: state.lat,
      lon: state.lon,
      selectedDay: state.selectedDay,
      sensitivity: state.sensitivity,
      activity: state.activity,
      startHour: state.startHour,
      endHour: state.endHour,
      outfit: state.outfit,
    }));
  } catch {
    // Gizli mod veya kapalı depolama uygulamanın çalışmasını engellememeli.
  }
}

function restorePreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || typeof saved !== 'object') return;

    const cityIndex = TURKISH_CITIES.findIndex(city => city.name === saved.locationName);
    if (cityIndex >= 0) {
      const city = TURKISH_CITIES[cityIndex];
      state.lat = city.lat;
      state.lon = city.lon;
      state.locationName = city.name;
      document.getElementById('city-select').value = String(cityIndex);
    } else if (saved.locationName && Number.isFinite(Number(saved.lat)) && Number.isFinite(Number(saved.lon))) {
      state.lat = String(saved.lat);
      state.lon = String(saved.lon);
      state.locationName = saved.locationName;
    }

    if (Number.isInteger(saved.selectedDay) && saved.selectedDay >= 0 && saved.selectedDay <= 2) {
      state.selectedDay = saved.selectedDay;
    }
    if (['cold', 'balanced', 'hot'].includes(saved.sensitivity)) state.sensitivity = saved.sensitivity;
    if (['vehicle', 'normal', 'walking', 'sport'].includes(saved.activity)) state.activity = saved.activity;
    if (Number.isInteger(saved.startHour) && saved.startHour >= 6 && saved.startHour <= 23) {
      state.startHour = saved.startHour;
      document.getElementById('time-start').value = String(saved.startHour);
    }
    if (Number.isInteger(saved.endHour) && saved.endHour >= 6 && saved.endHour <= 23) {
      state.endHour = saved.endHour;
      document.getElementById('time-end').value = String(saved.endHour);
    }

    ['top', 'bottom', 'outer', 'shoes'].forEach(cat => {
      const val = saved.outfit?.[cat];
      const button = document.querySelector(`.outfit-btn[data-cat="${cat}"][data-val="${val}"]`);
      if (!button) return;
      state.outfit[cat] = val;
      button.classList.add('selected');
      button.setAttribute('aria-pressed', 'true');
      updateCategoryBadge(cat, button.querySelector('.o-name').textContent);
    });
    state.outfit.accessories = Array.isArray(saved.outfit?.accessories)
      ? saved.outfit.accessories.filter(value => ['umbrella', 'hat', 'scarf', 'gloves', 'thermal'].includes(value))
      : [];
    document.querySelectorAll('.accessory-btn').forEach(button => {
      const selected = state.outfit.accessories.includes(button.dataset.val);
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    const accessoryBadge = document.getElementById('badge-accessories');
    accessoryBadge.textContent = state.outfit.accessories.length
      ? `✓ ${state.outfit.accessories.length} seçildi`
      : 'İsteğe bağlı';
    accessoryBadge.classList.toggle('done', state.outfit.accessories.length > 0);

    const { top, bottom, shoes } = state.outfit;
    document.getElementById('btn-analyze').disabled = !(top && bottom && shoes);
    updateDateSelection();
    updateProfileSelection();
    updateDurationTag();
  } catch {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Depolama tamamen kapalıysa kayıtlı tercihleri yok say.
    }
  }
}

// -- DÜZELTİLMİŞ EKRAN GEÇİŞ FONKSİYONU --
function goTo(toId, back = false) {
  const current = document.querySelector('.screen.active');
  const target  = document.getElementById(toId);
  if (!current || !target || current === target) return;

  target.style.transition = 'none';
  target.style.transform  = back ? 'translateX(-30%)' : 'translateX(100%)';
  
  void target.offsetWidth;
  
  target.style.transition = '';
  // CSS sınıflarının (translateX(0)) düzgün çalışması için satır içi stili temizle
  target.style.transform = '';

  current.classList.remove('active');
  target.classList.add('active');
  current.setAttribute('aria-hidden', 'true');
  current.inert = true;
  target.setAttribute('aria-hidden', 'false');
  target.inert = false;

  current.style.transform = back ? 'translateX(100%)' : 'translateX(-30%)';
  
  setTimeout(() => { 
    current.style.transform = ''; 
    const heading = target.querySelector('h1, h2, h3');
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  }, 460);
}

function showLoading(msg = 'Hava durumu alınıyor...') {
  const overlay = document.getElementById('loading-overlay');
  document.getElementById('spinner-text').textContent = msg;
  overlay.hidden = false;
}
function hideLoading() {
  document.getElementById('loading-overlay').hidden = true;
}

function showToast(msg) {
  const toast = document.getElementById('error-toast');
  document.getElementById('toast-msg').textContent = msg;
  toast.hidden = false;
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => { toast.hidden = true; }, 4000);
}

function populateTimeSelects() {
  const startSel = document.getElementById('time-start');
  const endSel   = document.getElementById('time-end');

  for (let h = 6; h <= 23; h++) {
    const label = `${String(h).padStart(2,'0')}:00`;
    startSel.add(new Option(label, h));
    endSel.add(new Option(label, h));
  }
  startSel.value = 9;
  endSel.value   = 18;
  state.startHour = 9;
  state.endHour   = 18;
  updateDurationTag();
}

function getForecastDate(dayOffset = state.selectedDay) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + dayOffset);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function initDateSelection() {
  const container = document.getElementById('date-options');
  const labels = ['Bugün', 'Yarın', 'Ertesi gün'];

  labels.forEach((label, day) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'date-btn';
    button.dataset.day = String(day);
    button.setAttribute('aria-pressed', 'false');
    const dateLabel = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' })
      .format(new Date(`${getForecastDate(day)}T12:00:00`));
    button.textContent = `${label} · ${dateLabel}`;
    button.addEventListener('click', () => {
      state.selectedDay = day;
      updateDateSelection();
      savePreferences();
    });
    container.appendChild(button);
  });
  updateDateSelection();
}

function updateDateSelection() {
  document.querySelectorAll('.date-btn').forEach(button => {
    const selected = Number(button.dataset.day) === state.selectedDay;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
}

function initProfileSelection() {
  document.querySelectorAll('.profile-btn').forEach(button => {
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => {
      state.sensitivity = button.dataset.val;
      updateProfileSelection();
      savePreferences();
    });
  });
  document.querySelectorAll('.activity-btn').forEach(button => {
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => {
      state.activity = button.dataset.val;
      updateProfileSelection();
      savePreferences();
    });
  });
  updateProfileSelection();
}

function updateProfileSelection() {
  document.querySelectorAll('.profile-btn').forEach(button => {
    const selected = button.dataset.val === state.sensitivity;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  document.querySelectorAll('.activity-btn').forEach(button => {
    const selected = button.dataset.val === state.activity;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
}

function updateDurationTag() {
  const tag = document.getElementById('duration-tag');
  const diff = state.endHour - state.startHour;
  
  if (diff <= 0) {
    tag.textContent = '⚠️ Dönüş saati çıkış saatinden önce olamaz';
    tag.style.color = '#fca5a5';
    document.getElementById('btn-step1-next').disabled = true;
  } else {
    const dayLabel = ['Bugün', 'Yarın', 'Ertesi gün'][state.selectedDay];
    tag.textContent = `⏱ ${dayLabel}, ${diff} saat dışarıdasın (${String(state.startHour).padStart(2,'0')}:00 – ${String(state.endHour).padStart(2,'0')}:00)`;
    tag.style.color = '';
    // Konum seçiliyse butonu aktif et
    document.getElementById('btn-step1-next').disabled = !state.lat;
  }
}

const TURKISH_CITIES = [
  // Öncelikli Büyük Şehirler
  { name: "İstanbul", lat: "41.0082", lon: "28.9784" },
  { name: "Ankara", lat: "39.9334", lon: "32.8597" },
  { name: "İzmir", lat: "38.4192", lon: "27.1287" },
  { name: "Sakarya", lat: "40.7569", lon: "30.3783" },
  
  // Diğer Tüm Şehirler (Alfabetik Sırayla)
  { name: "Adana", lat: "37.0000", lon: "35.3213" },
  { name: "Adıyaman", lat: "37.7648", lon: "38.2786" },
  { name: "Afyonkarahisar", lat: "38.7507", lon: "30.5567" },
  { name: "Ağrı", lat: "39.7191", lon: "43.0503" },
  { name: "Aksaray", lat: "38.3687", lon: "34.0370" },
  { name: "Amasya", lat: "40.6499", lon: "35.8353" },
  { name: "Antalya", lat: "36.8969", lon: "30.7133" },
  { name: "Ardahan", lat: "41.1105", lon: "42.7022" },
  { name: "Artvin", lat: "41.1828", lon: "41.8183" },
  { name: "Aydın", lat: "37.8380", lon: "27.8456" },
  { name: "Balıkesir", lat: "39.6484", lon: "27.8826" },
  { name: "Bartın", lat: "41.6344", lon: "32.3375" },
  { name: "Batman", lat: "37.8812", lon: "41.1351" },
  { name: "Bayburt", lat: "40.2603", lon: "40.2280" },
  { name: "Bilecik", lat: "40.1451", lon: "29.9798" },
  { name: "Bingöl", lat: "38.8847", lon: "40.4939" },
  { name: "Bitlis", lat: "38.4006", lon: "42.1095" },
  { name: "Bolu", lat: "40.7392", lon: "31.6116" },
  { name: "Burdur", lat: "37.7183", lon: "30.2823" },
  { name: "Bursa", lat: "40.1826", lon: "29.0665" },
  { name: "Çanakkale", lat: "40.1553", lon: "26.4142" },
  { name: "Çankırı", lat: "40.6013", lon: "33.6134" },
  { name: "Çorum", lat: "40.5499", lon: "34.9537" },
  { name: "Denizli", lat: "37.7765", lon: "29.0864" },
  { name: "Diyarbakır", lat: "37.9144", lon: "40.2306" },
  { name: "Düzce", lat: "40.8387", lon: "31.1626" },
  { name: "Edirne", lat: "41.6771", lon: "26.5557" },
  { name: "Elazığ", lat: "38.6748", lon: "39.2225" },
  { name: "Erzincan", lat: "39.7500", lon: "39.5000" },
  { name: "Erzurum", lat: "39.9043", lon: "41.2679" },
  { name: "Eskişehir", lat: "39.7767", lon: "30.5206" },
  { name: "Gaziantep", lat: "37.0662", lon: "37.3833" },
  { name: "Giresun", lat: "40.9128", lon: "38.3895" },
  { name: "Gümüşhane", lat: "40.4608", lon: "39.4816" },
  { name: "Hakkari", lat: "37.5744", lon: "43.7408" },
  { name: "Hatay", lat: "36.2000", lon: "36.1667" },
  { name: "Iğdır", lat: "39.9237", lon: "44.0450" },
  { name: "Isparta", lat: "37.7648", lon: "30.5566" },
  { name: "Kahramanmaraş", lat: "37.5753", lon: "36.9228" },
  { name: "Karabük", lat: "41.1956", lon: "32.6227" },
  { name: "Karaman", lat: "37.1810", lon: "33.2222" },
  { name: "Kars", lat: "40.6013", lon: "43.0940" },
  { name: "Kastamonu", lat: "41.3766", lon: "33.7765" },
  { name: "Kayseri", lat: "38.7312", lon: "35.4787" },
  { name: "Kırıkkale", lat: "39.8398", lon: "33.5089" },
  { name: "Kırklareli", lat: "41.7351", lon: "27.2252" },
  { name: "Kırşehir", lat: "39.1458", lon: "34.1639" },
  { name: "Kilis", lat: "36.7161", lon: "37.1150" },
  { name: "Kocaeli", lat: "40.7654", lon: "29.9408" },
  { name: "Konya", lat: "37.8665", lon: "32.4830" },
  { name: "Kütahya", lat: "39.4242", lon: "29.9833" },
  { name: "Malatya", lat: "38.3552", lon: "38.3095" },
  { name: "Manisa", lat: "38.6191", lon: "27.4289" },
  { name: "Mardin", lat: "37.3122", lon: "40.7340" },
  { name: "Mersin", lat: "36.8000", lon: "34.6333" },
  { name: "Muğla", lat: "37.2153", lon: "28.3636" },
  { name: "Muş", lat: "38.7304", lon: "41.4990" },
  { name: "Nevşehir", lat: "38.6244", lon: "34.7144" },
  { name: "Niğde", lat: "37.9698", lon: "34.6758" },
  { name: "Ordu", lat: "40.9862", lon: "37.8797" },
  { name: "Osmaniye", lat: "37.0742", lon: "36.2475" },
  { name: "Rize", lat: "41.0201", lon: "40.5234" },
  { name: "Samsun", lat: "41.2867", lon: "36.3300" },
  { name: "Siirt", lat: "37.9333", lon: "41.9500" },
  { name: "Sinop", lat: "42.0231", lon: "35.1531" },
  { name: "Sivas", lat: "39.7477", lon: "37.0179" },
  { name: "Şanlıurfa", lat: "37.1674", lon: "38.7955" },
  { name: "Şırnak", lat: "37.5228", lon: "42.4594" },
  { name: "Tekirdağ", lat: "40.9780", lon: "27.5110" },
  { name: "Tokat", lat: "40.3222", lon: "36.5528" },
  { name: "Trabzon", lat: "41.0015", lon: "39.7178" },
  { name: "Tunceli", lat: "39.1062", lon: "39.5481" },
  { name: "Uşak", lat: "38.6742", lon: "29.4059" },
  { name: "Van", lat: "38.4891", lon: "43.3894" },
  { name: "Yalova", lat: "40.6550", lon: "29.2769" },
  { name: "Yozgat", lat: "39.8181", lon: "34.8147" },
  { name: "Zonguldak", lat: "41.4564", lon: "31.7987" }
];

function initCitySelection() {
  const citySel = document.getElementById('city-select');
  
  TURKISH_CITIES.forEach((city, index) => {
    citySel.add(new Option(city.name, index));
  });

  citySel.addEventListener('change', function() {
    const selectedCity = TURKISH_CITIES[this.value];
    setLocation(selectedCity.lat, selectedCity.lon, selectedCity.name);
  });
}

function setLocation(lat, lon, name) {
  state.lat = String(lat);
  state.lon = String(lon);
  state.locationName = name;
  updateDurationTag();
  savePreferences();
}

function setLocationMode(mode) {
  const manual = mode === 'manual';
  const manualButton = document.getElementById('btn-manual-location');
  const locationButton = document.getElementById('btn-use-location');
  manualButton.classList.toggle('selected', manual);
  manualButton.setAttribute('aria-pressed', String(manual));
  locationButton.classList.toggle('selected', !manual);
  locationButton.setAttribute('aria-pressed', String(!manual));
  document.getElementById('location-card').hidden = !manual;
  document.getElementById('district-card').hidden = !manual;
}

async function searchDistricts() {
  const query = document.getElementById('district-query').value.trim();
  const resultsEl = document.getElementById('district-results');
  if (query.length < 3) {
    showToast('İlçe veya yer adı en az 3 karakter olmalı.');
    return;
  }

  const searchButton = document.getElementById('btn-search-district');
  searchButton.disabled = true;
  searchButton.textContent = 'Aranıyor…';
  resultsEl.hidden = true;

  try {
    const selectedCity = document.getElementById('city-select').selectedOptions[0]?.textContent;
    const locationQuery = selectedCity && selectedCity !== 'Şehir seçiniz...'
      ? `${query}, ${selectedCity}, Türkiye`
      : `${query}, Türkiye`;
    const params = new URLSearchParams({
      q: locationQuery,
      format: 'jsonv2',
      countrycodes: 'tr',
      limit: '8',
      addressdetails: '1',
      'accept-language': 'tr',
    });
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error('Konum araması şu anda kullanılamıyor.');
    const data = await response.json();
    const results = Array.isArray(data) ? data : [];
    resultsEl.replaceChildren();

    if (results.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'district-empty';
      empty.textContent = 'Türkiye içinde eşleşen bir yer bulunamadı.';
      resultsEl.appendChild(empty);
    } else {
      results.forEach(result => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'district-result';
        button.setAttribute('role', 'option');
        const title = document.createElement('strong');
        title.textContent = result.name;
        const detail = document.createElement('small');
        detail.textContent = result.display_name;
        button.append(title, detail);
        button.addEventListener('click', () => {
          const fullName = [result.name, result.address?.province || result.address?.state].filter(Boolean).join(', ');
          setLocation(result.lat, result.lon, fullName);
          document.getElementById('city-select').value = '';
          document.getElementById('district-query').value = fullName;
          resultsEl.hidden = true;
          showToast(`${fullName} seçildi.`);
        });
        resultsEl.appendChild(button);
      });
    }
    resultsEl.hidden = false;
  } catch (error) {
    showToast(error.message || 'Konum araması tamamlanamadı.');
  } finally {
    searchButton.disabled = false;
    searchButton.textContent = 'Ara';
  }
}

async function reverseGeocode(lat, lon) {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    format: 'jsonv2',
    zoom: '12',
    addressdetails: '1',
    'accept-language': 'tr',
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error('Konum adı belirlenemedi.');

  const data = await response.json();
  const address = data.address || {};
  const district = address.town
    || address.municipality
    || address.city_district
    || address.district
    || address.county
    || address.city;
  const province = address.province || address.state || address.city;
  const parts = [district, province].filter((value, index, values) => (
    value && values.indexOf(value) === index
  ));
  return parts.join(', ') || data.name || 'Mevcut konum';
}

function useCurrentLocation() {
  if (!navigator.geolocation) {
    showToast('Tarayıcınız konum özelliğini desteklemiyor.');
    setLocationMode('manual');
    return;
  }

  const button = document.getElementById('btn-use-location');
  button.disabled = true;
  button.textContent = '📍 Konum alınıyor…';
  navigator.geolocation.getCurrentPosition(
    async position => {
      const { latitude, longitude } = position.coords;
      let locationName = 'Mevcut konum';
      try {
        locationName = await reverseGeocode(latitude, longitude);
      } catch {
        // Koordinatlar kullanılabilir; yalnızca okunabilir konum adı alınamadı.
      }
      setLocation(latitude, longitude, locationName);
      document.getElementById('district-query').value = locationName;
      button.disabled = false;
      button.textContent = '📍 Konumumu kullan';
      showToast(`${locationName} seçildi.`);
    },
    () => {
      button.disabled = false;
      button.textContent = '📍 Konumumu kullan';
      setLocationMode('manual');
      showToast('Konum alınamadı. İzinleri kontrol edin veya manuel seçim yapın.');
    },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
  );
}

function initOutfitSelection() {
  document.querySelectorAll('.outfit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.cat;
      const val = btn.dataset.val;

      document.querySelectorAll(`.outfit-btn[data-cat="${cat}"]`).forEach(b => {
        b.classList.remove('selected');
        b.setAttribute('aria-pressed', 'false');
      });

      btn.classList.add('selected');
      btn.setAttribute('aria-pressed', 'true');
      state.outfit[cat] = val;
      updateCategoryBadge(cat, btn.querySelector('.o-name').textContent);
      savePreferences();

      const { top, bottom, shoes } = state.outfit;
      document.getElementById('btn-analyze').disabled = !(top && bottom && shoes);
    });
  });
}

function initAccessorySelection() {
  document.querySelectorAll('.accessory-btn').forEach(button => {
    button.addEventListener('click', () => {
      const value = button.dataset.val;
      const selected = state.outfit.accessories.includes(value);
      state.outfit.accessories = selected
        ? state.outfit.accessories.filter(item => item !== value)
        : [...state.outfit.accessories, value];
      button.classList.toggle('selected', !selected);
      button.setAttribute('aria-pressed', String(!selected));
      const badge = document.getElementById('badge-accessories');
      badge.textContent = state.outfit.accessories.length
        ? `✓ ${state.outfit.accessories.length} seçildi`
        : 'İsteğe bağlı';
      badge.classList.toggle('done', state.outfit.accessories.length > 0);
      savePreferences();
    });
  });
}

function updateCategoryBadge(cat, name) {
  const map = { top: 'badge-top', bottom: 'badge-bottom', outer: 'badge-outer', shoes: 'badge-shoes' };
  const badge = document.getElementById(map[cat]);
  if (!badge) return;
  badge.textContent = `✓ ${name}`;
  badge.classList.add('done');
}

async function fetchWeather() {
  const { lat, lon } = state;
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    hourly: [
      'temperature_2m',
      'apparent_temperature',
      'relative_humidity_2m',
      'precipitation_probability',
      'precipitation',
      'wind_speed_10m',
      'wind_gusts_10m',
      'uv_index',
      'weather_code',
    ].join(','),
    timezone: 'Europe/Istanbul',
    forecast_days: '3',
  });
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      throw new Error(`Hava durumu servisi ${res.status} koduyla yanıt verdi.`);
    }
    const data = await res.json();
    validateWeatherResponse(data);
    cacheWeatherResponse(data);
    state.weatherIsCached = false;
    return data;
  } catch (error) {
    const cached = getCachedWeatherResponse();
    if (cached) {
      state.weatherIsCached = true;
      return cached;
    }
    if (error.name === 'AbortError') throw new Error('Hava durumu servisi zaman aşımına uğradı.');
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function cacheWeatherResponse(data) {
  try {
    localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({
      savedAt: Date.now(),
      lat: state.lat,
      lon: state.lon,
      data,
    }));
  } catch {
    // Depolama kapalıysa çevrimdışı fallback olmadan devam et.
  }
}

function getCachedWeatherResponse() {
  try {
    const cached = JSON.parse(localStorage.getItem(WEATHER_CACHE_KEY));
    const sameLocation = cached
      && Math.abs(Number(cached.lat) - Number(state.lat)) < 0.01
      && Math.abs(Number(cached.lon) - Number(state.lon)) < 0.01;
    const freshEnough = cached && Date.now() - cached.savedAt <= WEATHER_CACHE_MAX_AGE;
    if (!sameLocation || !freshEnough) return null;
    validateWeatherResponse(cached.data);
    return cached.data;
  } catch {
    return null;
  }
}

function validateWeatherResponse(raw) {
  const requiredFields = [
    'time',
    'temperature_2m',
    'apparent_temperature',
    'relative_humidity_2m',
    'precipitation_probability',
    'precipitation',
    'wind_speed_10m',
    'wind_gusts_10m',
    'uv_index',
    'weather_code',
  ];
  const expectedLength = raw?.hourly?.time?.length;
  const isValid = expectedLength > 0 && requiredFields.every(field => (
    Array.isArray(raw.hourly[field]) && raw.hourly[field].length === expectedLength
  ));

  if (!isValid) {
    throw new Error('Saatlik hava durumu verileri eksik veya tutarsız.');
  }
}

function filterHourlyData(raw) {
  const { startHour, endHour } = state;
  const times = raw.hourly.time;
  const indices = [];
  const selectedDate = getForecastDate();
  
  times.forEach((t, i) => {
    if (!t.startsWith(selectedDate)) return;
    const h = parseInt(t.split('T')[1].split(':')[0], 10);
    if (h >= startHour && h < endHour) indices.push(i);
  });

  if (indices.length === 0) {
    throw new Error('Seçilen tarih ve saatler için tahmin bulunamadı.');
  }

  const temps       = indices.map(i => raw.hourly.temperature_2m[i]);
  const feelsLikes  = indices.map(i => raw.hourly.apparent_temperature[i]);
  const humidities  = indices.map(i => raw.hourly.relative_humidity_2m[i]);
  const rainProbs   = indices.map(i => raw.hourly.precipitation_probability[i]);
  const rainAmounts = indices.map(i => raw.hourly.precipitation[i]);
  const winds       = indices.map(i => raw.hourly.wind_speed_10m[i]);
  const gusts       = indices.map(i => raw.hourly.wind_gusts_10m[i]);
  const uvIndices   = indices.map(i => raw.hourly.uv_index[i]);
  const codes       = indices.map(i => raw.hourly.weather_code[i]);
  const representativeCode = getMostSignificantWeatherCode(codes);

  return {
    minTemp:    Math.min(...temps),
    maxTemp:    Math.max(...temps),
    avgTemp:    avg(temps),
    feelsLike:  avg(feelsLikes),
    humidity:   Math.round(avg(humidities)),
    willRain:   rainAmounts.some(r => r > 0.2) || rainProbs.some(p => p >= 50),
    rainAmount: Math.max(...rainAmounts),
    maxRainProb: Math.max(...rainProbs),
    windSpeed:  Math.max(...winds),
    windGust:   Math.max(...gusts),
    uvIndex:    Math.max(...uvIndices),
    weatherCode: representativeCode,
  };
}

const WEATHER_SEVERITY = {
  0: 0, 1: 1, 2: 2, 3: 3,
  45: 4, 48: 5,
  51: 4, 53: 5, 55: 6,
  61: 5, 63: 6, 65: 7,
  71: 6, 73: 7, 75: 8, 77: 7,
  80: 5, 81: 6, 82: 8,
  95: 9, 96: 10, 99: 10,
};

function getMostSignificantWeatherCode(codes) {
  return codes.reduce((selected, code) => (
    (WEATHER_SEVERITY[code] ?? 0) > (WEATHER_SEVERITY[selected] ?? 0) ? code : selected
  ), codes[0]);
}

function avg(arr) {
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 10) / 10;
}

const WEATHER_META = {
  0:  { icon:'☀️',  label:'Açık',          theme:'sunny'   },
  1:  { icon:'🌤️', label:'Genellikle Açık',theme:'partly'  },
  2:  { icon:'⛅',  label:'Parçalı Bulutlu',theme:'partly'  },
  3:  { icon:'☁️',  label:'Kapalı',         theme:'cloudy'  },
  45: { icon:'🌫️', label:'Sisli',          theme:'foggy'   },
  48: { icon:'🌫️', label:'Don Sisli',      theme:'foggy'   },
  51: { icon:'🌦️', label:'Hafif Çiseleyen',theme:'drizzle' },
  53: { icon:'🌦️', label:'Çiseleyen',      theme:'drizzle' },
  55: { icon:'🌦️', label:'Yoğun Çiseleyen',theme:'drizzle'},
  61: { icon:'🌧️', label:'Hafif Yağmurlu', theme:'rainy'   },
  63: { icon:'🌧️', label:'Yağmurlu',       theme:'rainy'   },
  65: { icon:'🌧️', label:'Yoğun Yağmurlu', theme:'rainy'   },
  71: { icon:'🌨️', label:'Hafif Karlı',    theme:'snowy'   },
  73: { icon:'🌨️', label:'Karlı',          theme:'snowy'   },
  75: { icon:'❄️',  label:'Yoğun Karlı',    theme:'snowy'   },
  77: { icon:'🌨️', label:'Kar Taneli',     theme:'snowy'   },
  80: { icon:'🌦️', label:'Hafif Sağanak',  theme:'rainy'   },
  81: { icon:'🌧️', label:'Sağanak Yağış',  theme:'rainy'   },
  82: { icon:'⛈️',  label:'Yoğun Sağanak',  theme:'stormy'  },
  95: { icon:'⛈️',  label:'Gök Gürültülü Fırtına', theme:'stormy' },
  96: { icon:'⛈️',  label:'Dolulu Fırtına', theme:'stormy'  },
  99: { icon:'⛈️',  label:'Şiddetli Fırtına', theme:'stormy'},
};

function getWeatherMeta(code) {
  return WEATHER_META[code] || { icon:'🌡️', label:'Bilinmiyor', theme:'default' };
}

function applyTheme(theme) {
  const app = document.getElementById('app');
  app.className = app.className.replace(/theme-\w+/g, '').trim();
  app.classList.add(`theme-${theme}`);
}

function analyzeOutfit(w, outfit, preferences = {}) {
  const tips = [];
  const { top, bottom, outer = 'yok', shoes, accessories = [] } = outfit;
  const { minTemp, maxTemp, avgTemp, feelsLike, willRain,
          rainAmount, maxRainProb, windSpeed, windGust = windSpeed,
          humidity = 50, uvIndex = 0, weatherCode } = w;
  const sensitivity = preferences.sensitivity || 'balanced';
  const activity = preferences.activity || 'normal';

  if (top === 'tisort') {
    if (maxTemp >= 28) tips.push({ type:'success', icon:'✅', text:`Tişört bu ${Math.round(maxTemp)}°C'lik sıcaklık için biçilmiş kaftan. Hafif ve serin tutacak.` });
    else if (avgTemp >= 22 && avgTemp < 28) tips.push({ type:'success', icon:'✅', text:`${Math.round(avgTemp)}°C'de tişört rahat bir seçim. Gün içinde hafif serinlerse ince bir ceket de alabilirsin.` });
    else if (avgTemp >= 16 && avgTemp < 22) tips.push({ type:'warning', icon:'⚠️', text:`${Math.round(avgTemp)}°C biraz serin. Tişörtle üşüyebilirsin, üstüne ince bir şey alman önerilir.` });
    else if (avgTemp < 16) tips.push({ type:'danger', icon:'🥶', text:`Hava ${Math.round(avgTemp)}°C. Sadece tişörtle çıkmak çok soğuk hissettirebilir. Üstüne kat kat giyinmeyi düşün.` });
    if (willRain) tips.push({ type:'warning', icon:'🌧️', text:`Yağmur bekleniyor (%${maxRainProb}). Tişört ıslandığında soğuk hissettireceğinden yanına bir yağmurluk veya mont al.` });
  } else if (top === 'gomlek') {
    if (maxTemp >= 28) tips.push({ type:'warning', icon:'🌡️', text:`${Math.round(maxTemp)}°C'de gömlek sıcak tutabilir. Keten veya ince kumaş tercih et; yoksa bunalırsın.` });
    else if (avgTemp >= 16 && avgTemp < 28) tips.push({ type:'success', icon:'✅', text:`Gömlek bu hava için şık ve uygun bir seçim.` });
    else if (avgTemp < 16) tips.push({ type:'warning', icon:'⚠️', text:`${Math.round(avgTemp)}°C'de tek başına gömlek yetmeyebilir. Üstüne bir hırka veya ceket ekle.` });
    if (willRain) tips.push({ type:'warning', icon:'💧', text:`Gömlek ıslandığında çok rahatsız eder. Çantana katlanabilir bir şemsiye koy.` });
  } else if (top === 'kazak') {
    if (maxTemp >= 28) tips.push({ type:'danger', icon:'🔥', text:`${Math.round(maxTemp)}°C'de kazakla çok bunalırsın! Terleyeceğin ve rahatsız hissedeceğin kesin. Mutlaka daha hafif bir şey giy.` });
    else if (avgTemp >= 22 && avgTemp < 28) tips.push({ type:'danger', icon:'😓', text:`Bu ${Math.round(avgTemp)}°C'lik havada kazak fazla sıcak olacak. Akşam için saklıyor olsan bile gündüz yanında taşımak yorucu.` });
    else if (avgTemp >= 16 && avgTemp < 22) tips.push({ type:'warning', icon:'🌡️', text:`Kazak bu hava için biraz ağır olabilir, özellikle güneş çıkarsa. İnce bir kazak ya da hırka daha uygun olurdu.` });
    else if (avgTemp >= 8 && avgTemp < 16) tips.push({ type:'success', icon:'✅', text:`${Math.round(avgTemp)}°C'de kazak harika bir seçim. Sıcak ve konforlu tutacak.` });
    else tips.push({ type:'warning', icon:'🧊', text:`Çok soğuk (${Math.round(avgTemp)}°C)! Kazak iyi ama üstüne bir mont da giymek iyi olur.` });
  } else if (top === 'hirka') {
    if (maxTemp >= 28) tips.push({ type:'danger', icon:'🌡️', text:`${Math.round(maxTemp)}°C'de hırka kesinlikle fazla. Bu sıcakta terleyeceğin için çıkarmak zorunda kalırsın.` });
    else if (avgTemp >= 18 && avgTemp < 28) tips.push({ type:'success', icon:'✅', text:`Hırka bu hava için akıllıca bir seçim. Serin yerlerde kapatır, ılık yerlerde açarsın.` });
    else if (avgTemp >= 10 && avgTemp < 18) tips.push({ type:'warning', icon:'⚠️', text:`${Math.round(avgTemp)}°C için hırka yeterince sıcak tutmayabilir. Altına kalın bir tişört ya da termal giymek işe yarar.` });
    else tips.push({ type:'danger', icon:'🥶', text:`Bu soğuk havada (${Math.round(avgTemp)}°C) hırka yetersiz kalacak. Bir mont giymen çok daha iyi olur.` });
  } else if (top === 'sweatshirt') {
    if (maxTemp >= 26) tips.push({ type:'warning', icon:'🌡️', text:`${Math.round(maxTemp)}°C'de sweatshirt özellikle hareket ederken sıcak gelebilir.` });
    else if (avgTemp >= 10) tips.push({ type:'success', icon:'✅', text:'Sweatshirt bu sıcaklık aralığında rahat ve dengeli bir seçim.' });
    else tips.push({ type:'warning', icon:'🥶', text:'Sweatshirt tek başına bu soğukta yetersiz kalabilir; dış katman ekle.' });
  } else if (top === 'elbise') {
    if (maxTemp >= 22) tips.push({ type:'success', icon:'✅', text:'Elbise ılık ve sıcak hava için ferah bir seçim.' });
    else if (avgTemp < 15) tips.push({ type:'warning', icon:'🥶', text:`${Math.round(avgTemp)}°C'de elbiseyi tayt ve dış katmanla desteklemen iyi olur.` });
    if (windSpeed > 20) tips.push({ type:'warning', icon:'🌬️', text:`${Math.round(windSpeed)} km/sa rüzgârda elbisenin kesimine dikkat et.` });
  } else if (top === 'mont') {
    if (maxTemp >= 22) tips.push({ type:'danger', icon:'🔥', text:`${Math.round(maxTemp)}°C'de mont giymek ciddi bunalma riski taşır. Bu sıcaklıkta montu çıkarmadan taşımak da çok yorucu olur.` });
    else if (avgTemp >= 12 && avgTemp < 22) tips.push({ type:'warning', icon:'♨️', text:`Mont bu hava için biraz fazla olabilir. ${Math.round(avgTemp)}°C'de hırka veya kalın kazak daha uygun bir tercih.` });
    else if (avgTemp >= 0 && avgTemp < 12) tips.push({ type:'success', icon:'✅', text:`${Math.round(avgTemp)}°C'de mont doğru seçim. Dışarıda sıcak tutacak.` });
    else tips.push({ type:'success', icon:'🧊', text:`Dondurucu hava için mont şart. İyi ki giymişsin!` });
    if (willRain && rainAmount > 1) tips.push({ type:'info', icon:'💡', text:`Su geçirmez bir mont seçtiysen yağmurda da koruyacak. Değilse şemsiye al.` });
  } else if (top === 'yagmurluk') {
    if (!willRain && maxRainProb < 30) tips.push({ type:'warning', icon:'🌂', text:`Hava durumu yağmur öngörmüyor (%${maxRainProb} ihtimal). Yağmurluk gereksiz ağırlık olabilir, ama yanına almak istersen sorun değil.` });
    else if (willRain) tips.push({ type:'success', icon:'✅', text:`Harika karar! Yağmur bekleniyor (%${maxRainProb}) ve yağmurluk tam olarak ihtiyacın olan şey.` });
    if (avgTemp < 8) tips.push({ type:'warning', icon:'🥶', text:`Yağmurluk rüzgar ve soğuktan tam korumayabilir. Altına kalın katlar giy.` });
  }

  if (bottom === 'sort') {
    if (maxTemp >= 24) tips.push({ type:'success', icon:'✅', text:`${Math.round(maxTemp)}°C sıcakta şort en iyi seçim! Bacakların nefes alacak.` });
    else if (avgTemp >= 18 && avgTemp < 24) tips.push({ type:'success', icon:'👍', text:`Şort bu sıcaklık için güzel bir seçim. Akşam serinlerse üstün uzun kollu olsun.` });
    else if (avgTemp >= 12 && avgTemp < 18) tips.push({ type:'warning', icon:'⚠️', text:`${Math.round(avgTemp)}°C'de şort biraz serin olabilir. Bacakların üşüyebilir, özellikle rüzgar varsa.` });
    else if (avgTemp < 12) tips.push({ type:'danger', icon:'🥶', text:`${Math.round(avgTemp)}°C'de şorta çok soğuk! Bacakların donacak. Pantolon veya tayt giymeni şiddetle tavsiye ederim.` });
    if (top === 'mont' || top === 'kazak') tips.push({ type:'warning', icon:'🤔', text:`Üstün çok kalın, altın çok ince. Bu kombinasyon vücudun sıcaklığını dengelemekte zorlanacak. Bacakların üşüyecek.` });
    if (willRain) tips.push({ type:'warning', icon:'🌧️', text:`Yağmurda şorta çıkmak; bacakların ıslanır ve rüzgarla çok üşürsün.` });
    if (windSpeed > 25) tips.push({ type:'warning', icon:'💨', text:`Rüzgar ${Math.round(windSpeed)} km/sa hıza ulaşıyor. Şortta bu rüzgarı çok hissedersin.` });
  } else if (bottom === 'pantolon') {
    if (maxTemp >= 30) tips.push({ type:'warning', icon:'☀️', text:`${Math.round(maxTemp)}°C'de pantolon sıkabilir. Keten ya da ince kumaş tercih et; bol kesim daha serin tutar.` });
    else if (avgTemp < 5) tips.push({ type:'warning', icon:'🧊', text:`Çok soğuk hava için pantolon altına termal tayt giymeyi düşün.` });
    else tips.push({ type:'success', icon:'✅', text:`Pantolon bu hava için iyi bir tercih. Her koşulda güvenli.` });
  } else if (bottom === 'tayt') {
    if (maxTemp >= 26) tips.push({ type:'warning', icon:'🌡️', text:`${Math.round(maxTemp)}°C'de tayt çok sıcak tutabilir. Sentetik değil, pamuklu tercih et.` });
    else if (avgTemp >= 10 && avgTemp < 26) tips.push({ type:'success', icon:'✅', text:`Tayt bu hava koşulları için konforlu ve pratik.` });
    else if (avgTemp < 10) tips.push({ type:'warning', icon:'🥶', text:`${Math.round(avgTemp)}°C'de tayt yeterince sıcak tutmayabilir. Kalın kumaşlı veya içi düz olsun.` });
  } else if (bottom === 'etek') {
    if (windSpeed > 30) tips.push({ type:'danger', icon:'💨', text:`Rüzgar ${Math.round(windSpeed)} km/sa! Etek giymek zor anlar yaşatabilir. Çok dikkatli ol veya şort-tayt kombinasyonu dene.` });
    else if (windSpeed > 18) tips.push({ type:'warning', icon:'🌬️', text:`Biraz rüzgarlı (${Math.round(windSpeed)} km/sa). Etek giymek sorun yaratmaz ama uzun etek tercih et.` });
    if (avgTemp < 15) tips.push({ type:'warning', icon:'🥶', text:`${Math.round(avgTemp)}°C'de etek soğuk tutabilir. Altına kalın tayt giymeni tavsiye ederim.` });
    else if (avgTemp >= 22) tips.push({ type:'success', icon:'✅', text:`Bu sıcak havada etek harika ve serin bir seçim!` });
    if (willRain) tips.push({ type:'warning', icon:'🌧️', text:`Yağmurda etek ıslanması ve rüzgarla birleşince çok rahatsız edebilir.` });
  } else if (bottom === 'yok') {
    if (top === 'elbise') tips.push({ type:'success', icon:'✅', text:'Elbise seçiminle alt giyim gerekmemesi tutarlı.' });
    else tips.push({ type:'danger', icon:'⚠️', text:'Alt giyim seçilmedi. “Elbise için yok” seçeneği yalnızca elbiseyle kullanılmalı.' });
  }

  if (shoes === 'sandalet') {
    if (maxTemp >= 24 && !willRain && windSpeed < 20) tips.push({ type:'success', icon:'✅', text:`Sandalet bu sıcak ve güzel hava için mükemmel! Ayakların nefes alacak.` });
    else if (maxTemp >= 24 && willRain) tips.push({ type:'danger', icon:'☔', text:`Yağmur var ve sandalet giyiyorsun — ayakların tamamen ıslanır. Bot veya su geçirmez ayakkabı çok daha iyi olur.` });
    else if (avgTemp < 14) tips.push({ type:'danger', icon:'🥶', text:`Bu soğuk havada (${Math.round(avgTemp)}°C) sandaletle ayakların çok üşür. Lütfen kapalı ayakkabı giy.` });
    else if (avgTemp < 18) tips.push({ type:'warning', icon:'🌡️', text:`${Math.round(avgTemp)}°C'de sandalet ayaklarını üşütebilir. Kapalı burunlu bir ayakkabı daha iyi seçim.` });
  } else if (shoes === 'bot') {
    if (maxTemp >= 28) tips.push({ type:'danger', icon:'🔥', text:`${Math.round(maxTemp)}°C'de bot giymek ayaklarının şişmesine ve terlemesine neden olur. Çok bunalırsın.` });
    else if (avgTemp >= 22 && avgTemp < 28) tips.push({ type:'warning', icon:'🌡️', text:`Biraz sıcak (${Math.round(avgTemp)}°C) bot için. Nefes almayan bir bot ise ayakların çok terleyecek.` });
    else if (willRain) tips.push({ type:'success', icon:'✅', text:`Yağmurda bot harika bir seçim! Ayakların kuru ve sıcak kalacak.` });
    else if (avgTemp < 10) tips.push({ type:'success', icon:'✅', text:`Bu soğuk havada (${Math.round(avgTemp)}°C) bot ayaklarını sıcak tutacak. İyi seçim!` });
    else tips.push({ type:'success', icon:'✅', text:`Bot bu hava için uygun ve pratik bir seçim.` });
  } else if (shoes === 'spor') {
    if (willRain && rainAmount > 0.5) tips.push({ type:'warning', icon:'💧', text:`Yağmur bekleniyor ve çoğu spor ayakkabı su geçirir. Ayakların ıslanabilir; su geçirmez modelin varsa onu seç.` });
    else if (avgTemp < 5) tips.push({ type:'warning', icon:'🥶', text:`Çok soğuk için spor ayakkabı yeterince sıcak tutmayabilir. İçi kürklü veya termal çorapla destekle.` });
    else if (maxTemp >= 30) tips.push({ type:'success', icon:'✅', text:`Bu sıcakta nefes alan spor ayakkabı iyi bir seçim. Açık renk tercih et.` });
    else tips.push({ type:'success', icon:'✅', text:`Spor ayakkabı her hava için güvenli ve konforlu bir tercih.` });
  } else if (shoes === 'loafer') {
    if (willRain && rainAmount > 0.3) tips.push({ type:'danger', icon:'💦', text:`Yağmurda loafer çoğunlukla suya dayanmaz. Ayakların ıslanır ve kayabilirsin. Bot veya su geçirmez ayakkabı düşün.` });
    else if (avgTemp < 8) tips.push({ type:'warning', icon:'🌬️', text:`${Math.round(avgTemp)}°C'de loafer soğuk tutabilir. Kalın çorapla kombineleyebilirsin.` });
    else tips.push({ type:'success', icon:'✅', text:`Loafer bu hava için şık ve rahat bir seçim.` });
  } else if (shoes === 'waterproof') {
    if (willRain) tips.push({ type:'success', icon:'✅', text:'Su geçirmez ayakkabı yağış için çok uygun; ayakların kuru kalacak.' });
    else if (maxTemp >= 28) tips.push({ type:'warning', icon:'🌡️', text:'Su geçirmez ayakkabı bu sıcaklıkta yeterince nefes almayabilir.' });
    else tips.push({ type:'success', icon:'✅', text:'Su geçirmez ayakkabı değişken hava koşulları için güvenli bir seçim.' });
  }

  if (outer === 'yagmurluk' && willRain) tips.push({ type:'success', icon:'🌧️', text:'Dış katman olarak yağmurluk seçmen beklenen yağışa tam uyuyor.' });
  else if (outer === 'yagmurluk' && !willRain) tips.push({ type:'info', icon:'🌂', text:'Yağış beklenmediği için yağmurluğu katlayıp yanında taşıyabilirsin.' });
  if (['mont', 'kaban'].includes(outer) && maxTemp >= 20) tips.push({ type:'warning', icon:'🔥', text:`${Math.round(maxTemp)}°C'de ${outer} fazla sıcak gelebilir.` });
  if (outer === 'yok' && minTemp < 10 && !['mont', 'yagmurluk'].includes(top)) tips.push({ type:'warning', icon:'🧥', text:'En düşük sıcaklık için bir dış katman eklemen daha güvenli olur.' });
  if (willRain && !accessories.includes('umbrella') && outer !== 'yagmurluk' && top !== 'yagmurluk') {
    tips.push({ type:'warning', icon:'☂️', text:'Yağış bekleniyor; şemsiye veya yağmurluk ekle.' });
  }
  if (willRain && accessories.includes('umbrella')) tips.push({ type:'success', icon:'☂️', text:'Şemsiye seçimin beklenen yağışa karşı hazırlıklı olduğunu gösteriyor.' });

  if (uvIndex >= 6 && !accessories.includes('hat')) tips.push({ type:'warning', icon:'☀️', text:`UV indeksi ${uvIndex.toFixed(1)}. Şapka ve güneş koruyucu kullan.` });
  else if (uvIndex >= 6 && accessories.includes('hat')) tips.push({ type:'success', icon:'🧢', text:`Yüksek UV (${uvIndex.toFixed(1)}) için şapka iyi bir önlem.` });
  if (humidity >= 75 && maxTemp >= 24) tips.push({ type:'warning', icon:'💧', text:`Nem %${humidity}; nefes alan, bol ve açık renkli kumaşlar tercih et.` });
  if (windGust >= 45) tips.push({ type:'danger', icon:'🌬️', text:`Rüzgâr hamleleri ${Math.round(windGust)} km/sa seviyesine çıkabilir; bol ve uçuşan parçalara dikkat et.` });

  if (minTemp < 8 && accessories.includes('thermal')) tips.push({ type:'success', icon:'♨️', text:'Termal içlik düşük sıcaklıkta ısı dengesini destekler.' });
  if (minTemp < 5 && !accessories.includes('gloves')) tips.push({ type:'info', icon:'🧤', text:'Soğuk saatler için eldiven eklemeyi düşün.' });
  if (minTemp < 8 && !accessories.includes('scarf')) tips.push({ type:'info', icon:'🧣', text:'Atkı, soğuk ve rüzgârda boyun bölgesini korur.' });

  if (sensitivity === 'cold' && avgTemp < 20 && outer === 'yok' && !accessories.includes('thermal')) {
    tips.push({ type:'warning', icon:'🥶', text:'Çabuk üşüdüğünü belirttin; bir dış katman veya termal içlik ekle.' });
  }
  if (sensitivity === 'hot' && avgTemp >= 20 && (['kazak', 'mont'].includes(top) || ['mont', 'kaban'].includes(outer))) {
    tips.push({ type:'warning', icon:'🥵', text:'Çabuk terlediğini belirttin; daha hafif ve çıkarılabilir katmanlar seç.' });
  }
  if (['walking', 'sport'].includes(activity) && maxTemp >= 24 && ['kazak', 'mont', 'sweatshirt'].includes(top)) {
    tips.push({ type:'warning', icon:'🏃', text:'Hareket seviyen vücut ısısını artıracak; daha hafif bir üst tercih et.' });
  }
  if (activity === 'vehicle' && minTemp < 12) {
    tips.push({ type:'info', icon:'🚗', text:'Araç ağırlıklı planda çıkarılabilir katmanlar iç-dış sıcaklık farkını yönetmeyi kolaylaştırır.' });
  }

  if (windSpeed > 40) tips.push({ type:'danger', icon:'🌪️', text:`Çok şiddetli rüzgar uyarısı: ${Math.round(windSpeed)} km/sa! Dışarıda çok dikkatli ol.` });
  else if (windSpeed > 25 && !tips.some(t => t.text.includes('rüzgar') || t.text.includes('km/sa'))) tips.push({ type:'warning', icon:'💨', text:`Bugün rüzgarlı bir gün (${Math.round(windSpeed)} km/sa). Hissedilen sıcaklık ${Math.round(feelsLike)}°C'ye düşecek.` });

  if (willRain && rainAmount > 2) tips.push({ type:'danger', icon:'⛈️', text:`Yoğun yağış bekleniyor (${rainAmount.toFixed(1)} mm). Kesinlikle şemsiye veya yağmurluk olmadan çıkma!` });
  if ([45, 48].includes(weatherCode)) tips.push({ type:'info', icon:'🌫️', text:`Sisli bir gün. Trafikte çok dikkatli ol, görüş mesafesi düşük olacak.` });
  if ([95, 96, 99].includes(weatherCode)) tips.push({ type:'danger', icon:'⛈️', text:`Gök gürültülü fırtına uyarısı! Mümkünse açık alanlarda durma, uzun yürüyüşlerden kaçın.` });
  if ([71, 73, 75, 77].includes(weatherCode)) tips.push({ type:'info', icon:'❄️', text:`Kar yağışı bekleniyor. Kaygan zemine dikkat et, düşük profilli ayakkabılardan kaçın.` });

  const dangerCount  = tips.filter(t => t.type === 'danger').length;
  const warningCount = tips.filter(t => t.type === 'warning').length;

  let verdict;
  if (dangerCount >= 2) verdict = { cls: 'bad', emoji: '😬', text: 'Bu kombinasyon seçtiğin zaman aralığı için pek uygun değil. Birkaç değişiklik yapmanı öneririm.' };
  else if (dangerCount === 1 || warningCount >= 3) verdict = { cls: 'ok', emoji: '🤔', text: 'Geçerli bir seçim ama bazı noktalara dikkat etmeni tavsiye ederim.' };
  else if (warningCount >= 1) verdict = { cls: 'ok', emoji: '👍', text: 'Genel olarak iyi gidiyorsun! Küçük detayları göz önünde bulundur.' };
  else verdict = { cls: 'good', emoji: '🎉', text: 'Harika seçimler! Bu hava için kıyafetin tam uygun. Güzel bir gün geçir!' };

  return { tips, verdict };
}

function renderResults(w, analysis) {
  const meta = getWeatherMeta(w.weatherCode);

  document.getElementById('result-icon').textContent = meta.icon;
  document.getElementById('result-temp').textContent = `${Math.round(w.avgTemp)}°C`;
  document.getElementById('result-desc').textContent = `${state.locationName} · ${meta.label} · Hissedilen ${Math.round(w.feelsLike)}°C`;

  const badgesEl = document.getElementById('result-badges');
  badgesEl.innerHTML = '';
  const badgeData = [
    { label: `📅 ${['Bugün', 'Yarın', 'Ertesi gün'][state.selectedDay]}` },
    { label: `Min ${Math.round(w.minTemp)}°` },
    { label: `Maks ${Math.round(w.maxTemp)}°` },
    { label: `💨 ${Math.round(w.windSpeed)} km/sa` },
    { label: `🌬️ Hamle ${Math.round(w.windGust)} km/sa` },
    { label: `💧 Nem %${w.humidity}` },
    { label: `☀️ UV ${w.uvIndex.toFixed(1)}` },
    { label: w.willRain ? `☔ %${w.maxRainProb}` : '🌤️ Yağış Yok' },
    { label: `⏰ ${String(state.startHour).padStart(2,'0')}:00–${String(state.endHour).padStart(2,'0')}:00` },
  ];
  if (state.weatherIsCached) badgeData.unshift({ label: '⚠️ Son kayıtlı tahmin' });
  badgeData.forEach(b => {
    const span = document.createElement('span');
    span.className = 'w-badge';
    span.textContent = b.label;
    badgesEl.appendChild(span);
  });

  const outfitMap = {
    top: { tisort:'👕 Tişört', gomlek:'👔 Gömlek', sweatshirt:'🧥 Sweatshirt', kazak:'🧶 Kazak', hirka:'🧥 Hırka', mont:'🥼 Mont', yagmurluk:'🌂 Yağmurluk', elbise:'👗 Elbise' },
    bottom: { sort:'🩳 Şort', pantolon:'👖 Pantolon', tayt:'🩱 Tayt', etek:'👗 Etek', yok:'➖ Alt giyim yok' },
    outer: { yok:'➖ Dış katman yok', ceket:'🧥 Ceket', mont:'🥼 Mont', kaban:'🧥 Kaban', yagmurluk:'🌧️ Yağmurluk' },
    shoes:  { spor:'👟 Spor', bot:'👢 Bot', sandalet:'🩴 Sandalet', loafer:'🥿 Loafer', waterproof:'🥾 Su geçirmez' },
  };
  const summaryEl = document.getElementById('outfit-summary');
  summaryEl.innerHTML = '';
  ['top','bottom','outer','shoes'].forEach(cat => {
    const val  = state.outfit[cat];
    const name = outfitMap[cat][val] || val;
    const tag  = document.createElement('span');
    tag.className = 'summary-tag';
    tag.textContent = name;
    summaryEl.appendChild(tag);
  });
  const accessoryNames = {
    umbrella:'☂️ Şemsiye', hat:'🧢 Şapka', scarf:'🧣 Atkı',
    gloves:'🧤 Eldiven', thermal:'♨️ Termal içlik',
  };
  state.outfit.accessories.forEach(value => {
    const tag = document.createElement('span');
    tag.className = 'summary-tag';
    tag.textContent = accessoryNames[value] || value;
    summaryEl.appendChild(tag);
  });

  const metrics = [
    ['Sıcaklık aralığı', `${Math.round(w.minTemp)}–${Math.round(w.maxTemp)}°C`],
    ['Hissedilen', `${Math.round(w.feelsLike)}°C`],
    ['Yağış', w.willRain ? `%${w.maxRainProb} · ${w.rainAmount.toFixed(1)} mm` : 'Beklenmiyor'],
    ['Nem', `%${w.humidity}`],
    ['Rüzgâr / hamle', `${Math.round(w.windSpeed)} / ${Math.round(w.windGust)} km/sa`],
    ['UV indeksi', w.uvIndex.toFixed(1)],
    ['Hassasiyet', { cold:'Çabuk üşür', balanced:'Dengeli', hot:'Çabuk terler' }[state.sensitivity]],
    ['Aktivite', { vehicle:'Araç ağırlıklı', normal:'Normal', walking:'Uzun yürüyüş', sport:'Spor' }[state.activity]],
  ];
  const metricsEl = document.getElementById('decision-metrics');
  metricsEl.replaceChildren();
  metrics.forEach(([label, value]) => {
    const card = document.createElement('div');
    card.className = 'metric-card';
    const labelEl = document.createElement('span');
    labelEl.className = 'metric-label';
    labelEl.textContent = label;
    const valueEl = document.createElement('strong');
    valueEl.className = 'metric-value';
    valueEl.textContent = value;
    card.append(labelEl, valueEl);
    metricsEl.appendChild(card);
  });

  const listEl = document.getElementById('advice-list');
  listEl.innerHTML = '';
  analysis.tips.forEach((tip, i) => {
    const item = document.createElement('div');
    item.className = `advice-item ${tip.type}`;
    item.style.setProperty('--delay', `${i * 0.08}s`);
    item.innerHTML = `<span class="adv-icon">${tip.icon}</span><span class="adv-text">${tip.text}</span>`;
    listEl.appendChild(item);
  });

  if (analysis.tips.length === 0) {
    const item = document.createElement('div');
    item.className = 'advice-item success';
    item.innerHTML = `<span class="adv-icon">✅</span><span class="adv-text">Harika! Seçimlerin bu hava için mükemmel uyum sağlıyor.</span>`;
    listEl.appendChild(item);
  }

  const verdictEl = document.getElementById('verdict-box');
  verdictEl.className = `verdict-box ${analysis.verdict.cls}`;
  verdictEl.innerHTML = `<span class="verdict-emoji">${analysis.verdict.emoji}</span><p class="verdict-text">${analysis.verdict.text}</p>`;
}

async function runAnalysis() {
  showLoading('Hava durumu alınıyor...');
  try {
    const raw = await fetchWeather();
    state.rawWeather = raw;
    if (state.weatherIsCached) {
      showToast('İnternet bağlantısı kurulamadı; son 3 saat içinde kaydedilen tahmin gösteriliyor.');
    }
    
    showLoading('Veriler işleniyor...');
    const w = filterHourlyData(raw);
    state.weather = w;
    
    const meta = getWeatherMeta(w.weatherCode);
    applyTheme(meta.theme);
    
    const analysis = analyzeOutfit(w, state.outfit, {
      sensitivity: state.sensitivity,
      activity: state.activity,
    });
    renderResults(w, analysis);
    
    hideLoading();
    goTo('screen-3');
    setTimeout(() => { document.getElementById('bottom-sheet').classList.add('visible'); }, 350);
  } catch (err) {
    hideLoading();
    console.error('HATA DETAYI:', err);
    showToast(err.message || 'Hava durumu alınamadı. Lütfen tekrar deneyin.');
  }
}

function resetApp() {
  state.outfit = { top: null, bottom: null, outer: 'yok', shoes: null, accessories: [] };
  state.weather = null;
  document.querySelectorAll('.outfit-btn.selected').forEach(b => {
    b.classList.remove('selected');
    b.setAttribute('aria-pressed', 'false');
  });
  ['badge-top','badge-bottom','badge-shoes'].forEach(id => {
    const el = document.getElementById(id);
    el.textContent = '';
    el.classList.remove('done');
  });
  const outerButton = document.querySelector('.outfit-btn[data-cat="outer"][data-val="yok"]');
  outerButton.classList.add('selected');
  outerButton.setAttribute('aria-pressed', 'true');
  document.getElementById('badge-outer').textContent = '✓ Yok';
  document.querySelectorAll('.accessory-btn').forEach(button => {
    button.classList.remove('selected');
    button.setAttribute('aria-pressed', 'false');
  });
  document.getElementById('badge-accessories').textContent = 'İsteğe bağlı';
  document.getElementById('badge-accessories').classList.remove('done');
  document.getElementById('btn-analyze').disabled = true;
  document.getElementById('bottom-sheet').classList.remove('visible');
  applyTheme('default');
  savePreferences();
  goTo('screen-loading', true);
}

let lastFocusedElement = null;

function openModal(modal) {
  if (!modal) return;
  lastFocusedElement = document.activeElement;
  modal.hidden = false;
  document.getElementById('app').inert = true;
  const firstFocusable = modal.querySelector('button, [href], input, select, [tabindex]:not([tabindex="-1"])');
  firstFocusable?.focus();
}

function closeModal(modal) {
  if (!modal) return;
  modal.hidden = true;
  document.getElementById('app').inert = false;
  lastFocusedElement?.focus();
}

function handleModalKeyboard(event) {
  const modal = [document.getElementById('os-select-modal'), document.getElementById('ios-instructions-modal')]
    .find(item => item && !item.hidden);
  if (!modal) return;
  if (event.key === 'Escape') {
    closeModal(modal);
    return;
  }
  if (event.key !== 'Tab') return;

  const focusable = [...modal.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')];
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

/* ── PWA KURULUM (GARANTİLİ MANUEL MENÜ YÖNTEMİ) ── */
if (typeof document !== 'undefined') {
  const installBtn = document.getElementById('btn-install');
  const osSelectModal = document.getElementById('os-select-modal');
  const iosInstructionsModal = document.getElementById('ios-instructions-modal');

  const btnSelectAndroid = document.getElementById('btn-select-android');
  const btnSelectIos = document.getElementById('btn-select-ios');
  const btnCloseOsSelect = document.getElementById('btn-close-os-select');
  const btnCloseIosModal = document.getElementById('btn-close-ios-modal');

  let deferredPrompt = null;
  const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn && !isStandalone()) installBtn.hidden = false;
  });

  const isStandalone = () => (
    window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true
  );

  if (installBtn) {
    installBtn.hidden = isStandalone() || !isIos;
  }

  if (installBtn) {
    installBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (isIos) {
        openModal(iosInstructionsModal);
      } else if (deferredPrompt) {
        openModal(osSelectModal);
      }
    });
  }

  // 2. ANDROİD Seçildiğinde
  if (btnSelectAndroid) {
    btnSelectAndroid.addEventListener('click', async () => {
      if (deferredPrompt) {
        // Sistem yükleme pop-up'ını ateşle
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          if (installBtn) installBtn.hidden = true;
        }
        deferredPrompt = null;
        closeModal(osSelectModal);
      } else {
        // Eğer tarayıcı otomatik desteklemiyorsa (örneğin Android'de Safari taklidi vs.)
        alert("Lütfen tarayıcınızın sağ üst menüsünden 'Ana Ekrana Ekle' veya 'Uygulamayı Yükle' seçeneğine dokunun.");
        closeModal(osSelectModal);
      }
    });
  }

  // 3. iOS Seçildiğinde
  if (btnSelectIos) {
    btnSelectIos.addEventListener('click', () => {
      closeModal(osSelectModal);
      openModal(iosInstructionsModal);
    });
  }

  // İptal / Kapatma Butonları
  if (btnCloseOsSelect) {
    btnCloseOsSelect.addEventListener('click', () => closeModal(osSelectModal));
  }
  if (btnCloseIosModal) {
    btnCloseIosModal.addEventListener('click', () => closeModal(iosInstructionsModal));
  }

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    if (installBtn) installBtn.hidden = true;
    closeModal(osSelectModal);
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js').catch(error => {
        console.error('Service Worker kaydı başarısız:', error);
      });
    });
  }

document.addEventListener('DOMContentLoaded', () => {
  populateTimeSelects();
  initDateSelection();
  initProfileSelection();
  initCitySelection();
  initOutfitSelection();
  initAccessorySelection();
  document.querySelectorAll('.outfit-btn').forEach(btn => {
    const selected = state.outfit[btn.dataset.cat] === btn.dataset.val;
    btn.classList.toggle('selected', selected);
    btn.setAttribute('aria-pressed', String(selected));
  });
  restorePreferences();
  document.querySelectorAll('.screen').forEach(screen => {
    const active = screen.classList.contains('active');
    screen.setAttribute('aria-hidden', String(!active));
    screen.inert = !active;
  });
  document.addEventListener('keydown', handleModalKeyboard);

  document.getElementById('btn-manual-location').addEventListener('click', () => setLocationMode('manual'));
  document.getElementById('btn-use-location').addEventListener('click', () => {
    setLocationMode('current');
    useCurrentLocation();
  });
  document.getElementById('btn-search-district').addEventListener('click', searchDistricts);
  document.getElementById('district-query').addEventListener('keydown', event => {
    if (event.key === 'Enter') searchDistricts();
  });

  document.getElementById('time-start').addEventListener('change', function() {
    state.startHour = parseInt(this.value, 10);
    if (state.endHour <= state.startHour) {
      state.endHour = Math.min(state.startHour + 1, 23);
      document.getElementById('time-end').value = state.endHour;
    }
    updateDurationTag();
    savePreferences();
  });

  document.getElementById('time-end').addEventListener('change', function() {
    state.endHour = parseInt(this.value, 10);
    updateDurationTag();
    savePreferences();
  });

  document.getElementById('btn-start').addEventListener('click', () => {
    goTo('screen-1');
  });

  document.getElementById('btn-step1-next').addEventListener('click', () => {
    if (!state.lat) return showToast('Lütfen listeden bir şehir seçin.');
    if (state.endHour <= state.startHour) return showToast('Dönüş saati çıkış saatinden sonra olmalı.');
    goTo('screen-2');
  });

  document.getElementById('btn-analyze').addEventListener('click', runAnalysis);
  document.getElementById('btn-back-1').addEventListener('click', () => goTo('screen-1', true));
  document.getElementById('btn-back-2').addEventListener('click', () => {
    document.getElementById('bottom-sheet').classList.remove('visible');
    goTo('screen-2', true);
  });
  document.getElementById('btn-restart').addEventListener('click', resetApp);
});
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    analyzeOutfit,
    getMostSignificantWeatherCode,
    validateWeatherResponse,
    WEATHER_SEVERITY,
  };
}

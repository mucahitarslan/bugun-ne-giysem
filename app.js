'use strict';

const state = {
  lat: null,
  lon: null,
  locationName: '',
  startHour: 9,
  endHour: 18,
  outfit: { top: null, bottom: null, shoes: null },
  rawWeather: null,
  weather: null,
};

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

  current.style.transform = back ? 'translateX(100%)' : 'translateX(-30%)';
  
  setTimeout(() => { 
    current.style.transform = ''; 
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

function updateDurationTag() {
  const tag = document.getElementById('duration-tag');
  const diff = state.endHour - state.startHour;
  
  if (diff <= 0) {
    tag.textContent = '⚠️ Dönüş saati çıkış saatinden önce olamaz';
    tag.style.color = '#fca5a5';
    document.getElementById('btn-step1-next').disabled = true;
  } else {
    tag.textContent = `⏱ ${diff} saat dışarıdasın (${String(state.startHour).padStart(2,'0')}:00 – ${String(state.endHour).padStart(2,'0')}:00)`;
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
    state.lat = selectedCity.lat;
    state.lon = selectedCity.lon;
    state.locationName = selectedCity.name;
    updateDurationTag(); 
  });
}

function initOutfitSelection() {
  document.querySelectorAll('.outfit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.cat;
      const val = btn.dataset.val;

      document.querySelectorAll(`.outfit-btn[data-cat="${cat}"]`).forEach(b => {
        b.classList.remove('selected');
      });

      btn.classList.add('selected');
      state.outfit[cat] = val;
      updateCategoryBadge(cat, btn.querySelector('.o-name').textContent);

      const { top, bottom, shoes } = state.outfit;
      document.getElementById('btn-analyze').disabled = !(top && bottom && shoes);
    });
  });
}

function updateCategoryBadge(cat, name) {
  const map = { top: 'badge-top', bottom: 'badge-bottom', shoes: 'badge-shoes' };
  const badge = document.getElementById(map[cat]);
  if (!badge) return;
  badge.textContent = `✓ ${name}`;
  badge.classList.add('done');
}

async function fetchWeather() {
  const { lat, lon } = state;
  // timezone=auto yerine Europe/Istanbul sabitlemesi yapıldı.
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,apparent_temperature,precipitation_probability,precipitation,windspeed_10m,weathercode&timezone=Europe%2FIstanbul&forecast_days=1`;

  const res = await fetch(url);
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`HTTP ${res.status}: ${errorText}`);
  }
  return await res.json();
}

function filterHourlyData(raw) {
  const { startHour, endHour } = state;
  const times = raw.hourly.time;
  const indices = [];
  
  times.forEach((t, i) => {
    const h = parseInt(t.split('T')[1].split(':')[0], 10);
    if (h >= startHour && h < endHour) indices.push(i);
  });

  if (indices.length === 0) indices.push(0);

  const temps       = indices.map(i => raw.hourly.temperature_2m[i]);
  const feelsLikes  = indices.map(i => raw.hourly.apparent_temperature[i]);
  const rainProbs   = indices.map(i => raw.hourly.precipitation_probability[i]);
  const rainAmounts = indices.map(i => raw.hourly.precipitation[i]);
  const winds       = indices.map(i => raw.hourly.windspeed_10m[i]);
  const codes       = indices.map(i => raw.hourly.weathercode[i]);
  const midCode     = codes[Math.floor(codes.length / 2)];

  return {
    minTemp:    Math.min(...temps),
    maxTemp:    Math.max(...temps),
    avgTemp:    avg(temps),
    feelsLike:  avg(feelsLikes),
    willRain:   rainAmounts.some(r => r > 0.2) || rainProbs.some(p => p >= 50),
    rainAmount: Math.max(...rainAmounts),
    maxRainProb: Math.max(...rainProbs),
    windSpeed:  Math.max(...winds),
    weatherCode: midCode,
  };
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

function analyzeOutfit(w, outfit) {
  const tips = [];
  const { top, bottom, shoes } = outfit;
  const { minTemp, maxTemp, avgTemp, feelsLike, willRain,
          rainAmount, maxRainProb, windSpeed, weatherCode } = w;

  if (top === 'tisort') {
    if (maxTemp >= 28) tips.push({ type:'success', icon:'✅', text:`Tişört bu ${Math.round(maxTemp)}°C'lik sıcaklık için biçilmiş kaftan. Hafif ve serin tutacak.` });
    else if (avgTemp >= 22 && avgTemp < 28) tips.push({ type:'success', icon:'✅', text:`${Math.round(avgTemp)}°C'de tişört rahat bir seçim. Gün içinde hafif serinlerse ince bir ceket de alabilirsin.` });
    else if (avgTemp >= 16 && avgTemp < 22) tips.push({ type:'warning', icon:'⚠️', text:`${Math.round(avgTemp)}°C biraz serin. Tişörtle üşüyebilirsin, üstüne ince bir şey alman önerilir.` });
    else if (avgTemp < 16) tips.push({ type:'danger', icon:'🥶', text:`Hava ${Math.round(avgTemp)}°C. Sadece tişörtle çıkmak çok soğuk hissettirebilir. Üstüne kat kat giyinmeyi düşün.` });
    if (willRain) tips.push({ type:'warning', icon:'🌧️', text:`Yağmur bekleniyor (%${maxRainProb}). Tişört ıslandığında soğuk hissettireceğinden bir yağmurluk veya mont yanına alsana.` });
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
  } else if (top === 'mont') {
    if (maxTemp >= 22) tips.push({ type:'danger', icon:'🔥', text:`${Math.round(maxTemp)}°C'de mont giymek ciddi bunalma riski taşır. Bu sıcaklıkta montu çıkarmadan taşımak da çok yorucu olur.` });
    else if (avgTemp >= 12 && avgTemp < 22) tips.push({ type:'warning', icon:'♨️', text:`Mont bu hava için biraz fazla olabilir. ${Math.round(avgTemp)}°C'de hırka veya kalın kazak daha uygun bir tercih.` });
    else if (avgTemp >= 0 && avgTemp < 12) tips.push({ type:'success', icon:'✅', text:`${Math.round(avgTemp)}°C'de mont doğru seçim. Dışarıda sıcak tutacak.` });
    else tips.push({ type:'success', icon:'🧊', text:`Dondurucu hava için mont şart. İyi ki giymişsin!` });
    if (willRain && rainAmount > 1) tips.push({ type:'info', icon:'💡', text:`Su geçirmez bir mont seçtiysen yağmurda da koruyacak. Değilse şemsiye al.` });
  } else if (top === 'yagmurluk') {
    if (!willRain && maxRainProb < 30) tips.push({ type:'warning', icon:'🌂', text:`Hava durumu yağmur öngörmüyor (%${maxRainProb} ihtimal). Yağmurluk gereksiz ağırlık olabilir, ama yanına almak istersek sorun değil.` });
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
  }

  if (shoes === 'sandalet') {
    if (maxTemp >= 24 && !willRain && windSpeed < 20) tips.push({ type:'success', icon:'✅', text:`Sandalet bu sıcak ve güzel hava için mükemmel! Ayakların nefes alacak.` });
    else if (maxTemp >= 24 && willRain) tips.push({ type:'danger', icon:'☔', text:`Yağmur var ve sandalet giyiyorsun — ayakların tamamen ıslanır. Bot veya su geçirmez ayakkabı çok daha iyi olur.` });
    else if (avgTemp < 18) tips.push({ type:'warning', icon:'🌡️', text:`${Math.round(avgTemp)}°C'de sandalet ayaklarını üşütebilir. Kapalı burunlu bir ayakkabı daha iyi seçim.` });
    else if (avgTemp < 14) tips.push({ type:'danger', icon:'🥶', text:`Bu soğuk havada (${Math.round(avgTemp)}°C) sandaletle ayaklarının donacak. Lütfen kapalı ayakkabı giy.` });
  } else if (shoes === 'bot') {
    if (maxTemp >= 28) tips.push({ type:'danger', icon:'🔥', text:`${Math.round(maxTemp)}°C'de bot giymek ayaklarının şişmesine ve terlemesine neden olur. Çok bunalırsın.` });
    else if (avgTemp >= 22 && avgTemp < 28) tips.push({ type:'warning', icon:'🌡️', text:`Biraz sıcak (${Math.round(avgTemp)}°C) bot için. Nefes almayan bir bot ise ayakların çok terleyecek.` });
    else if (willRain) tips.push({ type:'success', icon:'✅', text:`Yağmurda bot harika bir seçim! Ayakların kuru ve sıcak kalacak.` });
    else if (avgTemp < 10) tips.push({ type:'success', icon:'✅', text:`Bu soğuk havada (${Math.round(avgTemp)}°C) bot ayaklarını sıcak tutacak. İyi seçim!` });
    else tips.push({ type:'success', icon:'✅', text:`Bot bu hava için uygun ve pratik bir seçim.` });
  } else if (shoes === 'spor') {
    if (willRain && rainAmount > 0.5) tips.push({ type:'warning', icon:'💧', text:`Yağmur bekleniyor ve çoğu spor ayakkabı su geçirir. Ayakların ıslanabilir; su geçirmez modeliniz varsa onu seç.` });
    else if (avgTemp < 5) tips.push({ type:'warning', icon:'🥶', text:`Çok soğuk için spor ayakkabı yeterince sıcak tutmayabilir. İçi kürklü veya termal çorapla destekle.` });
    else if (maxTemp >= 30) tips.push({ type:'success', icon:'✅', text:`Bu sıcakta nefes alan spor ayakkabı iyi bir seçim. Açık renk tercih et.` });
    else tips.push({ type:'success', icon:'✅', text:`Spor ayakkabı her hava için güvenli ve konforlu bir tercih.` });
  } else if (shoes === 'loafer') {
    if (willRain && rainAmount > 0.3) tips.push({ type:'danger', icon:'💦', text:`Yağmurda loafer çoğunlukla suya dayanmaz. Ayakların ıslanır ve kayabilirsin. Bot veya su geçirmez ayakkabı düşün.` });
    else if (avgTemp < 8) tips.push({ type:'warning', icon:'🌬️', text:`${Math.round(avgTemp)}°C'de loafer soğuk tutabilir. Kalın çorapla kombineleyebilirsin.` });
    else tips.push({ type:'success', icon:'✅', text:`Loafer bu hava için şık ve rahat bir seçim.` });
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
  if (dangerCount >= 2) verdict = { cls: 'bad', emoji: '😬', text: 'Bu kombinasyon bugünkü hava için pek uygun değil. Birkaç değişiklik yapmanı öneririm.' };
  else if (dangerCount === 1 || warningCount >= 3) verdict = { cls: 'ok', emoji: '🤔', text: 'Geçerli bir seçim ama bazı noktalara dikkat etmeni tavsiye ederim.' };
  else if (warningCount >= 1) verdict = { cls: 'ok', emoji: '👍', text: 'Genel olarak iyi gidiyorsun! Küçük detayları göz önünde bulundur.' };
  else verdict = { cls: 'good', emoji: '🎉', text: 'Harika seçimler! Bu hava için kıyafetin tam uygun. Güzel bir gün geçir!' };

  return { tips, verdict };
}

function renderResults(w, analysis) {
  const meta = getWeatherMeta(w.weatherCode);

  document.getElementById('result-icon').textContent = meta.icon;
  document.getElementById('result-temp').textContent = `${Math.round(w.avgTemp)}°C`;
  document.getElementById('result-desc').textContent = `${meta.label} · Hissedilen ${Math.round(w.feelsLike)}°C`;

  const badgesEl = document.getElementById('result-badges');
  badgesEl.innerHTML = '';
  const badgeData = [
    { label: `Min ${Math.round(w.minTemp)}°` },
    { label: `Maks ${Math.round(w.maxTemp)}°` },
    { label: `💨 ${Math.round(w.windSpeed)} km/sa` },
    { label: w.willRain ? `☔ %${w.maxRainProb}` : '🌤️ Yağış Yok' },
    { label: `⏰ ${String(state.startHour).padStart(2,'0')}:00–${String(state.endHour).padStart(2,'0')}:00` },
  ];
  badgeData.forEach(b => {
    const span = document.createElement('span');
    span.className = 'w-badge';
    span.textContent = b.label;
    badgesEl.appendChild(span);
  });

  const outfitMap = {
    top: { tisort:'👕 Tişört', gomlek:'👔 Gömlek', kazak:'🧶 Kazak', hirka:'🧥 Hırka', mont:'🥼 Mont', yagmurluk:'🌂 Yağmurluk' },
    bottom: { sort:'🩳 Şort', pantolon:'👖 Pantolon', tayt:'🩱 Tayt', etek:'👗 Etek' },
    shoes:  { spor:'👟 Spor', bot:'👢 Bot', sandalet:'🩴 Sandalet', loafer:'🥿 Loafer' },
  };
  const summaryEl = document.getElementById('outfit-summary');
  summaryEl.innerHTML = '';
  ['top','bottom','shoes'].forEach(cat => {
    const val  = state.outfit[cat];
    const name = outfitMap[cat][val] || val;
    const tag  = document.createElement('span');
    tag.className = 'summary-tag';
    tag.textContent = name;
    summaryEl.appendChild(tag);
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
    
    showLoading('Veriler işleniyor...');
    const w = filterHourlyData(raw);
    state.weather = w;
    
    const meta = getWeatherMeta(w.weatherCode);
    applyTheme(meta.theme);
    
    const analysis = analyzeOutfit(w, state.outfit);
    renderResults(w, analysis);
    
    hideLoading();
    goTo('screen-3');
    setTimeout(() => { document.getElementById('bottom-sheet').classList.add('visible'); }, 350);
  } catch (err) {
    hideLoading();
    console.error('HATA DETAYI:', err);
    // Gerçek hatayı ekrana basıyoruz!
    showToast('HATA: ' + err.message);
  }
}

function resetApp() {
  state.outfit = { top: null, bottom: null, shoes: null };
  state.weather = null;
  document.querySelectorAll('.outfit-btn.selected').forEach(b => b.classList.remove('selected'));
  ['badge-top','badge-bottom','badge-shoes'].forEach(id => {
    const el = document.getElementById(id);
    el.textContent = '';
    el.classList.remove('done');
  });
  document.getElementById('btn-analyze').disabled = true;
  document.getElementById('bottom-sheet').classList.remove('visible');
  applyTheme('default');
  goTo('screen-loading', true);
}

/* ── PWA KURULUM (GARANTİLİ MANUEL MENÜ YÖNTEMİ) ── */
  const installBtn = document.getElementById('btn-install');
  const osSelectModal = document.getElementById('os-select-modal');
  const iosInstructionsModal = document.getElementById('ios-instructions-modal');

  const btnSelectAndroid = document.getElementById('btn-select-android');
  const btnSelectIos = document.getElementById('btn-select-ios');
  const btnCloseOsSelect = document.getElementById('btn-close-os-select');
  const btnCloseIosModal = document.getElementById('btn-close-ios-modal');

  let deferredPrompt;

  // Android Chrome: Pop-up tetiklendiğinde arka planda yakala ve bekle
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
  });

  // Uygulamanın zaten PWA olarak mı çalıştığını kontrol et
  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

  // Eğer uygulama tarayıcıdan açılmışsa İndir butonunu %100 göster
  if (!isStandalone() && installBtn) {
    installBtn.style.display = 'block';
  }

  // 1. Ana İndir Butonuna Tıklanınca OS Seçim Ekranını (Flex olarak) aç
  if (installBtn) {
    installBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (osSelectModal) osSelectModal.style.display = 'flex';
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
          if (installBtn) installBtn.style.display = 'none'; // Kurulursa butonu gizle
        }
        deferredPrompt = null;
        if (osSelectModal) osSelectModal.style.display = 'none'; // Menüyü kapat
      } else {
        // Eğer tarayıcı otomatik desteklemiyorsa (örneğin Android'de Safari taklidi vs.)
        alert("Lütfen tarayıcınızın sağ üst menüsünden 'Ana Ekrana Ekle' veya 'Uygulamayı Yükle' seçeneğine dokunun.");
        if (osSelectModal) osSelectModal.style.display = 'none';
      }
    });
  }

  // 3. iOS Seçildiğinde
  if (btnSelectIos) {
    btnSelectIos.addEventListener('click', () => {
      if (osSelectModal) osSelectModal.style.display = 'none'; // İlk menüyü kapat
      if (iosInstructionsModal) iosInstructionsModal.style.display = 'flex'; // Yönerge menüsünü aç
    });
  }

  // İptal / Kapatma Butonları
  if (btnCloseOsSelect) {
    btnCloseOsSelect.addEventListener('click', () => osSelectModal.style.display = 'none');
  }
  if (btnCloseIosModal) {
    btnCloseIosModal.addEventListener('click', () => iosInstructionsModal.style.display = 'none');
  }
document.addEventListener('DOMContentLoaded', () => {
  populateTimeSelects();
  initCitySelection();
  initOutfitSelection();

  document.getElementById('time-start').addEventListener('change', function() {
    state.startHour = parseInt(this.value, 10);
    if (state.endHour <= state.startHour) {
      state.endHour = Math.min(state.startHour + 1, 23);
      document.getElementById('time-end').value = state.endHour;
    }
    updateDurationTag();
  });

  document.getElementById('time-end').addEventListener('change', function() {
    state.endHour = parseInt(this.value, 10);
    updateDurationTag();
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

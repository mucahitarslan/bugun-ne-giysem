# 🌤️ Bugün Ne Giysem?

Türkiye'deki 81 il için saatlik hava tahminini seçilen kıyafetlerle karşılaştıran, mobil odaklı bir Progressive Web App.

## Özellikler

- Bugün, yarın veya ertesi gün için saat aralığına göre analiz
- 81 il, OpenStreetMap tabanlı ilçe/yer araması ve isteğe bağlı cihaz konumu
- Sıcaklık, hissedilen sıcaklık, yağış ve rüzgâr değerlendirmesi
- Nem, UV indeksi ve rüzgâr hamlesi değerlendirmesi
- Üst/alt giyim, dış katman, ayakkabı ve aksesuarlar için kural tabanlı öneriler
- Çabuk üşüme/terleme hassasiyeti ve aktivite seviyesine göre kişiselleştirme
- Sonuçta tavsiyelerin dayandığı sekiz karar ölçütünün açık gösterimi
- Android ve iOS ana ekran kurulumu
- Çevrimdışı açılabilen uygulama kabuğu
- Son şehir, saat ve kıyafet tercihlerinin cihazda saklanması
- Bağlantı kesildiğinde en fazla üç saatlik son tahminle açıkça işaretlenmiş fallback
- Klavye ve ekran okuyucu dostu seçim kontrolleri

## Teknolojiler

- HTML5
- CSS3
- Vanilla JavaScript
- Open-Meteo Forecast API
- Service Worker ve Web App Manifest
- Apache `.htaccess`

Uygulamada PHP kodu veya derleme adımı yoktur. Bu nedenle statik dosya yayınlayabilen bir PHP/Apache paylaşımlı hostingde çalışır.

## Yerelde çalıştırma

Depoyu klonlayın:

```bash
git clone https://github.com/mucahitarslan/bugun-ne-giysem.git
cd bugun-ne-giysem
```

PHP'nin yerleşik sunucusunu başlatın:

```bash
php -S 127.0.0.1:8080
```

Ardından `http://127.0.0.1:8080` adresini açın.

## PHP/Apache hosting kurulumu

1. Depodaki dosyaları `.htaccess` dahil olmak üzere hosting hesabının `public_html` dizinine yükleyin.
2. Alan adında geçerli bir SSL sertifikası bulunduğundan ve HTTPS yönlendirmesinin etkin olduğundan emin olun.
3. Apache'de `mod_headers` ve tercihen `mod_deflate` modüllerinin etkin olduğunu doğrulayın.
4. Hosting dosya yöneticisinin nokta ile başlayan `.htaccess` dosyasını gizlemediğini kontrol edin.
5. Tarayıcıdan `https://api.open-meteo.com` adresine yapılan bağlantıların güvenlik duvarı veya proxy tarafından engellenmediğini doğrulayın.

PWA kurulumu ve Service Worker normal alan adlarında HTTPS gerektirir. `localhost` geliştirme amacıyla güvenli bağlam kabul edilir.

## Testler

Node.js 18 veya üzeriyle:

```bash
npm test
```

Test paketi JavaScript sözdizimini, manifest yapısını, erişilebilir seçim kontrollerini ve kritik hava analizi kurallarını kontrol eder. Ayrıca gerçek Chromium ile Service Worker kurulumu, cache içeriği ve çevrimdışı yeniden yükleme sınanır.

## Veri ve gizlilik

Seçilen konumun koordinatları hava tahmini almak amacıyla doğrudan Open-Meteo'ya gönderilir. İlçe/yer arama metni OpenStreetMap Nominatim servisine gönderilir. “Konumumu kullan” düğmesine basılmadıkça cihaz konum izni istenmez. Uygulama hesap oluşturmaz ve sunucu tarafında kişisel veri saklamaz. Tercihler ve en fazla üç saat kullanılabilen son başarılı hava yanıtı yalnızca kullanıcının tarayıcısındaki `localStorage` alanında tutulur.

Hava verileri [Open-Meteo](https://open-meteo.com/) tarafından CC BY 4.0 koşullarıyla sağlanır. Konum arama verileri © [OpenStreetMap katkıda bulunanlar](https://www.openstreetmap.org/copyright). Bu proje ticari olmayan kullanım için ücretsiz Open-Meteo API uç noktasını kullanır.

## Lisans

Bu proje [MIT lisansı](LICENSE) ile sunulmaktadır.

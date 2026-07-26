# 🌤️ Bugün Ne Giysem?

Türkiye'deki 81 il için saatlik hava tahminini seçilen kıyafetlerle karşılaştıran, mobil odaklı bir Progressive Web App.

## Özellikler

- Şehir ve dışarıda kalınacak saat aralığına göre analiz
- Sıcaklık, hissedilen sıcaklık, yağış ve rüzgâr değerlendirmesi
- Üst giyim, alt giyim ve ayakkabı için kural tabanlı öneriler
- Android ve iOS ana ekran kurulumu
- Çevrimdışı açılabilen uygulama kabuğu
- Son şehir, saat ve kıyafet tercihlerinin cihazda saklanması
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

Test paketi JavaScript sözdizimini, manifest yapısını, uygulama kabuğu/cache eşleşmesini, erişilebilir seçim kontrollerini ve kritik hava analizi kurallarını kontrol eder.

## Veri ve gizlilik

Seçilen ilin koordinatları hava tahmini almak amacıyla doğrudan Open-Meteo'ya gönderilir. Uygulama hesap oluşturmaz ve sunucu tarafında kişisel veri saklamaz. Tercihler yalnızca kullanıcının tarayıcısındaki `localStorage` alanında tutulur.

## Lisans

Bu proje [MIT lisansı](LICENSE) ile sunulmaktadır.

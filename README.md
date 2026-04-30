# 🌤️ Bugün Ne Giysem? - Akıllı Kıyafet Rehberi

**Bugün Ne Giysem?**, kullanıcıların bulundukları şehre ve dışarıda geçirecekleri saat aralığına göre en doğru kıyafet seçimlerini yapmalarına yardımcı olan, **PWA (Progressive Web App)** tabanlı modern bir web uygulamasıdır. 

Canlı hava durumu verilerini analiz ederek sıcaklık, hissedilen sıcaklık ve yağış ihtimaline göre kullanıcıya özel kombin önerileri sunar.

## ✨ Özellikler

- **🌍 81 İl Desteği:** Türkiye'nin tüm illeri için güncel hava durumu analizi.
- **⏱️ Saatlik Analiz:** Dışarı çıkış ve dönüş saatlerine göre noktasal hava durumu tahmini.
- **📱 PWA Desteği (Mobil Uygulama):** Hem **Android** hem de **iOS (iPhone/iPad)** cihazlara tarayıcı üzerinden yerel bir uygulama gibi yüklenebilir. Özel indirme menüleri ve bilgilendirme ekranları içerir.
- **⚡ Çevrimdışı Uyumluluk:** Service Worker altyapısı sayesinde statik dosyaları önbelleğe alır ve hızlı çalışır.
- **🎨 Modern Arayüz:** Kullanıcı dostu, cam efekti (glassmorphism) detaylarına sahip mobil odaklı tasarım.
- **🔒 Güvenli Bağlantı:** HTTPS ve özel İçerik Güvenlik Politikası (CSP) yapılandırmaları ile tam güvenlik.

## 📸 Ekran Görüntüleri

<div align="center">
  <img src="analiz.png" alt="Uygulama Analiz Ekranı" width="300" />
  &nbsp;&nbsp;&nbsp;&nbsp;
</div>

## 🛠️ Kullanılan Teknolojiler

- **HTML5 & CSS3:** Modern ve responsive arayüz tasarımı.
- **Vanilla JavaScript:** Hiçbir dış kütüphane (framework) kullanılmadan yazılmış saf ve hızlı JS mantığı.
- **[Open-Meteo API](https://open-meteo.com/):** Hava durumu verilerini çekmek için kullanılan, anahtar gerektirmeyen hızlı ve güvenilir hava durumu servisi.
- **PWA (Service Workers & Manifest):** Mobil cihaza kurulabilme özellikleri.

## 🚀 Kurulum ve Çalıştırma

Bu proje herhangi bir derleme (build) sürecine ihtiyaç duymaz. Sadece statik dosyaları bir web sunucusuna yüklemeniz yeterlidir.

1. Repoyu bilgisayarınıza klonlayın:
   ```bash
   git clone [https://github.com/kullaniciadiniz/bugun-ne-giysem.git](https://github.com/kullaniciadiniz/bugun-ne-giysem.git)

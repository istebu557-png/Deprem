# Deprem Simülasyonu

Bu proje, basit bir yapısal analiz ve deprem simülasyonu uygulamasıdır. Kullanıcılar, web tarayıcısı üzerinden basit yapılar (kirişler, kolonlar) oluşturabilir ve bu yapıların farklı büyüklükteki depremlere karşı dayanıklılığını test edebilirler.

## Özellikler

*   **Yapı Oluşturma:**
    *   **Kiriş (Yatay):** Yatay yapı elemanları ekleyin.
    *   **Kolon (Dikey):** Dikey taşıyıcı elemanlar ekleyin.
    *   **Bağlantı Noktası:** Elemanları birbirine bağlamak için manuel bağlantı noktaları ekleyin.
    *   **Silme:** Hatalı veya istenmeyen elemanları silin.

*   **Malzeme Seçimi:**
    *   Beton, Çelik ve Ahşap gibi farklı malzemeler seçerek yapı elemanlarının fiziksel özelliklerini (yoğunluk, dayanıklılık vb.) değiştirebilirsiniz.

*   **Deprem Ayarları:**
    *   **Büyüklük (Magnitude):** Depremin şiddetini ayarlayın (1-10 arası).
    *   **Derinlik:** Depremin derinliğini km cinsinden belirleyin.
    *   **Süre:** Depremin ne kadar süreceğini ayarlayın.

*   **Simülasyon:**
    *   Oluşturduğunuz yapıyı gerçek zamanlı fizik motoru (Matter.js) ile test edin.
    *   Yapı elemanlarının stres altındaki davranışlarını ve kırılma noktalarını gözlemleyin.

## Kurulum ve Çalıştırma

Bu proje, herhangi bir sunucu kurulumu gerektirmeyen, tamamen istemci taraflı (client-side) bir web uygulamasıdır.

1.  Projeyi bilgisayarınıza indirin veya kopyalayın.
2.  `index.html` dosyasını modern bir web tarayıcısında (Chrome, Firefox, Edge vb.) açın.

## Kullanım

1.  **Yapı İnşa Edin:** Sol paneldeki araçları kullanarak çalışma alanına kiriş ve kolonlar çizin. Çizim yapmak için farenin sol tuşuna basılı tutup sürükleyin.
2.  **Malzeme Seçin:** "Özellikler" bölümünden kullanacağınız malzemeyi seçin.
3.  **Deprem Parametrelerini Ayarlayın:** Simüle etmek istediğiniz depremin özelliklerini belirleyin.
4.  **Test Edin:** "Simülasyonu Başlat" butonuna tıklayarak depremi tetikleyin ve yapınızın davranışını izleyin.
5.  **Sıfırlayın:** Yeni bir deneme yapmak veya yapıyı düzenlemek için "Sıfırla" butonunu kullanın.

## Teknolojiler

*   HTML5
*   CSS3
*   JavaScript (ES6+)
*   [Matter.js](https://brm.io/matter-js/) (2D Fizik Motoru)

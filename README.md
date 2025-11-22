# Deprem Simülasyonu

Bu proje, basit bir yapısal analiz ve deprem simülasyonu uygulamasıdır. Kullanıcılar, web tarayıcısı üzerinden basit yapılar (kirişler, kolonlar) oluşturabilir ve bu yapıların farklı büyüklükteki depremlere karşı dayanıklılığını test edebilirler.

## Özellikler

*   **Yapı Oluşturma:**
    *   **Kiriş:** Yatay yapı elemanları ekleyin.
    *   **Kolon:** Dikey taşıyıcı elemanlar ekleyin.
    *   **Temel (Zemin):** Binanın oturacağı sabit zemin tabanını oluşturun.
    *   **Düzenleme Modu:** Oluşturulan parçaları seçin, sürükleyerek taşıyın veya döndürün.
    *   **Silme:** Hatalı veya istenmeyen elemanları silin.

*   **Malzeme ve Boyut Seçimi:**
    *   Beton, Çelik ve Ahşap gibi farklı malzemeler seçerek yapı elemanlarının fiziksel özelliklerini değiştirebilirsiniz.
    *   **Kalınlık ve Uzunluk:** Yapı elemanlarının boyutlarını oluşturmadan önce cm cinsinden ayarlayabilirsiniz.

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

1.  **Yapı İnşa Edin:**
    *   Önce sol panelden "Kiriş", "Kolon" veya "Temel" aracını seçin.
    *   "Özellikler" panelinden **Uzunluk** ve **Kalınlık** değerlerini ayarlayın.
    *   Çalışma alanında (Canvas) parçayı koymak istediğiniz yere **tıklayın**.
2.  **Düzenleyin:** "Düzenleme Modu"na geçin. Bir parçaya tıklayarak seçin (yeşil yanar).
    *   Seçili parçayı sürükleyerek taşıyabilirsiniz.
    *   Paneldeki "Döndür" butonları ile parçayı çevirebilirsiniz.
3.  **Deprem Parametrelerini Ayarlayın:** Simüle etmek istediğiniz depremin özelliklerini belirleyin.
4.  **Test Edin:** "Simülasyonu Başlat" butonuna tıklayarak depremi tetikleyin.
5.  **Yeniden Deneyin:** Simülasyon bittiğinde "Sıfırla" butonuna basarak yapıyı ilk haline döndürün ve tekrar test edin.

## Teknolojiler

*   HTML5
*   CSS3
*   JavaScript (ES6+)
*   [Matter.js](https://brm.io/matter-js/) (2D Fizik Motoru)

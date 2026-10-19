// Mağaza bağlantısı hazır olduğunda storeUrl alanını doldur. Yeni ekran görüntüsü
// eklenecekse assets/ klasörüne koyup listeye src alanı dolu bir öge ekle; src boş olan ögeler gösterilmez.
window.LANDING_CONFIG = {
  storeUrl: null,
  releaseUrl: 'https://github.com/lutfullahkabalak/youtube-osmanlica/releases/tag/v0.1.7',
  repositoryUrl: 'https://github.com/lutfullahkabalak/youtube-osmanlica',
  screenshots: [
    {src: './assets/youtube-cift-altyazi.png', alt: 'Vefa Sultan videosunda Türkçe ve Osmanlı harfli altyazıların birlikte gösterimi', title: 'İki yazı, aynı anda', caption: 'Videonun alt kenarında birlikte oku.'}
  ]
};

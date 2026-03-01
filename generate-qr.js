const QRCode = require('qrcode');

const creationData = {
  title: "Stocks",
  url: "https://rabbit-stocks.vercel.app",
  description: "Track indices & stocks",
  iconUrl: "",
  themeColor: "#007AFF"
};

const jsonString = JSON.stringify(creationData);
console.log("QR Data:", jsonString);

QRCode.toFile('qr-code-r1.png', jsonString, {
  width: 300,
  margin: 2,
  color: {
    dark: '#000000',
    light: '#ffffff'
  }
}, (err) => {
  if (err) throw err;
  console.log('QR code saved to qr-code-r1.png');
});

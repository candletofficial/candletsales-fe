import fs from 'fs';
import https from 'https';
import path from 'path';

const url = 'https://github.com/googlefonts/roboto/blob/main/src/hinted/Roboto-Regular.ttf?raw=true';
const urlBold = 'https://github.com/googlefonts/roboto/blob/main/src/hinted/Roboto-Bold.ttf?raw=true';
const targetDir = './src/utils/fonts';

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

function downloadFont(fontUrl, fileName) {
  return new Promise((resolve, reject) => {
    https.get(fontUrl, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        https.get(res.headers.location, (redirectRes) => {
          let chunks = [];
          redirectRes.on('data', chunk => chunks.push(chunk));
          redirectRes.on('end', () => {
            const buffer = Buffer.concat(chunks);
            const base64 = buffer.toString('base64');
            const fontName = fileName.replace('.js', '');
            const content = `export const ${fontName.replace('-', '')} = "${base64}";`;
            fs.writeFileSync(path.join(targetDir, fileName), content);
            console.log(`Saved ${fileName}`);
            resolve();
          });
        }).on('error', reject);
      } else {
        let chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const base64 = buffer.toString('base64');
          const fontName = fileName.replace('.js', '');
          const content = `export const ${fontName.replace('-', '')} = "${base64}";`;
          fs.writeFileSync(path.join(targetDir, fileName), content);
          console.log(`Saved ${fileName}`);
          resolve();
        });
      }
    }).on('error', reject);
  });
}

async function run() {
  try {
    await downloadFont(url, 'Roboto-Regular.js');
    await downloadFont(urlBold, 'Roboto-Bold.js');
    console.log('Fonts downloaded successfully.');
  } catch (err) {
    console.error(err);
  }
}

run();

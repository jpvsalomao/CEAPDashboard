import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function generateOGImage() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Set viewport to exact OG image dimensions
  await page.setViewportSize({ width: 1200, height: 630 });

  // Load the HTML file
  const htmlPath = join(__dirname, '../public/og-image.html');
  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle' });

  // Wait for fonts to load
  await page.waitForTimeout(1000);

  // Take screenshot
  const outputPath = join(__dirname, '../public/og-image-new.jpg');
  await page.screenshot({
    path: outputPath,
    type: 'jpeg',
    quality: 95,
  });

  console.log(`OG image generated: ${outputPath}`);

  await browser.close();
}

generateOGImage().catch(console.error);

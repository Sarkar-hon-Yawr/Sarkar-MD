import { createWriteStream } from 'fs';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import AdmZip from 'adm-zip';
import axios from 'axios';
import https from 'https';

// Resolve __dirname in ES Module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const jsonUrl = 'https://raw.githubusercontent.com/sarKarji1/PRABATH-MD-GITHUB-DATABASE/main/mega.json';
const downloadPath = path.join(__dirname, 'storage', 'download.zip');
const extractPath = path.join(__dirname, 'Sarkar-MD');

// Custom HTTPS agent for axios
const httpsAgent = new https.Agent({
  keepAlive: true,
  rejectUnauthorized: true,
});

// Function to download a file from MEGA
async function downloadMegaFile(url, outputPath) {
  console.log(`⬇️ Calling Bandaheali 🤙 For getting the File Link`);

  try {
    const { File } = await import('megajs');
    const file = File.fromURL(url);

    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    return new Promise((resolve, reject) => {
      const writer = createWriteStream(outputPath);
      const stream = file.download();

      stream.on('data', chunk => writer.write(chunk));
      stream.on('end', () => {
        writer.end();
        resolve();
      });
      stream.on('error', err => {
        writer.end();
        reject(new Error(`Download failed: ${err.message}`));
      });
    });

  } catch (err) {
    throw new Error(`MEGA initialization failed: ${err.message}`);
  }
}

// Function to extract the downloaded ZIP
async function extractZip(zipPath, targetPath) {
  console.log(`📂 Extracting ZIP to ${targetPath}...`);

  try {
    const zip = new AdmZip(zipPath);
    await fs.mkdir(targetPath, { recursive: true });
    zip.extractAllTo(targetPath, true);

    const entries = zip.getEntries();
    console.log(`✅ Extracted ${entries.length} files`);

    const mainJsPath = path.join(targetPath, 'main.js');
    try {
      await fs.access(mainJsPath);
      console.log(`✓ Found main.js at ${mainJsPath}`);
    } catch {
      throw new Error('main.js not found after extraction');
    }
  } catch (err) {
    throw new Error(`Extraction failed: ${err.message}`);
  }
}

// Main process function
async function processMegaFile() {
  try {
    // Step 1: Fetch JSON configuration
    console.log(`📡 Fetching configuration from GitHub...`);
    const { data } = await axios.get(jsonUrl, {
      httpsAgent,
      timeout: 15000,
      headers: { 'User-Agent': 'Node.js Script' }
    });

    // Step 2: Parse MEGA URL
    const megaUrl = data?.mega?.url || data?.megaUrl || data?.url;
    if (!megaUrl) throw new Error('No valid MEGA URL found in configuration');

    console.log(`🔗 Call Connected Getting files`);

    // Step 3: Download the MEGA file
    await downloadMegaFile(megaUrl, downloadPath);

    // Step 4: Verify download
    const stats = await fs.stat(downloadPath);
    if (stats.size === 0) throw new Error('Downloaded file is empty');
    console.log(`💾 Downloaded ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

    // Step 5: Extract ZIP to Sarkar-MD folder
    await extractZip(downloadPath, extractPath);

    // Step 6: Run Sarkar-MD/main.js
    const mainJsPath = path.join(extractPath, 'main.js');
    console.log(`🚀 Starting ${mainJsPath}...`);
    await import(mainJsPath);

    console.log('✨ Process completed successfully!');

  } catch (error) {
    console.error('🔥 Error:', error.message);
    if (error.response) {
      console.error('HTTP Status:', error.response.status);
    }
    process.exit(1);
  }
}

// Run the script
processMegaFile();


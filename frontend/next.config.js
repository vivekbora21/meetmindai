const fs = require('fs');
const path = require('path');

// Copy brain illustration from the gemini app data dir to the public directory
try {
  const srcPath = '/home/ubuntu/.gemini/antigravity/brain/1a3040ee-ed6e-4bb5-a6b0-f9cba8300b47/brain_network_sidebar_1783337175026.png';
  const destDir = path.join(__dirname, 'public');
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  const destPath = path.join(destDir, 'brain_illustration.png');
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log('Successfully copied brain illustration to public/brain_illustration.png');
  } else {
    console.error('Source image not found at:', srcPath);
  }
} catch (err) {
  console.error('Error copying brain illustration:', err);
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

module.exports = nextConfig;

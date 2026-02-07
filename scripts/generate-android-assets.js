import sharp from 'sharp'
import https from 'https'
import fs from 'fs'
import path from 'path'

const LOGO_URL = 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png'
const OUTPUT_DIR = 'res/android'
const TEMP_LOGO = 'temp-logo.png'

// Icon sizes
const ICONS = [
  { name: 'ldpi.png', size: 36 },
  { name: 'mdpi.png', size: 48 },
  { name: 'hdpi.png', size: 72 },
  { name: 'xhdpi.png', size: 96 },
  { name: 'xxhdpi.png', size: 144 },
  { name: 'xxxhdpi.png', size: 192 },
]

// Splash screen sizes (landscape)
const SPLASH_LANDSCAPE = [
  { name: 'splash-land-ldpi.png', width: 320, height: 200 },
  { name: 'splash-land-mdpi.png', width: 480, height: 320 },
  { name: 'splash-land-hdpi.png', width: 800, height: 480 },
  { name: 'splash-land-xhdpi.png', width: 1280, height: 720 },
]

// Splash screen sizes (portrait)
const SPLASH_PORTRAIT = [
  { name: 'splash-port-ldpi.png', width: 200, height: 320 },
  { name: 'splash-port-mdpi.png', width: 320, height: 480 },
  { name: 'splash-port-hdpi.png', width: 480, height: 800 },
  { name: 'splash-port-xhdpi.png', width: 720, height: 1280 },
]

// Download logo from URL
const downloadLogo = (url, dest) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Handle redirect
        https.get(response.headers.location, (redirectResponse) => {
          redirectResponse.pipe(file)
          file.on('finish', () => {
            file.close()
            resolve()
          })
        }).on('error', reject)
      } else {
        response.pipe(file)
        file.on('finish', () => {
          file.close()
          resolve()
        })
      }
    }).on('error', reject)
  })
}

// Generate icons
const generateIcons = async (logoPath) => {
  console.log('Generating icons...')
  for (const icon of ICONS) {
    const outputPath = path.join(OUTPUT_DIR, icon.name)
    await sharp(logoPath)
      .resize(icon.size, icon.size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(outputPath)
    console.log(`  Created ${icon.name} (${icon.size}x${icon.size})`)
  }
}

// Generate splash screens
const generateSplashScreens = async (logoPath, splashConfigs, type) => {
  console.log(`Generating ${type} splash screens...`)
  
  for (const splash of splashConfigs) {
    const outputPath = path.join(OUTPUT_DIR, splash.name)
    
    // Calculate logo size (40% of the smaller dimension)
    const logoSize = Math.floor(Math.min(splash.width, splash.height) * 0.4)
    
    // Resize logo
    const resizedLogo = await sharp(logoPath)
      .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer()
    
    // Create splash screen with white background and centered logo
    await sharp({
      create: {
        width: splash.width,
        height: splash.height,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    })
      .composite([{
        input: resizedLogo,
        gravity: 'center'
      }])
      .png()
      .toFile(outputPath)
    
    console.log(`  Created ${splash.name} (${splash.width}x${splash.height})`)
  }
}

// Main function
const main = async () => {
  try {
    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true })
    }
    
    console.log('Downloading logo...')
    await downloadLogo(LOGO_URL, TEMP_LOGO)
    console.log('Logo downloaded successfully!')
    
    await generateIcons(TEMP_LOGO)
    await generateSplashScreens(TEMP_LOGO, SPLASH_LANDSCAPE, 'landscape')
    await generateSplashScreens(TEMP_LOGO, SPLASH_PORTRAIT, 'portrait')
    
    // Clean up temp file
    fs.unlinkSync(TEMP_LOGO)
    
    console.log('\nAll assets generated successfully!')
  } catch (error) {
    console.error('Error generating assets:', error)
    process.exit(1)
  }
}

main()

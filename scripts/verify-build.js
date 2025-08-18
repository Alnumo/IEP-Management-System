#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const distPath = path.join(projectRoot, 'dist')

console.log('🔍 Verifying production build...\n')

// Check if dist directory exists
if (!fs.existsSync(distPath)) {
  console.error('❌ dist directory not found. Run "npm run build" first.')
  process.exit(1)
}

// Check for required files
const requiredFiles = [
  'index.html',
  'assets'
]

const missingFiles = []

for (const file of requiredFiles) {
  const filePath = path.join(distPath, file)
  if (!fs.existsSync(filePath)) {
    missingFiles.push(file)
  }
}

if (missingFiles.length > 0) {
  console.error('❌ Missing required files:', missingFiles.join(', '))
  process.exit(1)
}

// Check index.html content
const indexPath = path.join(distPath, 'index.html')
const indexContent = fs.readFileSync(indexPath, 'utf8')

const checks = [
  {
    name: 'Arabic language attribute',
    test: () => indexContent.includes('lang="ar"'),
    fix: 'Ensure HTML has lang="ar" attribute'
  },
  {
    name: 'RTL direction',
    test: () => indexContent.includes('dir="rtl"'),
    fix: 'Ensure HTML has dir="rtl" attribute'
  },
  {
    name: 'Arabic fonts',
    test: () => indexContent.includes('Tajawal') || indexContent.includes('Cairo'),
    fix: 'Ensure Arabic fonts are loaded'
  },
  {
    name: 'Meta viewport',
    test: () => indexContent.includes('viewport'),
    fix: 'Add viewport meta tag for mobile responsiveness'
  },
  {
    name: 'App title',
    test: () => indexContent.includes('مركز أركان النمو') || indexContent.includes('Arkan'),
    fix: 'Ensure app title is set correctly'
  }
]

let allPassed = true

console.log('📋 Running build verification checks:\n')

for (const check of checks) {
  const passed = check.test()
  const status = passed ? '✅' : '❌'
  console.log(`${status} ${check.name}`)
  
  if (!passed) {
    console.log(`   Fix: ${check.fix}`)
    allPassed = false
  }
}

// Check assets directory
const assetsPath = path.join(distPath, 'assets')
if (fs.existsSync(assetsPath)) {
  const assets = fs.readdirSync(assetsPath)
  const jsFiles = assets.filter(file => file.endsWith('.js'))
  const cssFiles = assets.filter(file => file.endsWith('.css'))
  
  console.log(`\n📦 Assets generated:`)
  console.log(`   JavaScript files: ${jsFiles.length}`)
  console.log(`   CSS files: ${cssFiles.length}`)
  console.log(`   Total assets: ${assets.length}`)
}

// Check file sizes
const getFileSize = (filePath) => {
  const stats = fs.statSync(filePath)
  return (stats.size / 1024).toFixed(2) // KB
}

console.log(`\n📊 File sizes:`)
console.log(`   index.html: ${getFileSize(indexPath)} KB`)

if (fs.existsSync(assetsPath)) {
  const assets = fs.readdirSync(assetsPath)
  
  // Find main JS and CSS files
  const mainJs = assets.find(file => file.includes('index') && file.endsWith('.js'))
  const mainCss = assets.find(file => file.includes('index') && file.endsWith('.css'))
  
  if (mainJs) {
    console.log(`   ${mainJs}: ${getFileSize(path.join(assetsPath, mainJs))} KB`)
  }
  
  if (mainCss) {
    console.log(`   ${mainCss}: ${getFileSize(path.join(assetsPath, mainCss))} KB`)
  }
}

console.log('\n' + '='.repeat(50))

if (allPassed) {
  console.log('🎉 Build verification completed successfully!')
  console.log('✅ Ready for deployment to production.')
} else {
  console.log('❌ Build verification failed.')
  console.log('🔧 Please fix the issues above before deploying.')
  process.exit(1)
}

console.log('\n📚 Next steps:')
console.log('   1. Set up environment variables in Netlify')
console.log('   2. Configure Supabase database')
console.log('   3. Deploy: npm run deploy')
console.log('   4. Test the production site')

export default true
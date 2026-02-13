#!/usr/bin/env node

/**
 * Cordova Android JDK 17 Compatibility Fix
 * 
 * This script patches cordova-android to work with JDK 22 by forcing
 * Android SDK tools (apkanalyzer, avdmanager) to use JDK 17.
 * 
 * Problem: The Android SDK cmdline-tools have a javax.xml.bind dependency 
 * that was removed in JDK 11+. This causes "NoClassDefFoundError: javax/xml/bind/annotation/XmlSchema"
 * errors when running with JDK 22.
 * 
 * Solution: Set JAVA_HOME to JDK 17 when invoking these tools.
 */

const fs = require('fs')
const path = require('path')

const JDK17_PATH = '/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home'

const targetJsPath = path.join(__dirname, '../node_modules/cordova-android/lib/target.js')
const emulatorJsPath = path.join(__dirname, '../node_modules/cordova-android/lib/emulator.js')

function patchTargetJs() {
  if (!fs.existsSync(targetJsPath)) {
    console.log('cordova-android/lib/target.js not found, skipping patch')
    return
  }

  let content = fs.readFileSync(targetJsPath, 'utf8')

  // Check if already patched
  if (content.includes('JDK17_WORKAROUND')) {
    console.log('target.js already patched')
    return
  }

  // Find and replace the getTargetSdkFromApk function
  const originalFn = `async function getTargetSdkFromApk (apkPath) {
    const { stdout: targetSdkStr } = await execa('apkanalyzer', [
        'manifest', 'target-sdk', apkPath
    ]);
    return Number(targetSdkStr);
}`

  const patchedFn = `async function getTargetSdkFromApk (apkPath) {
    // JDK17_WORKAROUND: Force JDK 17 for apkanalyzer to avoid javax.xml.bind errors
    const javaHome = '${JDK17_PATH}';
    try {
        const { stdout: targetSdkStr } = await execa('apkanalyzer', [
            'manifest', 'target-sdk', apkPath
        ], {
            env: {
                ...process.env,
                JAVA_HOME: javaHome,
                PATH: \`\${javaHome}/bin:\${process.env.PATH}\`
            }
        });
        return Number(targetSdkStr);
    } catch (err) {
        // Fallback: apkanalyzer may fail with JDK version incompatibilities
        events.emit('warn', 'apkanalyzer failed, using default target SDK 33. Error: ' + err.message);
        return 33;
    }
}`

  if (content.includes(originalFn)) {
    content = content.replace(originalFn, patchedFn)
    fs.writeFileSync(targetJsPath, content)
    console.log('Patched target.js for JDK 17 compatibility')
  } else {
    console.log('target.js function signature not found (may be already patched or different version)')
  }
}

function patchEmulatorJs() {
  if (!fs.existsSync(emulatorJsPath)) {
    console.log('cordova-android/lib/emulator.js not found, skipping patch')
    return
  }

  let content = fs.readFileSync(emulatorJsPath, 'utf8')

  // Check if already patched
  if (content.includes('JDK17_WORKAROUND')) {
    console.log('emulator.js already patched')
    return
  }

  // Find and replace the list_images_using_avdmanager function
  const originalFn = `module.exports.list_images_using_avdmanager = function () {
    return execa('avdmanager', ['list', 'avd']).then(({ stdout: output }) => {`

  const patchedFn = `module.exports.list_images_using_avdmanager = function () {
    // JDK17_WORKAROUND: Force JDK 17 for avdmanager to avoid javax.xml.bind errors
    const javaHome = '${JDK17_PATH}';
    const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
    const cmdlineToolsBin = androidHome ? path.join(androidHome, 'cmdline-tools', 'latest', 'bin') : '';
    const env = { ...process.env };
    env.JAVA_HOME = javaHome;
    env.PATH = \`\${cmdlineToolsBin}:\${javaHome}/bin:\${process.env.PATH}\`;
    return execa('avdmanager', ['list', 'avd'], { env }).then(({ stdout: output }) => {`

  if (content.includes(originalFn)) {
    content = content.replace(originalFn, patchedFn)
    fs.writeFileSync(emulatorJsPath, content)
    console.log('Patched emulator.js for JDK 17 compatibility')
  } else {
    console.log('emulator.js function signature not found (may be already patched or different version)')
  }
}

console.log('Applying Cordova Android JDK 17 compatibility patches...')
patchTargetJs()
patchEmulatorJs()
console.log('Done!')

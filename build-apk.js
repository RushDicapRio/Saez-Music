import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectDir = __dirname;
const rootDir = path.resolve(projectDir, '..');
const androidDir = path.join(projectDir, 'android');
const toolsDir = path.join(projectDir, '.tools');
const localJdkDir = path.join(toolsDir, 'jdk21');
const localSdkDir = path.join(toolsDir, 'android-sdk');
console.log('');
console.log('============================================================');
console.log('  🎵 SAEZ MUSIC - COMPILATION AUTOMATISÉE DE L\'APK ANDROID');
console.log('============================================================');
console.log('');
console.log('📦 [1/5] Compilation de l\'application Web mobile (Vite)...');
try {
  execSync('npm run build', { cwd: projectDir, stdio: 'inherit' });
  console.log('✅ Web App compilée avec succès dans dist/');
} catch (err) {
  console.error('❌ Échec de la compilation Web :', err.message);
  process.exit(1);
}
console.log('');
console.log('🔄 [2/5] Synchronisation Capacitor Android...');
try {
  execSync('npx cap sync android', { cwd: projectDir, stdio: 'inherit' });
  console.log('✅ Synchronisation Capacitor terminée');
} catch (err) {
  console.error('❌ Échec de la synchronisation Capacitor :', err.message);
  process.exit(1);
}
console.log('');
console.log('☕ [3/5] Configuration des variables Java 21 et Android SDK...');
const activeJavaHome = localJdkDir;
const activeSdkDir = localSdkDir;
console.log(`✅ JAVA_HOME  : ${activeJavaHome}`);
console.log(`✅ ANDROID_SDK: ${activeSdkDir}`);
const licensesDir = path.join(activeSdkDir, 'licenses');
if (!fs.existsSync(licensesDir)) {
  fs.mkdirSync(licensesDir, { recursive: true });
}
const licFile = path.join(licensesDir, 'android-sdk-license');
if (!fs.existsSync(licFile)) {
  fs.writeFileSync(licFile, '24333f8a63b682569279e447f733e9e1638f3376\n8933bad161af4178b1185d1a37fbf41ea5269c55\nd56f5187479451eabf01fb78af6dfcb131a6481e\n');
}
const localPropertiesPath = path.join(androidDir, 'local.properties');
const formattedSdkDir = activeSdkDir.replace(/\\/g, '/');
fs.writeFileSync(localPropertiesPath, `sdk.dir=${formattedSdkDir}\n`);
console.log(`✅ Fichier local.properties configuré : sdk.dir=${formattedSdkDir}`);
console.log('');
console.log('⚙️ [4/5] Compilation de l\'APK avec Gradle (assembleDebug)...');
const gradlewBat = path.join(androidDir, 'gradlew.bat');
const buildEnv = {
  ...process.env,
  JAVA_HOME: activeJavaHome,
  ANDROID_HOME: activeSdkDir,
  ANDROID_SDK_ROOT: activeSdkDir,
  PATH: `${path.join(activeJavaHome, 'bin')};${process.env.PATH}`,
};
try {
  execSync(`"${gradlewBat}" assembleDebug --no-daemon`, {
    cwd: androidDir,
    stdio: 'inherit',
    env: buildEnv,
  });
  console.log('✅ Compilation Gradle réussie !');
} catch (err) {
  console.error('');
  console.error('❌ Erreur lors de la compilation Gradle :', err.message);
  process.exit(1);
}
console.log('');
console.log('📋 [5/5] Finalisation et déplacement du fichier APK...');
const generatedApk = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
if (!fs.existsSync(generatedApk)) {
  console.error(`❌ Fichier APK introuvable à l'emplacement prévu : ${generatedApk}`);
  process.exit(1);
}
const targetApkRoot = path.join(rootDir, 'Saez Music.apk');
const targetApkProject = path.join(projectDir, 'Saez Music.apk');
fs.copyFileSync(generatedApk, targetApkRoot);
fs.copyFileSync(generatedApk, targetApkProject);
const stats = fs.statSync(targetApkProject);
const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
console.log('');
console.log('============================================================');
console.log('🎉 FÉLICITATIONS ! VOTRE FICHIER APK EST PRÊT !');
console.log('============================================================');
console.log(`📁 Fichier créé (racine) : ${targetApkRoot}`);
console.log(`📱 Fichier dans le dossier : ${targetApkProject}`);
console.log(`⚖️ Taille : ${sizeMb} Mo`);
console.log('');
console.log('🚀 Comment l\'installer sur votre smartphone Android :');
console.log('  1. Envoyez "Saez Music.apk" sur votre smartphone (USB, Discord, Google Drive, WhatsApp, etc.)');
console.log('  2. Appuyez sur le fichier .apk pour l\'installer');
console.log('  3. Lancez "Saez Music" et écoutez vos titres préférés !');
console.log('============================================================');
console.log('');

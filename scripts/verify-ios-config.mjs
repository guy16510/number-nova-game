import { readFile } from 'node:fs/promises';

const [appJsonText, packageJsonText, easJsonText] = await Promise.all([
  readFile(new URL('../app.json', import.meta.url), 'utf8'),
  readFile(new URL('../package.json', import.meta.url), 'utf8'),
  readFile(new URL('../eas.json', import.meta.url), 'utf8'),
]);

const app = JSON.parse(appJsonText).expo;
const pkg = JSON.parse(packageJsonText);
const eas = JSON.parse(easJsonText);
const errors = [];

const projectId = app?.extra?.eas?.projectId;
if (typeof projectId === 'string' && projectId.includes('REPLACE_WITH')) {
  errors.push('app.json contains a placeholder EAS project ID. Remove it or run `npx eas-cli@latest init`.');
}
if (app?.ios?.bundleIdentifier !== 'com.guy16510.numbernova') {
  errors.push('ios.bundleIdentifier must remain com.guy16510.numbernova for signing and installed-build upgrades.');
}
if (app?.orientation !== 'landscape') {
  errors.push('The game must declare landscape orientation.');
}
if (pkg?.scripts?.start?.includes('--dev-client')) {
  errors.push('The default start command must not force a development client because physical-device Expo Go launches will fail.');
}
if (!pkg?.scripts?.['ios:device']?.includes('--device')) {
  errors.push('The ios:device script must explicitly target a connected physical iPhone.');
}
if (eas?.build?.development?.developmentClient !== true) {
  errors.push('The EAS development profile must build a development client.');
}
if (eas?.build?.development?.distribution !== 'internal') {
  errors.push('The EAS development profile must use internal distribution for physical-device installation.');
}
if (eas?.build?.preview?.distribution !== 'internal') {
  errors.push('The EAS preview profile must use internal distribution.');
}

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`iOS config error: ${error}`);
  }
  process.exit(1);
}

console.log('iOS Expo configuration is structurally valid.');
if (!projectId) {
  console.log('EAS is not linked yet. Expo Go and local Xcode builds work, run `npx eas-cli@latest init` once before the first cloud build.');
}

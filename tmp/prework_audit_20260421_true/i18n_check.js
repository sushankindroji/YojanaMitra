const fs = require('fs');

const flat = (obj, p = '') => Object.keys(obj).reduce((a, k) => {
  const key = p ? `${p}.${k}` : k;
  return typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])
    ? { ...a, ...flat(obj[k], key) }
    : { ...a, [key]: true };
}, {});

try {
  const en = JSON.parse(fs.readFileSync('src/locales/en.json'));
  const enFlat = flat(en);

  ['hi', 'ta', 'te', 'bn', 'kn', 'mr', 'es'].forEach((lang) => {
    try {
      const loc = JSON.parse(fs.readFileSync(`src/locales/${lang}.json`));
      const locFlat = flat(loc);
      const missing = Object.keys(enFlat).filter((k) => !locFlat[k]);
      console.log(`${lang}: ${missing.length ? `${missing.length} missing keys` : 'complete'}`);
    } catch (e) {
      console.log(`${lang}: FILE ERROR - ${e.message}`);
    }
  });
} catch (e) {
  console.log(`en.json error: ${e.message}`);
  process.exit(1);
}

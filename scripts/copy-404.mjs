// GitHub Pages serves 404.html for unknown paths; making it a copy of the app
// lets deep links like /bramble/play/orbit-hop load the app, which then routes.
import { copyFileSync } from 'node:fs';
copyFileSync('dist/index.html', 'dist/404.html');
console.log('copied dist/index.html -> dist/404.html');

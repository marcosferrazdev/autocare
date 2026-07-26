/** Auto-teste: node --experimental-strip-types src/lib/photos.test.ts */
import assert from 'node:assert/strict';
import { parsePhotos, serializePhotos, MAX_PHOTOS } from './photos.ts';

const img = (n: number) => `data:image/jpeg;base64,foto${n}`;

// vazio
assert.deepEqual(parsePhotos(null), []);
assert.deepEqual(parsePhotos(''), []);
assert.equal(serializePhotos([]), null);
assert.equal(serializePhotos(null), null);

// ida e volta
assert.deepEqual(parsePhotos(serializePhotos([img(1), img(2)])), [img(1), img(2)]);

// formato legado (1 data URL solto)
assert.deepEqual(parsePhotos(img(9)), [img(9)]);

// lixo não vira foto
assert.deepEqual(parsePhotos('{}'), []);
assert.deepEqual(parsePhotos('[não é json'), []);
assert.deepEqual(parsePhotos('["javascript:alert(1)"]'), []);
assert.equal(serializePhotos(['http://exemplo.com/x.jpg']), null);

// limite de MAX_PHOTOS
const muitas = [1, 2, 3, 4, 5, 6, 7].map(img);
assert.equal(parsePhotos(serializePhotos(muitas)).length, MAX_PHOTOS);

console.log('ok');

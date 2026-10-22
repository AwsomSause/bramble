import { expect, test } from 'vitest';
import { downscaleImage, isImageFile } from './image';

test('isImageFile accepts images and rejects others', () => {
  expect(isImageFile(new File([''], 'a.png', { type: 'image/png' }))).toBe(true);
  expect(isImageFile(new File([''], 'a.txt', { type: 'text/plain' }))).toBe(false);
});

test('downscaleImage rejects a non-image file', async () => {
  await expect(downscaleImage(new File(['x'], 'a.txt', { type: 'text/plain' }))).rejects.toThrow(/image/i);
});

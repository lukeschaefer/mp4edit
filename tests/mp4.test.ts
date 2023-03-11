import {describe, expect, test} from '@jest/globals';
import {MP4} from '../src/mp4';
import {readFileSync} from 'fs';

// Get test file using readFileSync from ./test-file.mp4:
const file = readFileSync('./tests/test-file.mp4');


describe('MP4js', () => {
  test('An empty file in not valid', () => {
    const mp4 = new MP4(new Uint8Array(0));
    expect(mp4.isValid).toBe(false);
  });

  test('A bunch of random data is not valid', () => {
    const data = new Uint8Array(1024);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.floor(Math.random() * 256);
    }
    const mp4 = new MP4(data);
    expect(mp4.isValid).toBe(false);
  });

  test('An actual mp4 file is valid', () => {
    const mp4 = new MP4(file);
    expect(mp4.isValid).toBe(true);
  });

  test('Can get common tags from mp4 file', () => {
    const mp4 = new MP4(file);
    const tags = mp4.getCommonTags();
    expect(tags.title).toBe('test sound');
    expect(tags.artist).toBe('luke.software');
    expect(tags.album).toBe('the sounds of testing');
    expect(tags.genre).toBe('Spoken Word');
  });

  test('can edit common tags', () => {
    const mp4 = new MP4(file);
    mp4.giveTags({
      title: 'new title',
      artist: 'new artist',
      album: 'new album',
      genre: 'new genre',
    });
    const tags = mp4.getCommonTags();
    expect(tags.title).toBe('new title');
    expect(tags.artist).toBe('new artist');
    expect(tags.album).toBe('new album');
    expect(tags.genre).toBe('new genre');
  });
});
/**
 * mp4.js originally used [jDataView](https://github.com/jDataView/jDataView)
 * to work with ArrayBuffers. When I was upgrading this library to TypeScript, 
 * I decided to recreate a mini version of that library here rather than keep
 * it as a dependency.
 */



/** 
 * Provides a wrapper around Uint8Arrays with some utility functions useful for
 * this library - for more info on why, see the comment at the top of AtomData.ts 
*/
export class AtomData {
  public byteLength: number;
  private position = 0;
  constructor(public buffer: Uint8Array = new Uint8Array(0)) { }

  seek(num: number) {
    this.position = num;
    return this;
  }

  skip(num: number) {
    this.position += num;
  }

  writeString(str: string) {
    const bytes = str.split('').map(c => c.charCodeAt(0))
    this.buffer.set(bytes, this.position);
    this.position += bytes.length;
    return this;
  }

  writeUint32(inputNum: number | bigint) {
    // Max Safe Integer in JS is 2^54 - so we don't need
    // bigint for writing a Uint32 - but it's nice to accept
    // as a potential input.
    let num = Number(inputNum);
    const bytes = [
      num & 0xff,
      (num >> 8) & 0xff,
      (num >> 16) & 0xff,
      num >> 24
    ]
    this.buffer.set(bytes, this.position);
    this.position += 4;
    return this;
  }

  tell() {
    return this.position;
  }
  setUint32(pos: number, num: any) {
    const bytes = [
      num & 0xff,
      (num >>> 8) & 0xff,
    ]
    this.buffer.set(bytes, pos);
  }

  writeUint8(value: number) {
    this.buffer[this.position] = value;
    this.position++;
  }

  getUint32(offset = this.position) {
    const bytes = this.buffer.subarray(offset, offset + 4);
    let value = BigInt(0);
    value += BigInt((bytes[0] ?? 0) << 24);
    value += BigInt((bytes[1] ?? 0) << 16);
    value += BigInt((bytes[2] ?? 0) << 8);
    value += BigInt((bytes[3] ?? 0));
    return value;
  }

  getString(length = this.byteLength - this.position, offset = 0): string {
    const subArray = this.buffer.subarray(this.position + offset, this.position + length + offset);
    return String.fromCharCode(...subArray);
  }

  getBytes(length = this.byteLength - this.position) {
    return this.buffer.subarray(this.position, this.position + length)
  }

  setUint8(pos: number, value: number) {
    this.buffer[pos] = value;
  }

  slice(start: number, end: number) {
    this.buffer.slice(start, end);
    return this;
  }
}
import { Atom } from "./Atom";
import { AtomData } from "./AtomData";

// makes a new MP4 object out of data to parse.
export class MP4 {
  isValid = false;
  data: AtomData;
  root: Atom;

  constructor(input: number[] | Uint8Array) {
    this.data = new AtomData(new Uint8Array(input));

    const recursiveParse = function (atom: Atom, data: AtomData) {
      // Minimum atom size is 8 bytes
      while (data.byteLength >= 8) {

        data.seek(0);
        const tagLength = (data.getUint32(0));
        const tagName = (data.getString(4, 4));


        if (tagName.match(/[\xA9\w]{4}/) && tagLength <= data.byteLength) {
          const child = new Atom(tagName, atom);

          if (tagName == 'meta')
            child.padding = 4;
          atom.children.push(child);
          recursiveParse(child, data.slice(8 + child.padding, Number(tagLength)));
          data = data.slice(Number(tagLength), data.byteLength);
        } else {
          atom.data = data;
          return;
        }
      }
    }

    // first thing to do is establish the root Arom - but from then on this can all be recursive.
    this.root = new Atom("root");
    recursiveParse(this.root, this.data);

    this.isValid = this.root.hasChild('ftyp');
  }

  // renders an atom-tree to a AtomData buffer.
  build() {

    const recursiveBuilder = function (atom: Atom) {

      // Here you can see data and children being mutually exclusive.
      // but a more forgiving version of this would know which atoms
      // are allowed to break this rule.
      if (atom.data) return atom.data;

      // otherwise we got children to parse.
      let output = new AtomData(new Uint8Array(0));

      atom.children.forEach((child) => {
        const header = new AtomData(new Uint8Array(8 + child.padding));

        const data = recursiveBuilder(child);
        header.setUint32(0, data.byteLength + 8 + child.padding)

        // Writing control chars doesn't work with writeStr	
        for (let j = 0; j < 4; j++) {
          header.setUint8(4 + j, child.name.charCodeAt(j));
        }

        const buffer = concatBuffers(header, data);
        output = concatBuffers(output, buffer);
      });

      return output;
    }

    return recursiveBuilder(this.root);
  }


  // Given an mp4 buffer, add quicktime tags 
  // (used by iTunes and recognized by nearly all media players) 
  // based on a js object

  // TODO: Make this return only a moov.udta.meta atom, and not require 
  // an MP4 buffer - leaving the user to add the atom where desired.

  // The only problem with that is that any change to the root atoms requires
  // offsetting the stco data. This could be part of makeMP4, but it's hard
  // to say what's best. For my use cases, this form is the easiest.
  // see here atomicparsley.sourceforge.net/mpeg-4files.html for more info.
  giveTags(tags: {
    track?: string,
    title?: string,
    artist?: string,
    album?: string,
    genre?: string,
    cover?: string
  }) {
    console.log("Giving tags!");
    let offset = this.root.ensureChild("moov.udta").getByteLength();

    const hdlr = this.root.ensureChild('moov.udta.meta.hdlr');
    hdlr.data = new AtomData(new Uint8Array(25));
    hdlr.data.seek(8);
    hdlr.data.writeString('mdirappl');

    const metadata = this.root.ensureChild("moov.udta.meta.ilst");
    metadata.parent!.padding = 4; // meta atom is an odd one.

    const addDataAtom = function (name: string, str: string | number) {
      console.log("Adding data atom: " + name + " with value " + str + "")
      const data = metadata.ensureChild(name + '.data');
      if (str) {
        // Track number is a special case.
        if (name == 'trkn') {
          if(typeof str == 'string') str = parseInt(str);
          data.data = new AtomData(new Uint8Array(40));
          data.data.seek(8);
          data.data.writeUint32(str)
          return data;
        } 
        if(typeof str !== 'string') throw new Error('String expected for addDataAtom');
        data.data = new AtomData(new Uint8Array(str.length + 8));
        data.data.seek(3);
        data.data.writeUint8(1);
        data.data.seek(8);
        data.data.writeString(str);
      }
      return data;
    }

    // It has to be done in this order for cover art to work... I think?
    if (tags.track) addDataAtom('trkn', tags.track);
    if (tags.title) addDataAtom('\xA9nam', tags.title);
    if (tags.artist) addDataAtom('\xA9ART', tags.artist);
    if (tags.album) addDataAtom('\xA9alb', tags.album);
    if (tags.genre) addDataAtom('\xA9gen', tags.genre);

    if (tags.cover) {
      console.log("Adding cover art!");
      const cover = addDataAtom('covr', '');

      const BASE64_MARKER = ';base64,';

      const base64Index = tags.cover.indexOf(BASE64_MARKER) + BASE64_MARKER.length;
      const base64 = tags.cover.substring(base64Index);
      const raw = atob(base64);
      const rawLength = raw.length;
      const array = new Uint8Array(new ArrayBuffer(rawLength));

      for (let i = 0; i < rawLength; i++) {
        array[i] = raw.charCodeAt(i);
      }

      cover.data = new AtomData(new Uint8Array(8));
      cover.data.writeUint32(13);
      cover.data = concatBuffers(cover.data, new AtomData(array));
    }


    // offset the data in stco, otherwise audio mp4s will be unplayable.
    // not sure how this affects video.
    offset = this.root.ensureChild("moov.udta").getByteLength() - offset;
    const stco = this.root.ensureChild('moov.trak.mdia.minf.stbl.stco');

    // This takes a second or more depending on size of file, and speed of computer.
    // TODO: Get this working with WorkerB - my web worker library to have this run async.

    stco.data.seek(8);
    while (stco.data.tell() < stco.data.byteLength) {
      console.log("Offsetting stco data by " + offset + " bytes.")
      const current = BigInt(offset) + stco.data.getUint32();
      stco.data.writeUint32(current);
    }

    return this;
  };

  getCommonTags() {
    const metadata = this.root.ensureChild("moov.udta.meta.ilst");

    const getDataAtom = function (name: string) {
      const leaf = metadata.getChild(name);
      if (!leaf || !leaf.children[0])
        return undefined;

      const data = leaf.children[0].data;
      data.seek(8);
      return data;
    }

    var tags : {[key: string]: string} = {};

    tags.title = getDataAtom('\xA9nam')?.getString() ?? "";
    tags.artist = getDataAtom('\xA9ART')?.getString() ?? "";
    tags.album = getDataAtom('\xA9alb')?.getString() ?? "";
    tags.genre = getDataAtom('\xA9gen')?.getString() ?? "";
    tags.cover = '';


    var cover = getDataAtom('covr');
    if (cover) {
      const data = cover.getBytes();
      const CHUNK_SIZE = 0x8000; //arbitrary number
      let index = 0;
      const length = data.length;
      let result = '';
      let slice;
      while (index < length) {
        slice = data.subarray(index, Math.min(index + CHUNK_SIZE, length));
        result += String.fromCharCode.apply(null, slice);
        index += CHUNK_SIZE;
      }
      tags.cover = 'data:image/gif;base64,' + btoa(result);
    }

    return tags;
  }

}


const concatBuffers = function (buf1: AtomData, buf2: AtomData) {
  const newbuf = new Uint8Array(buf1.byteLength + buf2.byteLength);

  newbuf.set(new Uint8Array(buf1.buffer), 0);
  newbuf.set(new Uint8Array(buf2.buffer), buf1.byteLength);

  return new AtomData(newbuf);
}

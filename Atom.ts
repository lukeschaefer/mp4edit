// the mpeg-4 spec consists of parts called atoms,
// which can contain data, or have other atoms in them,

import { AtomData } from "./AtomData";

// nested like a tree.
export class Atom {

  // Atoms technically shouldn't have data AND children. 
  // but a bunch of them break this rule. This is not
  // handled by this library yet - but this padding variable
  // is for the moov.udta.meta atom, which has a historically
  // different format. See MP4.giveTags for an example.
  padding: number = 0;
  children: Atom[] = [];
  data: AtomData;
  root = false;
  name: string;

  constructor(name: string, public parent?: Atom) {
    if (name == 'root') this.root = true;
    if (name.length !== 4) throw new Error('Atoms must have name length of 4');
    this.name = name;
  }

  hasChild(name: string) {
    return !!this.children.find(child => child.name === name);
  }

  getByteLength() {
    if (this.data) return this.data.byteLength + 8;

    let len = 8 + this.padding;
    this.children.forEach(child => len += child.getByteLength());
    return len;
  }

  toString(indent = 0) {
    let string = '| '.repeat(indent);

    string += (this.root ? 'MP4:' : this.name);

    // If actual atom data was printed, it would mostly be a mess of binary data.
    if (this.data) {
      string += ' => ' + (this.padding ? this.padding + 'pad' : '') + ' data';
    } else {
      this.children.forEach(child => string += '\n' + child.toString(indent + 1));
    }

    return string;
  }

  getChild(name: string): Atom | undefined {
    return this.children.find(child => child.name == name);
  }

  // Given a child path, separated by dots, return that child, or recursively create it
  ensureChild(childName: string): Atom {

    let pathArray = childName.split('.');
    const firstChild = pathArray[0]!;

    if (!this.hasChild(firstChild)) this.addChild(firstChild);

    let child = this.getChild(firstChild)!;

    if (pathArray[1]) {
      pathArray.shift();
      return child.ensureChild(pathArray.join('.'));
    }
    return child;
  }

  addChild(name: string, index?: number) {
    var atom = new Atom(name, this);
    if (index === undefined) {
      this.children.push(atom);
      return atom;
    }
    index = Math.max(index, 0);
    index = Math.min(this.children.length, index);

    this.children.splice(index, 0, atom);
    return atom;
  }
}
# About 

This is a micro library for parsing and editing mp4 files. It's only barely functional, but it does what I needed - which is adding a few iTunes tags to user-uploaded mp4 files. All of this has been only tested on audio files. It can parse an MPEG-4 binary buffer into a traversable 'Atom' structure defined by the spec - edit that structure - and rebuild it into an ArrayBuffer which can be downloaded from a browser or written to a file.

## Installation 

Using npm:

     npm install mp4edit


## Quick Start

```javascript
// In a browser environment, listening to a file-picker:
const fileTags;
const mp4;
const reader = new FileReader();			
reader.readAsArrayBuffer(uploadedFile);

reader.onload = function(data){
	mp4 = new MP4(data.target.result);
	fileTags = mp4.getCommonTags(); // Gets cover, album, artist, title and track number.
	// fileTags.cover can be bound to an <img src='{{cover}}'>
});		

// ----- At some later point -------

mp4.giveTags(newTags); // In the form of an object with optionally cover, album, artist, title or track keys.
const blob = new Blob([mp4.build().buffer], {type: 'audio/mp4'});
const url = URL.createObjectURL(blob);

// The client opening the URL will download it. Or appending an <a> element and calling 'click' on it

URL.revokeObjectURL(url);
```

	
# Usage

### MP4(Buffer mp4)

Given an ArrayBuffer (or other) containing mp4 binary data, will return a root Atom, containing the rest of the structure nested within.

### MP4.prototype.build()

Given a root Atom, will create a jDataView with the binary data. This create the Atom headers, which have four bytes in them denoting their length.

### MP4.prototype.giveTags(Object tags)

Given a JS object with the predefined tags (shown below) this will update the internal tree structure with the tags, and offset the stco atom (see [here](atomicparsley.sourceforge.net/mpeg-4files.html)).


Key  | Value  | type
------------- | -------------  |  ------------
title  | Title of song (or video) | String
artist  | Artist name |  String
album  | Album title |  String
genre  | Song genre |  String
cover  | cover art | ArrayBuffer of jpeg

------

## Atom

The units that parsed mp4 files are reduced to, in adherence to the spec. Each Atom can have data, *or* subatoms as children. Not both - though this rule is broken by several implementations and several atoms.

### Atom(String name)

Constructs an atom with a given four letter name. If given boolean true instead of a name, Atom will act as the mp4 root.

### Atom.hasChild(String name)

Returns true or false if atom has a subatom named <name>

### Atom.getByteLength()

Returns entire byte length of an atom - same as will be in the header value for the atom. Includes the 8 bytes of header and padding for odd Atoms like meta.

### Atom.indexOf(String name)

Returns the index of an atom child. If no child is found with that name, -1 is returned.

### Atom.getChildByName(String name)

Returns the first child of Atom that has the name <name>. If no child is found, returns false.

### Atom.ensureChild(String child)

Searches for a child with name <child>. If none is found, will create one and return it. **String child can include nested names** - such as 'moov.udta.trak'. The method will create neccesary children to accomplish that, and always return an Atom.

### Atom.toString()

Returns a pretty-printed string to help understand the heirarchy of an atom and all of its children.

### Atom.data

A jDataView of the internal binary data. All jDataView methods can be used, such as .getString().

### Atom.padding

Since, as mentioned earlier, some Atoms break the standard a little bit, padding has been added to help deal with that. Primarily, the moov.udta.meta Atom (containing metadata) has a padding of four, which is unique to it, and would be unable to be worked with without that consideration. MP4.parse will correctly identify a moov.udta.meta Atom and not throw an error. Other Atoms that may break spec will not be accounted for.

### Atom.children

An array of the children, which are Atoms

### Atom.parent

The parent Atom, unless this Atom is root - in which case it's not really an atom anyway.

### Atom.name

The four-letter atom name. Usually set by the constructor and kept the same.

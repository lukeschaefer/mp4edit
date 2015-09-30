# About 

This is simply a very small library created for my own uses - which was adding a few iTunes tags to user-uploaded m4a files - which are mp4 files with only audio. All of this has been only tested on audio files. It can parse an MPEG-4 binary buffer into a traversable 'Atom' structure defined by the spec - edit that structure - and rebuild it into an ArrayBuffer which can be downloaded from a browser or written to a file.

## Installation 

Using npm:

     npm install mp4edit

Or just download the [library](https://raw.githubusercontent.com/lukeschaefer/mp4js/master/mp4.js) and use it the same way - but [jDataView](https://github.com/jDataView/jDataView) must be included too!

## Quick Start

	MP4 = require('mp4edit');
	
    // Album cover
    var coverImage = fs.readFileSync('cover.jpg');
	
	// Original MP4
	var mp4 = fs.readFileSync('mp4file.m4a');	
	
	var tags = {
	    title : "Song Title",
	    artist : "Song Artist",
	    album : "Album",
	    genre : "Any genre",
	    cover : coverImage
	};
	
	// Parse, give tags, and build mp4 file.
	var output = MP4.make( MP4.giveTags( MP4.parse(filebuffer), tags));
	
	fs.writeFileSync(output, "output.m4a");

	
# Usage

## MP4

The entry point, returned by require('mp4edit'). Contains three functions.

### MP4.parse(TypedArray mp4)

Given an ArrayBuffer (or other) containing mp4 binary data, will return a root Atom, containing the rest of the structure nested within.

### MP4.make(Atom root)

Given a root Atom, will create a jDataView with the binary data. This create the Atom headers, which have four bytes in them denoting their length.

### MP4.giveTags(Atom root, Object tags)

Given an Atom root, and a JS object with the predefined tags (shown below) this will return an Atom root with identical children as the original, as well as metadata conforming to how iTunes makes it (which nearly all media players will recognize). To do this, it has to offset the stco atom (see [here](atomicparsley.sourceforge.net/mpeg-4files.html)). I'm unsure how this would work with non audio files.

All of these tags are optional, and for the purpose of m4a files - I'm unsure if video players would care about this data:

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

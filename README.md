# Installation 

   npm install mp4edit

## About

This is simply a very small library created for my own uses - which was adding a few iTunes tags to user-uploaded m4a files - which are mp4 files with only audio. All of this has been only tested on audio files. It can parse an MPEG-4 binary buffer into a traversable 'Atom' structure defined by the spec - edit that structure - and rebuild it into an ArrayBuffer which can be downloaded from a browser or written to a file.

## Quick Start

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
	
	// Parse, add tags, and rebuild audio file.
	var output = MP4.make( MP4.giveTags( MP4.parse( filebuffer ), tags) );
	
	fs.writeFileSync(output, "output.m4a");


	
## Docs

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

### Atom.hasChild(String name)

Returns true or false if atom has a subatom named <name>

### Atom.getByteLength()

Returns entire byte length of an atom - same as will be in the header value for the atom. Includes the 8 bytes of header and padding for odd Atoms like meta.

### Atom.toString()

Returns a pretty-printed string to help understand the heirarchy of an atom and all of its children.

### Atom.indexOf(String name)

Returns the index of an atom child. If no child is found with that name, -1 is returned.

### Atom.getChildByName(String name)

Returns the first child of Atom that has the name <name>. If no child is found, returns false.

### Atom.ensureChild(String child)

Searches for a child with name <child>. If none is found, will create one and return it. **String child can include nested names** - such as 'moov.udta.trak'. The method will create neccesary children to accomplish that, and always return an Atom.



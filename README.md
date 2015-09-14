# mp4js

##About

This is simply a very small library created for my own uses - which was adding a few iTunes tags to user-uploaded m4a files - which are mp4 files with only audio. All of this has been only tested on audio files. It can parse an MPEG-4 binary buffer into a traversable 'Atom' structure defined by the spec. 

##Getting started

Simply include mp4.js in your browser project or node, **also** include [jDataView](https://github.com/jDataView/jDataView).

##Usage

###MP4.parse(TypedArray mp4)

Given an ArrayBuffer (or other) containing mp4 binary data, will return a root Atom, containing the rest of the structure nested within.

###MP4.make(Atom root)

Given a root Atom, will create a jDataView with the binary data. This create the Atom headers, which have four bytes in them denoting their length.

###MP4.giveTags(Atom root, Object tags)

Given an Atom root, and a JS object with the predefined tags (shown below) this will return an Atom root with identical children as the original, as well as metadata conforming to how iTunes makes it (which nearly all media players will recognize). To do this, it has to offset the stco atom (see [here](atomicparsley.sourceforge.net/mpeg-4files.html)). I'm unsure how this would work with non audio files.

#### tags:

All of these tags are optional, and for the purpose of m4a files - I'm unsure if video players would care about this data:

Key  | Value  | type
------------- | -------------  |  ------------
title  | Title of song (or video) | String
artist  | Artist name |  String
album  | Album title |  String
genre  | Song genre |  String
cover  | cover art | ArrayBuffer of jpeg

##Example of use:

     // response of ajax request for jpg cover
     var coverImage = new Uint8Array(imgAjax.response);
	
	var tags = {
	    title : "Song Title",
	    artist : "Song Artist",
	    album : "Album",
	    genre : "Any genre",
	    cover : coverImage
	};
	
	// Parse, add tags, and rebuild audio file.
	var buffer = MP4.make( MP4.giveTags( MP4.parse( filebuffer ), tags) );
	
	// Create a blob URL to download:
	var blob = new Blob([buffer.buffer], {type: 'audio/mp4'});
	var url = URL.createObjectURL(blob);

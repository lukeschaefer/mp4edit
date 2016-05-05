// the mpeg-4 spec consists of parts called atoms,
// which can contain data, or have other atoms in them,
// nested like a tree.
function Atom(name, parent){
	
	if(typeof name == 'boolean'){
		if(name)
			this.root = true;
		else
			throw new Error('First arg for atom is either a 4 letter tag name, or boolean true for the root');
	}else if(name.length !== 4)
		throw new Error('Atoms must have name length of 4');
	else
		this.name = name;

	// Atoms technically shouldn't have data AND children. 
	// but a bunch of them break this rule. This is not
	// handled by this library yet - but this padding variable
	// is for the moov.udta.meta atom, which has a historically
	// different format. See MP4.giveTags for an example.
	
	this.padding = 0;
	this.children = [];
	this.data;
	this.parent = parent;

	this.hasChild = function(name){
		return(this.indexOf(name) !== -1)
	}

	this.getByteLength = function(){
		if(this.data)
			return this.data.byteLength + 8;

		var len = 8 + this.padding;
		for(var i in this.children)
			len += this.children[i].getByteLength();
		return len;
	};

	this.toString = function(string, indent){
		var string = '';
		var indent = indent || 0;
		var i = indent;
		while(i--)
			string += '| ';
		i = 0;
		string += (this.root ? 'MP4:' :  this.name);

		// If actual atom data was printed, it would mostly be a mess of binary data.
		if(this.data)
			string += ' => ' + (this.padding ? this.padding + 'pad' : '') + ' data' ;
		else
			for(var i in this.children)
				string += '\n' + this.children[i].toString(string, indent + 1)
		return string
	}

	this.indexOf = function(name){
		for(var i in this.children)
			if(this.children[i].name == name)
				return i;
		return -1;
	}

	this.getChild = function(name){
		for(var i in this.children)
			if(this.children[i].name == name)
				return this.children[i];
		return false;
	}

	this.ensureChild = function(childName){
		
		childName = childName.split('.');
		
		var child = childName[0];

		if(!this.hasChild(child))
			this.addChild(child);

		child = this.getChild(child);


		if(childName[1]){
			childName.shift();
			return child.ensureChild(childName.join('.'));
		}
		return child;
		
	};

	this.addChild = function(name, index){
		var atom = new Atom(name, this);
		if(typeof index === 'undefined'){
			this.children.push(atom);
			return atom;
		}
		index = Math.max(index,0);
		index = Math.min(this.children.length, index);	
		
		this.children.splice(index, 0, atom);
		return atom;
	};
};

// makes a new MP4 object out of data to parse.
MP4 = function(input){
	var data = input;

	
	if(!jDataView)
		throw new Error("Include jDataView to use mp4.js");
	else if(!data.jDataView)
		data = new jDataView(new Uint8Array(input));
	

	var recursiveParse = function(atom, data){
		var tags = {};

		// Minimum atom size is 8 bytes
		while( data.byteLength >= 8 ){
			data.seek(0);
			var tagLength = (data.getUint32(0));
			var tagName  = (data.getString(4,4));
					     

			
			if(tagName.match(/[\xA9\w]{4}/) && tagLength <= data.byteLength){
				var child = new Atom(tagName, atom);

				if(tagName == 'meta')
					child.padding = 4;
				atom.children.push(child);
				recursiveParse(child, data.slice(8+child.padding,tagLength));
				data = data.slice(tagLength, data.byteLength);
			}else{
				atom.data = data;
				return;
			}
		}
	}

	// first this to do is establish root - but from then on this can all be recursive.
	this.root = new Atom(true);
	recursiveParse(this.root, data);
}

MP4.jDataViewToUint = function(buf){
	return  new Uint8Array(buf.buffer).subarray(buf.byteOffset,buf.byteOffset+buf.byteLength);	
}
// In node, TypedArray.set() doesn't seem to work with jDataView, which
// is much faster. It works in chrome - but not sure about other
// browsers. For now, this will do.

MP4.concatBuffers = function(buf1, buf2){
	if(!buf1 || !buf2)
		debugger;

	var newbuf1 = MP4.jDataViewToUint(buf1);
	var newbuf2 = MP4.jDataViewToUint(buf2);
	
	var newbuf = new Uint8Array(newbuf1.byteLength + newbuf2.byteLength);
		
	newbuf.set(newbuf1, 0);
	newbuf.set(newbuf2, newbuf1.byteLength);
	newbuf = new jDataView(newbuf);
	
	return newbuf;
}

// renders an atom-tree to a jDataView buffer.
MP4.prototype.build = function(){
	if(!jDataView)
		throw new Error("Include jDataView to use mp4.js");
	
	var recursiveBuilder = function(atom){
	
		// Here you can see data and children being mutually exclusive.
		// but a more proper version of this would know which atoms
		// are allowed to break this rule.
		if(atom.data)
			return atom.data;
			
		// otherwise we got children to parse.
		var i;
		var output = new jDataView(new Uint8Array());
		
		for(i = 0; i<atom.children.length; i++){
			var child = atom.children[i];
			var buffer = new Uint8Array();
			
			var header = new jDataView(new Uint8Array(8+child.padding));
				
			var data = recursiveBuilder(child);

			header.writeUint32(data.byteLength + 8 + child.padding);
			header.seek(4);
		
			// Writing control chars doesn't work with writeStr	
			for(var j = 0; j < 4; j++){
				header.writeUint8(atom.children[i].name.charCodeAt(j))
			}			
			
			var buffer = MP4.concatBuffers(header, data);
			output = MP4.concatBuffers(output, buffer);		
		}
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

MP4.prototype.giveTags = function(tags){
	if(!tags || typeof tags !== 'object')
		throw new Error("MP4.giveTags needs to be given tags (as a js object - see docs for options)");
	
	var offset = this.root.ensureChild("moov.udta").getByteLength();
	
	var hdlr = this.root.ensureChild('moov.udta.meta.hdlr');
	hdlr.data = new jDataView(new Uint8Array(25));
	hdlr.data.seek(8);
	hdlr.data.writeString('mdirappl');	
	
	var metadata = this.root.ensureChild("moov.udta.meta.ilst");
	metadata.parent.padding = 4; // meta atom is an odd one.
	
	var addDataAtom = function(name, str){
		var data = metadata.ensureChild(name+'.data');
		if(str){
			data.data = new jDataView(new Uint8Array(str.length + 8));
			data.data.seek(3);
			data.data.writeUint8(1);
			data.data.seek(8);
			data.data.writeString(str);
		}
		return data;
	}

	// It has to be done in this order for cover art to work... I think?

	if(tags.title)
		addDataAtom('\xA9nam', tags.title);
	if(tags.artist)
		addDataAtom('\xA9ART', tags.artist);
	if(tags.album)
		addDataAtom('\xA9alb', tags.album);
	if(tags.genre)
		addDataAtom('\xA9gen', tags.genre);
	
	if(tags.cover){
		var cover = addDataAtom('covr');
		
		cover.data = new jDataView(new Uint8Array(8));
		cover.data.writeUint32(13);
		cover.data = this.concatBuffers(cover.data, new jDataView(tags.cover));
	}
	
	
	// offset the data in stco, otherwise audio mp4s will be unplayable.
	// not sure how this affects video.
	offset -= metadata.parent.parent.getByteLength();
	var stco = this.root.ensureChild('moov.trak.mdia.minf.stbl.stco');

	// This takes a second or more depending on size of file, and speed of computer.
	// TODO: Get this working with WorkerB - my web worker library to have this run async.
	
	stco.data.seek(8);
	while(stco.data.tell() < stco.data.byteLength){
		var current = offset + stco.data.getUint32();
		stco.data.skip(-4);
		stco.data.writeUint32(current);
	}

	return this;
};

MP4.prototype.getTags = function(){	
	var metadata = this.root.ensureChild("moov.udta.meta.ilst");
		
	var getDataAtom = function(name){
		var leaf = metadata.getChild(name);	
		if(!leaf || !leaf.children[0])
			return false;

		var data = leaf.children[0].data;	
		data.seek(8);
		return data.getString();
	}

	var tags = {};

	tags.title = getDataAtom('\xA9nam');
	tags.artist = getDataAtom('\xA9ART');
	tags.album = getDataAtom('\xA9alb');
	tags.genre = getDataAtom('\xA9gen');
	
	return tags;
}

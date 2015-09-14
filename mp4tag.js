jDataView.prototype.writeLimitedString = function(str, buf){
	if(this.byteLength - buf < this.tell())
		throw new Error('Buffer outside bounds.');
	if(str.length > buf){
		//String is longer than block. Trim it.
		str = str.substr(0,30);
	}
	this.writeString(str);
	this.skip(buf-str.length);
}

function Atom(name, parent){

	
	if(typeof name == 'boolean'){
		if(name)
			this.root = true;
	}else if(name.length !== 4)
		throw new Error('Atoms must have name length of 4');
	else
		this.name = name;

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
			string += ' ';
		i = 0;
		string += this.name;

		if(this.data)
			string += ' => data';
		else
			for(var i in this.children)
				string += '\n' + this.children[i].toString(string, indent + 2)
		return string
	}

	this.indexOf = function(name){
		for(var i in this.children)
			if(this.children[i].name == name)
				return i;
		return -1;
	}

	this.getChildByName = function(name){
		for(var i in this.children)
			if(this.children[i].name == name)
				return this.children[i];
		return false;
	}

	this.ensureChild = function(childName){
		
		childName = childName.split('.');
		
		var child = childName[0];

		if(!this.hasChild(child))
			this.addChild(new Atom(child));

		child = this.getChildByName(child);


		if(childName[1]){
			childName.shift();
			return child.ensureChild(childName.join('.'));
		}
		return child;
		
	};

	this.addChild = function(atom, index){
		atom.parent = this;
		if(typeof index === 'undefined'){
			this.children.push(atom);
			return atom;
		}
		index = Math.max(index,0);
		index = Math.min(this.children.length, index);

		atom.parent = this;
		
		this.children.splice(index, 0, atom);
		return atom;
	};
};

MP4 = {};
MP4.parse = function(data){

	var recursiveParse = function(atom, data){
		var tags = {};

		while( data.byteLength > 0 ){
			data.seek(0);
			var tagLength = (data.getUint32(0));
			var tagName  = (data.getString(4,4));
			
			if(tagName.match(/\w{4}/) && tagLength <= data.byteLength){
				var child = new Atom(tagName, atom);

				atom.children.push(child);
				recursiveParse(child, data.slice(8,tagLength));
				data = data.slice(tagLength, data.byteLength);
			}else{
				atom.data = data;
				return;
			}
		}
	}

	var root = new Atom(true);
	recursiveParse(root, data);

	return root;

	
}


concatBuffers = function(buf1, buf2){
	var newbuf = new Uint8Array(buf1.byteLength + buf2.byteLength);

	var i = buf1.byteLength;
	buf1.seek(0);
	while(i)
		newbuf[buf1.byteLength-(i--)] = buf1.getUint8(buf1.tell());
	i = buf2.byteLength;
	buf2.seek(0);
	while(i)
		newbuf[buf1.byteLength+buf2.byteLength-(i--)] = buf2.getUint8(buf2.tell());
	return new jDataView(newbuf);

}

MP4.make = function(root){
	var output = new jDataView(new Uint8Array());

	// data overrides leaves I guess.
	if(root.data)
		return root.data;

	var i;
	for(i = 0; i<root.children.length; i++){
		var child = root.children[i];
		var buffer = new Uint8Array();
		var header;
	
		var header = new jDataView(new Uint8Array(8+child.padding));
			
		var data = MP4.make(root.children[i]);

		header.writeUint32(data.byteLength + 8 + child.padding);
		header.seek(4);
		
		
	
		for(var j = 0; j < 4; j++){
		//	console.log(root.children[i].name.charCodeAt(j));
			header.writeUint8(root.children[i].name.charCodeAt(j))
		}

		
		var buffer = concatBuffers(header, data);
		output = concatBuffers(output, buffer);
		
	}
	return output;
}


MP4.giveTags = function(mp4, title, artist, album, genre, coverImage){
	var iTunesData = mp4.ensureChild("moov.udta.meta.ilst");
	var hdlr = iTunesData.parent.addChild(new Atom('hdlr'), 0);
	hdlr.data = new jDataView(new Uint8Array(25));
	hdlr.data.seek(8);
	hdlr.data.writeString('mdirappl');
	iTunesData.parent.padding = 4;
	var addiTunesData = function(atom, name, str){
		var leaf = atom.addChild(new Atom(name));
		var data = leaf.addChild(new Atom('data'));
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
	addiTunesData(iTunesData, '\xA9nam', title);
	addiTunesData(iTunesData, '\xA9ART', artist);
	addiTunesData(iTunesData, '\xA9alb', album);
	addiTunesData(iTunesData, '\xA9gen', genre);

	var cover = addiTunesData(iTunesData, 'covr');
	cover.data = new jDataView(new Uint8Array(8));
	cover.data.writeUint32(13);
	cover.data = concatBuffers(cover.data, new jDataView(coverImage));

	var offset = (iTunesData.parent.parent.getByteLength());
	var stco = mp4.ensureChild('moov.trak.mdia.minf.stbl.stco');
	console.log("Offseting stco by + " + offset);

	stco.data.seek(8);
	while(stco.data.tell() < stco.data.byteLength){
		var current = offset + stco.data.getUint32();
		stco.data.skip(-4);
		stco.data.writeUint32(current);
	}

	return mp4;
};

















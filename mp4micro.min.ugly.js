function Atom(t) {
    if ("boolean" == typeof t) {
        if (!t) throw new Error("First arg for atom is either a 4 letter tag name, or boolean true for the root");
        this.root = !0;
    } else {
        if (4 !== t.length) throw new Error("Atoms must have name length of 4");
        this.name = t;
    }
    this.padding = 0, this.children = [], this.data = new DataView(new Uint8Array(0)), 
    this.parent = !1, this.hasChild = function(t) {
        return -1 !== this.indexOf(t);
    }, this.getByteLength = function() {
        if (this.data) return this.data.byteLength + 8;
        var t = 8 + this.padding;
        for (var e in this.children) t += this.children[e].getByteLength();
        return t;
    }, this.toString = function(t, e) {
        for (var t = "", e = e || 0, n = e; n--; ) t += "| ";
        if (n = 0, t += this.root ? "MP4:" : this.name, this.data) t += " => " + (this.padding ? this.padding + "pad" : "") + " data"; else for (var n in this.children) t += "\n" + this.children[n].toString(t, e + 1);
        return t;
    }, this.indexOf = function(t) {
        for (var e in this.children) if (this.children[e].name == t) return e;
        return -1;
    }, this.getChildByName = function(t) {
        for (var e in this.children) if (this.children[e].name == t) return this.children[e];
        return !1;
    }, this.ensureChild = function(t) {
        t = t.split(".");
        var e = t[0];
        return this.hasChild(e) || this.addChild(new Atom(e)), e = this.getChildByName(e), 
        t[1] ? (t.shift(), e.ensureChild(t.join("."))) : e;
    }, this.addChild = function(t, e) {
        return t.parent = this, "undefined" == typeof e ? (this.children.push(t), t) : (e = Math.max(e, 0), 
        e = Math.min(this.children.length, e), t.parent = this, this.children.splice(e, 0, t), 
        t);
    };
}

MP4 = {}, MP4.parse = function(t) {
    var e = t;
    if (!DataView) throw new Error("Include DataView to use mp4.js");
    e.DataView || (e = new DataView(new Uint8Array(t)));
    var n = function(t, e) {
        for (;e.byteLength >= 8; ) {
            e.seek(0);
            var a = e.getUint32(0), i = e.getString(4, 4);
            if (!(i.match(/\w{4}/) && a <= e.byteLength)) return void (t.data = e);
            var r = t.addChild(new Atom(i));
            "meta" == i && (r.padding = 4), t.children.push(r), n(r, e.slice(8 + r.padding, a)), 
            e = e.slice(a, e.byteLength);
        }
    }, a = new Atom(!0);
    return n(a, e), a;
}, MP4.concatBuffers = function(t, e) {
    var n = new Uint8Array(t.byteLength + e.byteLength), a = t.byteLength;
    for (t.seek(0); a; ) n[t.byteLength - a--] = t.getUint8(t.tell());
    for (a = e.byteLength, e.seek(0); a; ) n[t.byteLength + e.byteLength - a--] = e.getUint8(e.tell());
    return new DataView(n);
}, MP4.make = function(t) {
    if (!DataView) throw new Error("Include DataView to use mp4.js");
    var e = new DataView(new Uint8Array());
    if (t.data) return t.data;
    var n;
    for (n = 0; n < t.children.length; n++) {
        var a, i = t.children[n], r = new Uint8Array(), a = new DataView(new Uint8Array(8 + i.padding)), h = MP4.make(i);
        a.writeUint32(h.byteLength + 8 + i.padding), a.seek(4);
        for (var d = 0; 4 > d; d++) a.writeUint8(t.children[n].name.charCodeAt(d));
        var r = this.concatBuffers(a, h);
        e = this.concatBuffers(e, r);
    }
    return e;
}, MP4.giveTags = function(t, e) {
    if (!e || "object" != typeof e) throw new Error("MP4.giveTags needs to be given tags (as a js object - see docs for options)");
    var n = t.ensureChild("moov.udta.meta.ilst"), a = n.parent.addChild(new Atom("hdlr"), 0);
    a.data = new DataView(new Uint8Array(25)), a.data.seek(8), a.data.writeString("mdirappl"), 
    n.parent.padding = 4;
    var i = function(t, e, n) {
        var a = t.addChild(new Atom(e)), i = a.addChild(new Atom("data"));
        return n && (i.data = new DataView(new Uint8Array(n.length + 8)), i.data.seek(3), 
        i.data.writeUint8(1), i.data.seek(8), i.data.writeString(n)), i;
    };
    if (e.title && i(n, "©nam", e.title), e.artist && i(n, "©ART", e.artist), e.album && i(n, "©alb", e.album), 
    e.genre && i(n, "©gen", e.genre), e.cover) {
        var r = i(n, "covr");
        r.data = new DataView(new Uint8Array(8)), r.data.writeUint32(13), r.data = this.concatBuffers(r.data, new DataView(e.cover));
    }
    var h = n.parent.parent.getByteLength(), d = t.ensureChild("moov.trak.mdia.minf.stbl.stco");
    for (d.data.seek(8); d.data.tell() < d.data.byteLength; ) {
        var s = h + d.data.getUint32();
        d.data.skip(-4), d.data.writeUint32(s);
    }
    return t;
};

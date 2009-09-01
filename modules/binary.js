defineClass(org.helma.wrappers.ByteArray);
export('ByteArray');

__shared__ = true;

Object.defineProperty(String.prototype, 'toByteArray', {
    value: function(charset) {
        charset = charset || 'utf8';
        return new ByteArray(String(this), charset);
    }
});

Object.defineProperty(ByteArray.prototype, 'toArray', {
    value: function(charset) {
        if (charset) {
            var str = this.decodeToString(charset);
            var result = new Array(str.length);
            for (var i = 0; i < str.length; i++) {
                result[i] = str.charCodeAt(i);
            }
            return result;
        } else {
            var result = new Array(this.length);
            for (var i = 0; i < this.length; i++) {
                result[i] = this[i];
            }
            return result;
        }
    }
});

Object.defineProperty(ByteArray.prototype, 'reverse', {
    value: function() {
        return Array.reverse(this);
    }
})

Object.defineProperty(ByteArray.prototype, 'sort', {
    value: function(fn) {
        fn = fn || function(a, b) a - b;
        return Array.sort(this, fn);
    }
})

Object.defineProperty(ByteArray.prototype, 'forEach', {
    value: function(fn, thisObj) {
        Array.forEach(this, fn, thisObj);
    }
})


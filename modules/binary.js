defineClass(org.helma.wrappers.ByteArray);
export('ByteArray');

__shared__ = true;

Object.defineProperty(String.prototype, 'toByteArray', {
    value: function(charset) {
        charset = charset || 'utf8';
        return new ByteArray(String(this), charset);
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


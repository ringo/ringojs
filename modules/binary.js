defineClass(org.helma.util.ByteArray);

export('ByteArray');

__shared__ = true;

Object.defineProperty(String.prototype, 'toByteArray', {
    value: function(charset) {
        charset = charset || 'utf8';
        return new ByteArray(String(this), charset);
    }
});


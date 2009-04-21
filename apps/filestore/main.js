include('helma/webapp/response');
include('model');

export('index');

// the main action is invoked for http://localhost:8080/
// this also shows simple skin rendering
function index(req) {
    if (req.params.save) {
        return createBook(req);
    }
    if (req.params.remove) {
        return removeBook(req);
    }
    return SkinnedResponse('skins/index.html', {
        title: 'Storage Demo',
        books: function(/*tag, skin, context*/) {
            var books = Book.all();
            return books.map(function(book) {
                return book.getFullTitle() + ' ' + getDeleteLink(book);
            }).join('<br>\r\n');
        }
    });
}

function createBook(req) {
    var author = new Author({name: req.params.author});
    var book = new Book({author: author, title: req.params.title});
    // author is saved transitively
    book.save();
    return new RedirectResponse('/');
}

function removeBook(req) {
    var book = Book.get(req.params.remove);
    // author is removed through cascading delete
    book.remove();
    return new RedirectResponse('/');
}

function getDeleteLink(book) {
    return '<a href="/?remove=' + book._id + '">delete</a>';
}

if (__name__ == "__main__") {
    require('helma/webapp').start();
}

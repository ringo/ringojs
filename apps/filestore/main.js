include('helma/webapp/response');
include('./model');

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
    return SkinnedResponse(getResource('./skins/index.html'), {
        title: 'Storage',
        books: Book.all(),
        action: req.path
    });
}

function createBook(req) {
    var author = new Author({name: req.params.author});
    var book = new Book({author: author, title: req.params.title});
    // author is saved transitively
    book.save();
    return new RedirectResponse(req.path);
}

function removeBook(req) {
    var book = Book.get(req.params.remove);
    // author is removed through cascading delete
    book.remove();
    return new RedirectResponse(req.path);
}

if (__name__ == "__main__") {
    require('helma/webapp').start();
}

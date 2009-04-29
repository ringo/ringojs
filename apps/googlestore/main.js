include('helma/webapp/response');
include('./model');

export('index', 'edit', 'remove');

// the main action is invoked for http://localhost:8080/
// this also shows simple skin rendering
function index(req) {
    if (req.params.save) {
        return createBook(req);
    }
    return SkinnedResponse(getResource('./skins/index.html'), {
        title: 'Storage',
        books: Book.all(),
        action: req.path
    });
}

function edit(req, id) {
    var book = Book.get(id);
    if (req.isPost) {
        var author = book.author;
        author.name = req.params.author;
        book.title = req.params.title;
        author.save();
        book.save();
        return new RedirectResponse("../");
    }
    return SkinnedResponse(getResource('./skins/edit.html'), {
        title: 'Storage',
        book: book,
        action: req.path
    })
}

function remove(req, id) {
    var book = Book.get(id);
    if (req.params.remove && req.isPost) {
        return removeBook(req, book);
    }
    return SkinnedResponse(getResource('./skins/remove.html'), {
        title: 'Storage',
        book: book,
        action: req.path
    })
}

function createBook(req) {
    var author = new Author({name: req.params.author});
    author.save(); // no cascading save yet
    var book = new Book({author: author, title: req.params.title});
    book.save();
    return new RedirectResponse(req.path);
}

function removeBook(req, book) {
    // no cascading delete
    book.author.remove();
    book.remove();
    return new RedirectResponse("../");
}

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
    return new SkinnedResponse('skins/index.html', {
        title: 'Storage Demo',
        books: function(/*tag, skin, context*/) {
            return Book.all().map(function(book) {
                return book.getFullTitle() + ' ' + getDeleteLink(book);
            }).join('<br>\r\n');
        }
    });
}

function createBook(req) {
    var author = new Author({name: req.params.author});
    author.save(); // no cascading save yet
    var book = new Book({author: author, title: req.params.title});
    book.save();
    return new RedirectResponse('/');
}

function removeBook(req) {
    var book = Book.get(req.params.remove);
    // no cascading delete
    book.author.remove();
    book.remove();
    return new RedirectResponse('/');
}

function getDeleteLink(book) {
    return '<a href="/?remove=' + book.getId() + '">delete</a>';
}

include('model');

export('index');

// the main action is invoked for http://localhost:8080/
// this also shows simple skin rendering
function index(req, res) {
    if (req.params.save) {
        createBook(req, res);
    }
    if (req.params.remove) {
        removeBook(req, res);
    }
    res.render('skins/index.html', {
        title: 'Storage Demo',
        books: function(/*tag, skin, context*/) {
            return Book.all().map(function(book) {
                return book.getFullTitle() + ' ' + getDeleteLink(book);
            }).join('<br>\r\n');
        }
    });
}

function createBook(req, res) {
    var author = new Author({name: req.params.author});
    author.save(); // no cascading save yet
    var book = new Book({author: author, title: req.params.title});
    book.save();
    res.redirect('/');
}

function removeBook(req, res) {
    var book = Book.get(req.params.remove);
    // author is removed through cascading delete
    book.remove();
    res.redirect('/');
}

function getDeleteLink(book) {
    return '<a href="/?remove=' + book.getId() + '">delete</a>';
}

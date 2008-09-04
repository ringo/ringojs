importFromModule('helma.simpleweb', 'handleRequest');
importFromModule('helma.skin', 'render');
importModule('helma.app', 'app');
// db model
importModule('model');


// the main action is invoked for http://localhost:8080/
// this also shows simple skin rendering
function main_action() {
    if (req.data.save) {
        createBook();
    }
    if (req.data.remove) {
        removeBook();
    }
    var books = model.Book.all();
    render('skins/index.html', {
        title: 'Storage Demo',
        books: function(/*tag, skin, context*/) {
            for (var i in books) {
                var book = books[i]
                res.writeln(book.getFullTitle(), getDeleteLink(book), "<br>");
            }
        }
    });
}

function createBook() {
    var author = new model.Author({name: req.data.author});
    var book = new model.Book({author: author, title: req.data.title});
    // author is saved transitively
    book.save();
    res.redirect('/');
}

function removeBook() {
    var book = model.Book.get(req.data.remove);
    // author is removed through cascading delete
    book.remove();
    res.redirect('/');
}

function getDeleteLink(book) {
    return '<a href="/?remove=' + book._id + '">delete</a>';
}

if (__name__ == "__main__") {
    app.start();
}

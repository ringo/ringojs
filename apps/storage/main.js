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
        title: 'Minibase Demo',
        books: function(/*tag, skin, context*/) {
            for (var i in books) {
                var book = books[i]
                res.writeln(book.getFullTitle(), getDeleteLink(book), "<br>");
            }
        }
    });
}

function createBook() {
    var book = new model.Book({author: req.data.author, title: req.data.title});
    book.save();
    res.redirect('/');
}

function removeBook() {
    var book = model.Book.get(req.data.remove);
    book.remove();
    res.redirect('/');
}

function getDeleteLink(book) {
    return '<a href="/?remove=' + book._id + '">delete</a>';
}

function main() {
    app.start();
}
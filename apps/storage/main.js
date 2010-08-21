var {Response} = require('ringo/webapp/response');
include('./model');

export('index', 'edit', 'remove');

// the main action is invoked for http://localhost:8080/
// this also shows simple skin rendering
function index(req) {
    if (req.params.save) {
        return createBook(req);
    }
    return Response.skin('./skins/index.html', {
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
        return Response.redirect("../");
    }
    return Response.skin('./skins/edit.html', {
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
    return Response.skin('./skins/remove.html', {
        title: 'Storage',
        book: book,
        action: req.path
    })
}

// Simple RESTful API example.
exports.books = function (req, resource) {
    if (!/^[0-9a-z]+\.(json|xml)$/.test(resource)) { // Validate URI.
        return Response.error('Invalid request; check URI.');
    }
    var [id, type] = resource.split('.');
    var book = Book.get(id); // Figure out response.
    return !book ? Response.notFound(req.path) : type == 'json' ?
            Response.json({author: book.author.name, title: book.title}) :
            Response.xml(<book>
                            <author>{book.author.name}</author>
                            <title>{book.title}</title>
                        </book>);
};

function createBook(req) {
    var author = new Author({name: req.params.author});
    var book = new Book({author: author, title: req.params.title});
    author.books = [book];
    // author is saved transitively
    // author.save();
    book.save();
    return Response.redirect(req.path);
}

function removeBook(req, book) {
    // no cascading delete
    book.author.remove();
    book.remove();
    return Response.redirect("../");
}

if (require.main == module) {
    require('ringo/webapp').main(module.directory);
}

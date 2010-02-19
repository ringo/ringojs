include('ringo/webapp/response');


exports.index = function index(req) {
    return new SkinnedResponse('skins/index.html', {
        content: "It's working!"
    });
}


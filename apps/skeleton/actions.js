include('ringo/webapp/response');

exports.index = function (req) {
    return skinResponse('skins/index.html', {
        content: "It's working!"
    });
};

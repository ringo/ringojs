$(document).ready(function() {
    // filter given ul $list by text query
    var filterList = function(query, $list) {
        if (!query) {
            $('li', $list).show();
            return false;
        }
        var found = false;
        $('li', $list).each(function() {
            var $item = $(this);
            if ($item.html().toLowerCase().indexOf(query) < 0) {
                $item.hide();
            } else {
                $item.show();
                found = true;
            }
        });
        return found;
    };

    // search module list
    function doFilter() {
        var query = $.trim($(this).val().toLowerCase());
        filterList(query, $('#modulelist'));

        return $('#modulelist li:visible').length;
    }

    var searchbox = $("#filter");
    searchbox.on("click", function(event) {
        doFilter.apply(this);
    }).on("keyup", function(event) {
        if (doFilter.apply(this) === 1 && event.keyCode === 13) {
            $('#modulelist li:visible a').get(0).click();
        }
    });;

    // only focus search box if current location does not have a fragment id
    if (!location.hash) {
        searchbox.focus();
    }

});
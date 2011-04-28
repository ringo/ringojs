function jsdocSetup() {

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
        /* if (sessionStorage) {
            sessionStorage.jsdocQuery = query;
        } */
        filterList(query, $('.jsdoc-leftnav'));
    }
    $("#jsdoc-leftnavsearch").change(doFilter).keyup(doFilter).click(doFilter).focus();

    // hide all but first paragraph from module fileoverview
    var $showMoreLink = $('.jsdoc-showmore');
    $(".jsdoc-fileoverview").each(function(idx, overview) {
        var $overview = $(overview);
        var $allButFirstElement = $overview.children().not(":first-child");
        if ($allButFirstElement.length) {
            $allButFirstElement.hide();
            $overview.append($showMoreLink.clone());
        }
        return;
    });
    $(".jsdoc-showmore").click(function() {
        $(this).hide().siblings().show();
    });
    
    // load query string from storage if any
    /* var query = sessionStorage && sessionStorage.jsdocQuery;
    if (query) {
        $("#jsdoc-leftnavsearch").val(query).trigger('keyup');
    } */
}

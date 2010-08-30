function jsdocSetup() {

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
    $("#jsdoc-leftnavsearch").keyup(function() {
        var query = $.trim($(this).val().toLowerCase());
        filterList(query, $('.jsdoc-leftnav'));
    });

    var $showMoreLink = $('.jsdoc-showmore');
    $(".jsdoc-fileoverview").each(function(idx, overview) {
        var $overview = $(overview);
        //console.log($(":first", $overview));
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
}

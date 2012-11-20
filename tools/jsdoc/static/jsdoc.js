$(document).ready(function() {
    // filter given ul $list by text query
    var filterList = function(query, $list) {
        if (!query) {
            $('li', $list).show();
            return -1;
        }
        var count = 0;
        $('li', $list).each(function() {
            var $item = $(this);
            if ($item.html().toLowerCase().indexOf(query) < 0) {
                $item.hide();
            } else {
                $item.show();
                count++;
            }
        });

        return count;
    };

    var $searchbox = $("#filter");
    $searchbox.on("keyup click", function(event) {
        // ESC key
        if (event.keyCode === 27) {
            $searchbox.val("");
        }


        if (filterList.apply(this, [$.trim($(this).val().toLowerCase()), $('#modulelist')]) === 1) {
            $("#filter, #modulelist").addClass("submittable");

            if (event.keyCode === 13) {
                $('#modulelist li:visible a').get(0).click();
            }
        } else {
            $("#filter, #modulelist").removeClass("submittable");
        }
    });

    // only focus search box if current location does not have a fragment id
    if (!location.hash) {
        $searchbox.focus();
    }

});
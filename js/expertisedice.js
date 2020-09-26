
window.gdebug = require('debug');
//gdebug.enable('expertisedice:*');
var debug = gdebug('expertisedice:*');
    
function set_credit_at_bottom()
{
    $("#footer").css("margin-top", Math.max( 100,
                                             $(window).height() - $("#header").outerHeight(true) -
                                             $("#body").outerHeight(true) - $("#credits").outerHeight(true)));
}

function set_codeblock_widths()
{
    // this is a legacy class we use because of a previous dependency on Pure 
    if( $(".codeblock").length != 0 )
    {
         var paddingRight = $(".codeblock").css("padding-right");
         var paddingLeft = $(".codeblock").css("padding-left");
         paddingLeft = paddingLeft.substring(0,paddingLeft.length-2);
         paddingRight = paddingRight.substring(0,paddingRight.length-2);
         paddingLeft = parseInt(paddingLeft);
         paddingRigt = parseInt(paddingRight);

         // padding is left in innerWidth
         $(".codeblock").width($("#post").innerWidth() - paddingRight - paddingLeft);
    }

    if( $("pre").length != 0 )
    {
        var paddingRight = $("pre").css("padding-right");
        var paddingLeft = $("pre").css("padding-left");
        paddingLeft = paddingLeft.substring(0,paddingLeft.length-2);
        paddingRight = paddingRight.substring(0,paddingRight.length-2);
        paddingLeft = parseInt(paddingLeft);
        paddingRigt = parseInt(paddingRight);

        // padding is left in innerWidth
        $("pre").width($("#post").innerWidth() - paddingRight - paddingLeft);
    }
}

function loadContent(href)
{
    $("#post").load(href + " #content", function() {

        set_credit_at_bottom();
        set_codeblock_widths();
        debug("scroll to top");
        $("html, body").animate({ scrollTop: 0 }, 200, "swing");

        // rebind the click event for the anchors in the new doc
        $("#post a").click( onClick );
    });
}

// taken from jquery site
function jq( myid ) 
{
    return myid.replace( /(:|\.|\[|\])/g, "\\$1" );
}

// scroll to the link in the document.
function moveToHash( hash )
{
    // moving in between places in the document does not change the history.
    $('html, body').stop().animate({
        'scrollTop': $(jq(hash)).offset().top
    }, 600, 'swing');
    // this doesn't quite work.  Need to look into it more so that the
    // movements to hashes will work with the history.
    // window.location.hash = hash;
}

function onClick(e)
{
    var _href = $(this).attr("href");

    // if this is an internal anchor, just scroll to it (footnotes)
    if(_href.startsWith("#"))
    {
        e.preventDefault();
        debug("moving to " + _href);
        moveToHash(_href);
        return;
    }

    // if this not a post for the blog, then load the new page
    if( $(this).context.host != window.location.host || _href.startsWith("/pages") || _href.startsWith("/download"))
    {
        debug("$(this).context.host = " + $(this).context.host);
        debug("window.location = " + window.location);
        window.location = _href;
        return;
    }

    // load the new page into the content space,
    // record the history change, and scroll to the top
    e.preventDefault();
    debug("pushState " + _href);
    history.pushState(null, null, _href);
    loadContent(_href);
}

$(document).ready( function() {

    var popped = ('state' in window.history && window.history.state !== null), initialURL = location.href;

    // if the history API is available
    if( !!(window.history && window.history.pushState) )
    {
        $("#body a").click( onClick );

        debug("Binding popstate");
        $(window).bind("popstate", function(e) {

            debug("popstate " + location.href);
            var initialPop = !popped && location.href == initialURL;
            popped = true;
            if ( initialPop )
            {
                return;
            }
            e.preventDefault();
            loadContent(location.href);
        });

        set_credit_at_bottom();
        set_codeblock_widths();
    }
    else
    {
        // do nothing, and everything behaves as if there was no javascript
    }
});

(function ($) {
    "use strict";

    setTimeout(function () {
        $("#spinner").removeClass("show");
    }, 1);

    if (typeof WOW !== "undefined") {
        new WOW().init();
    }

    $(window).on("scroll", function () {
        const sticky = $(this).scrollTop() > 45;
        $(".navbar").toggleClass("sticky-top shadow-sm", sticky);
        $(".back-to-top").fadeToggle("slow", $(this).scrollTop() > 100);
    });

    $("[data-toggle='counter-up']").counterUp({
        delay: 10,
        time: 2000
    });

    $(".back-to-top").on("click", function () {
        $("html, body").animate({ scrollTop: 0 }, 1500, "easeInOutExpo");
        return false;
    });
}(jQuery));

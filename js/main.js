const SamplePathParser = require('./lib/sampleOrphans');

const BTN_COLORS = {
    'blank': 'assets/b_off.png',
    'green': 'assets/b_green.png',
    'blank_lumen': 'assets/b_off_lumen.png',
    'pink': 'assets/b_pink.png',
    'red': 'assets/b_red.png'

}
const css = {
    "backgroundImage": ".background-image",
    "thaButton": "#button-container",
    "thaButtonImg": "#button-container img",
    "headerText": "#header-intro-text",
    "console": "#console",
    "headerTitle": "#header-title"
}

let $thaButton,
    $headerText,
    $headerTitle,
    $thaButtonImg = null;

let isToggled = false
let blinkerTimeout = 0


function init() {
    $thaButton = $(css.thaButton)
    $thaButtonImg = $(css.thaButtonImg)
    $headerText = $(css.headerText)
    $headerTitle = $(css.headerTitle)
    $console = $(css.console)

    listen()
}

function log(msg) {
    $console.append(msg + "<br/>")
}

function onStart() {
    $thaButtonImg.attr("src", BTN_COLORS.pink)
    $headerText.html("Processing...")

    $headerTitle.removeClass("header-title")
    animateBtn()

    log("Starting")
    window.setTimeout(function() {
        SamplePathParser.dirCheck()
        //log("Dir is Checked.")
        SamplePathParser.run(log)
    }, 100)

    if (isToggled) {
        $thaButtonImg.attr("src", BTN_COLORS.red)
        window.clearInterval(blinkerTimeout)
        isToggled = false
        $headerText.html("Abort")
        $thaButton.off("click")
    } else { isToggled = true }
}

function listen() {
    $thaButton.on("mouseover", () => {
        if (!isToggled) $thaButtonImg.attr("src", BTN_COLORS.blank_lumen)
    })
    $thaButton.on("mouseout", () => {
        if (!isToggled) $thaButtonImg.attr("src", BTN_COLORS.blank)
    })
    $thaButton.on("click", () => {
        onStart()

    })
}

function animateBtn() {
    window.clearInterval(blinkerTimeout)
    blinkerTimeout = window.setInterval(function() {
        let $curr = $thaButtonImg.attr("src");
        if ($curr == BTN_COLORS.blank) {
            $thaButtonImg.attr("src", BTN_COLORS.pink)
        } else {
            $thaButtonImg.attr("src", BTN_COLORS.blank)
        }
    }, 500)
}


$(document).ready(function() {
    init()
   // fancyIntro()

});

function fancyIntro() {
    let setBlur = function(ele, radius) {
        $(ele).css({
            "-webkit-filter": "blur(" + radius + "px)",
            "filter": "blur(" + radius + "px)"
        });
    };

    let tweenBlur = function(ele, startRadius, endRadius) {
        $({ blurRadius: startRadius }).animate({ blurRadius: endRadius }, {
            duration: 500,
            easing: 'swing', // or "linear"
            // use jQuery UI or Easing plugin for more options
            step: function() {
                setBlur(ele, this.blurRadius);
            },
            complete: function() {
                // Final callback to set the target blur radius
                // jQuery might not reach the end value
                setBlur(ele, endRadius);
            }
        });
    };
    let $content = $(".content")

    $content.hide()
    $headerText.hide()
    $thaButton.hide()

    window.setTimeout(function() {
        tweenBlur(css.backgroundImage, 0, 20);
    }, 100);


    window.setTimeout(function() {
        tweenBlur($headerText, 20, 0);
        $content.show()
        $headerText.show()
    }, 1000);

    window.setTimeout(function() {
        tweenBlur($thaButton, 20, 0);

        $thaButton.show()
    }, 1500);

    /*
        window.setInterval(function() {
            tweenBlur(".background-image", 15, 10);  
        }, 3000 + Math.floor((Math.random() * 2500) + 1)    );
         
        window.setInterval(function() {
            tweenBlur(".background-image", 10, 15);  
        }, 3000+ Math.floor((Math.random() * 2500) + 1));
    */
}
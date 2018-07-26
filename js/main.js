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
    "thaButtonImg": "#seek-off-img",
    "thaButtonSeekOff": "#seek-off-img",
    "thaButtonSeekOffHover": "#seek-off-hover-img",
    "thaButtonSeekOn": "#seek-on-img",
    "thaButtonSuccess": "#success-img",
    "thaButtonError": "#error-img",
    "headerText": "#header-intro-text",
    "console": "#console",
    "headerTitle": "#header-title"
}

let $dom = {}

let isToggled = false


function init() {
    for (element in css) {
        $dom[element] = $(css[element])
    }

    listen()
}

function log(msg) {
    $dom.console.append(msg + "<br/>")
}

function onStart() {
    //$thaButtonImg.attr("src", BTN_COLORS.pink)

    //$headerTitle.removeClass("header-title")

showButton("thaButtonSeekOn")

    log("Starting")
    SamplePathParser.dirCheck()
    //log("Dir is Checked.")
   
    SamplePathParser.run(log) 
     showButton("thaButtonSuccess")

     $dom.headerText.html("Done")


    if (isToggled) {
    return false;
        isToggled = false
        $dom.headerText.html("Please reload app")
        $dom.thaButton.off("click")
      
    showButton("thaButtonError")
    } else { isToggled = true }
}

function listen() {
    $dom.thaButton.on("mouseover", () => {
        if (!isToggled) $dom.thaButtonImg.attr("src", BTN_COLORS.blank_lumen)
    })
    $dom.thaButton.on("mouseout", () => {
        if (!isToggled) $dom.thaButtonImg.attr("src", BTN_COLORS.blank)
    })
    $dom.thaButton.on("click", () => {
        onStart()

    })
}

function showButton(d){
     $dom.thaButtonSeekOff.hide()
      $dom.thaButtonSeekOn.hide()
      $dom.thaButtonSuccess.hide()
      $dom.thaButtonError.hide()
$dom[d].show()
}



$(document).ready(function() {
    init()
    //onStart()   // DEBUG
    fancyIntro()

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
    $dom.headerText.hide()
    $dom.thaButton.hide()

    window.setTimeout(function() {
        tweenBlur(css.backgroundImage, 0, 20);
    }, 100);


    window.setTimeout(function() {
        tweenBlur($dom.headerText, 20, 0);
        $content.show()
        $dom.headerText.show()
    }, 1000);

    window.setTimeout(function() {
        tweenBlur($dom.thaButton, 20, 0);

        $dom.thaButton.show()
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
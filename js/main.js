const seekOrphans = require('./sampleOrphans');



const BTN_COLORS = {
    'blank': 'assets/b_off.png',
    'green': 'assets/b_green.png',
    'blank_lumen': 'assets/b_off_lumen.png',
    'pink': 'assets/b_pink.png',
    'red': 'assets/b_red.png'

}

let $thaButton,
    $thaButtonImg = null
let isToggled = false
let blinkerTimeout = 0

function listen() {
    $thaButton.on("mouseover", () => {
        if (!isToggled) $thaButtonImg.attr("src", BTN_COLORS.blank_lumen)
    })
    $thaButton.on("mouseout", () => {
        if (!isToggled) $thaButtonImg.attr("src", BTN_COLORS.blank)
    })
    $thaButton.on("click", () => {
        $thaButtonImg.attr("src", BTN_COLORS.pink)

        animateBtn()

        if (isToggled) {
            $thaButtonImg.attr("src", BTN_COLORS.red)
            window.clearInterval(blinkerTimeout)
            isToggled = false
        } else { isToggled = true }

    })
}

function init() {
    $thaButton = $("#button-container")
    $thaButtonImg = $("#button-container img")

    listen()
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
});
/**
 * Configured commands can be found at the bottom of this file.
 */

var terminal = {}
terminal.isFixMode = false

terminal.init = function(callbacks) {
    document.addEventListener('keydown', terminal.event.keydown, false);
    //document.getElementById('console').innerHTML += '<p>Last login: ' + (new Date()).toUTCString() + ' on ttys000</p>';
    this.newLine()
    terminal.callbacks = callbacks
};
terminal.scrollDown = function() {
    var c = document.getElementById('console-wrapper')
    c.scrollTo(0, c.scrollHeight)
};
terminal.newLine = function() {
    if (document.getElementsByClassName('line--active').length)
        document.getElementsByClassName('line--active')[0].classList.remove('line--active');
    document.getElementById('console').innerHTML += '<p class="line line--active"></p>';
};
terminal.addLine = function(content) {
    document.getElementById('console').innerHTML += '<p>' + content + '</p>';
    terminal.newLine()
    terminal.scrollDown()
};

terminal.history = {}
terminal.history.idx = null
terminal.history.data = []
terminal.history.add = function(cmd) {
    terminal.history.idx = null
    terminal.history.data.push(cmd)
};
terminal.history.getLast = function(direction) {
    if (terminal.history.idx === null)
        terminal.history.idx = terminal.history.data.length;
    if (direction === '-' && terminal.history.idx > 0)
        terminal.history.idx--;
    else if (direction === '+' && terminal.history.idx <= terminal.history.data.length - 1)
        terminal.history.idx++;
    return terminal.history.data[terminal.history.idx];
};

terminal.event = {};
terminal.event.keydown = function(e) {
    var self = terminal;
    var char = e.key;
    var line = document.getElementsByClassName('line--active')[0];
if(terminal.isFixMode) {
    console.log(e.key)
    return true
}
    if (e.key === 'Backspace') {
        line.innerText = line.innerText.substr(0, line.innerText.length - 1);
        return;
    } else if (e.key === 'Tab') {
        e.preventDefault();
        return;
    } else if (e.key === 'Dead') {
        char = '~';
    } else if (e.key === 'ArrowUp') {
        line.innerHTML = terminal.history.getLast('-') || '';
        e.preventDefault();
        return;
    } else if (e.key === 'ArrowDown') {
        line.innerHTML = terminal.history.getLast('+') || '';
        e.preventDefault();
        return;
    } else if (e.key === 'Space') {
        char = " ";
    } else if (e.key === 'Enter') {
        self.history.add(line.innerText);
        self.command.exec(line.innerText);
        return;
    } else if (e.key.length > 1) {
        return;
    }

    line.innerText += char;
};



// Commands
terminal.command = {};
terminal.command.exec = function(cmd) {
    if (terminal.command[cmd]) {
        terminal.addLine(terminal.command[cmd]());
    } else if (terminal.command[cmd.split(' ')[0]]) {
        var cmdArr = cmd.split(/ (.+)/, 2);
        terminal.addLine(terminal.command[cmdArr[0]](cmdArr[1].split(' ')));
    } else {
        if (cmd == '') {
            terminal.newLine();
        } else {
            terminal.addLine(cmd + ": Command not found. Type 'help' for available commands.");
        }
    }
};
terminal.command.help = function() {
    return `
  'start': Find & fix missing samples<br>
  'reload': Reload app<br>
  'quit': Quit app <br>
`;
};
let startCount = 0
terminal.command.start = function() {
    if (typeof terminal.callbacks.onStart === 'function') {
        if (!startCount) {
            startCount++
            terminal.callbacks.onStart()
        } else { return "Not yet implemented. Please reload." }
    }
};
terminal.command.reload = function() {
    if (typeof terminal.callbacks.onReload === 'function') {
        return terminal.callbacks.onReload()
    }
};
terminal.command.quit = function() {
    if (typeof terminal.callbacks.onQuit === 'function') {
        return terminal.callbacks.onQuit()
    }
};
terminal.command.selectAudio = function() {
    if (typeof terminal.callbacks.selectAudio === 'function') {
        return terminal.callbacks.selectAudio()
    }
};
terminal.command.selectXml = function() {
    if (typeof terminal.callbacks.selectXml === 'function') {
        return terminal.callbacks.selectXml()
    }
};

terminal.command.echo = function(data) {
    if (data === undefined)
        return "Usage: echo [string...]";
    return data;
};
terminal.command.exit = function() {
    document.body.innerHTML = "";
    return;
};


module.exports = terminal
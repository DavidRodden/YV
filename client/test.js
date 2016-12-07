var socket = io();
var signDiv = document.getElementById('signDiv');
var signDivDisplayName = document.getElementById('signDiv-displayName');
var signDivSignIn = document.getElementById('signDiv-signIn');
var gameDiv = document.getElementById('gameDiv');
var Message = function (initPack) {
    var self = {};

};
Message.list = {};
signDivSignIn.onclick = function () {
    socket.emit('signIn', {displayName: signDivDisplayName.value});
};
socket.on('signInResponse', function (data) {
    if (!data.success) {
        if (data.tooBig)alert("Your name is too large...");
        else alert("You must fill out a name before continuing...");
        return;
    }
    signDiv.style.display = 'none';
    gameDiv.style.display = 'inline-block';
});

var Img = {};
Img.grassTiles = new Image();
Img.grassTiles.src = '/client/img/grassTiles.png';
Img.winnerCrown = new Image();
Img.winnerCrown.src = '/client/img/crown.png';
Img.background = new Image();
Img.background.src = '/client/img/background.png';
Img.online = new Image();
Img.online.src = '/client/img/users_online.png';
Img.topBanner = new Image();
Img.topBanner.src = '/client/img/top_banner.png';

var ctx = document.getElementById("ctx").getContext("2d");
var timeRunning = 0;
var Player = function (initPack) {
    var self = {};
    self.id = initPack.id;
    self.x = initPack.x;
    self.y = initPack.y;
    self.name = initPack.name;
    self.color = initPack.color;
    self.score = 0;
    self.draw = function () {
        ctx.fillStyle = self.color;
        var x = self.x - 20, y = self.y - 30, width = 40, height = 60, radius = 5;
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = 'black';
        ctx.fillStyle = 'blue';
        var nameSize = ctx.measureText(self.name);
        ctx.fillText(self.name, self.x - nameSize.width / 2, self.y + 60);
    };
    Player.list[self.id] = self;
    return self;
};
Player.list = {};

var selfId = null;

socket.on('init', function (data) {
    if (data.selfId) selfId = data.selfId;
    console.log("Player length: " + data.length + " or " + data.player.length);
    for (var i = 0; i < data.player.length; i++) {
        console.log("Player added");
        new Player(data.player[i]);
    }
});

socket.on('updatePlayer', function (data) {
    for (var i = 0; i < data.length; i++) {
        var pack = data[i];
        var p = Player.list[pack.id];
        if (!p)  return;
        if (pack.x !== undefined)   p.x = pack.x;
        if (pack.y !== undefined)   p.y = pack.y;
        if (pack.score !== undefined)    p.score = pack.score;
    }
    timeRunning += 8;
});

socket.on('updateBox', function (data) {
    for (var i = 0; i < data.length; i++) {
        var pack = data[i];
        console.log("boxxess");
    }
});
socket.on('remove', function (data) {
    for (var i = 0; i < data.player.length; i++) delete Player.list[data.player[i]];
});

setInterval(function () {
    ctx.clearRect(0, 0, 1000, 500);
    ctx.fillStyle = '#e2edff';
    ctx.fillRect(0, 0, 1000, 500);
    ctx.font = '15px Verdana';
    ctx.fillStyle = "black";
    ctx.font = '20px Courier New Italic';
    ctx.beginPath();
    ctx.moveTo(0, 380);
    ctx.lineTo(1000, 380);
    ctx.closePath();
    ctx.stroke();
    ctx.drawImage(Img.background, 0 - (timeRunning / 6) % 758, -215, 2104, 600);
    ctx.drawImage(Img.grassTiles, 0 - timeRunning % 70, 380);
    ctx.drawImage(Img.online, 5, 465, 30, 30);
    ctx.fillText(Object.keys(Player.list).length, 38, 487);
    ctx.drawImage(Img.topBanner, 750, 5, 240, 50);
    var topPlayers = [];
    for (var current in Player.list) {
        topPlayers.push(Player.list[current]);
    }
    topPlayers.sort(function (a, b) {
        var scoreEqual = a.score == b.score;
        if (scoreEqual)  return a.name > b.name;
        else return a.score < b.score;
    });
    for (var current in topPlayers) {
        topPlayers[current].draw();
        if (current == 0)ctx.drawImage(Img.winnerCrown, topPlayers[current].x - 15, topPlayers[current].y - 60);
    }
    var iterator = 0;
    for (var current in topPlayers) {
        iterator++;
        if (current < 3) {
            var color;
            if (current == 0)    color = 'yellow';
            else if (current == 1) color = '#edebe8';
            else if (current == 2) color = '#473f2a';
            ctx.fillStyle = 'black';
            for (var i = 0; i < 2; i++) {
                ctx.fillText(iterator + ". " + topPlayers[current].name + ":\t\t" + topPlayers[current].score, 770, (iterator * 20) + 60 - i);
                ctx.fillStyle = color;
            }
        }
    }

}, 40);

socket.on('evalAnswer', function (data) {
    console.log(data);
});
document.onkeydown = function (event) {
    if (event.keyCode === 39)
        socket.emit('keyPress', {inputId: 'right', state: true});
    else if (event.keyCode === 37)
        socket.emit('keyPress', {inputId: 'left', state: true});
    else if (event.keyCode === 38)
        socket.emit('keyPress', {inputId: 'up', state: true});
};
document.onkeyup = function (event) {
    if (event.keyCode === 39)
        socket.emit('keyPress', {inputId: 'right', state: false});
    else if (event.keyCode === 37)
        socket.emit('keyPress', {inputId: 'left', state: false});
    else if (event.keyCode === 38)
        socket.emit('keyPress', {inputId: 'up', state: false});
};
/**
 * Client Javascript portion:
 * Speaking to the server using socketIo
 * An 'emit' initiates the communication
 * whereas an 'on' listens for a specific emit message
 */
var socket = io();
var signDiv = document.getElementById('signDiv');
var signDivDisplayName = document.getElementById('signDiv-displayName');
var signDivSignIn = document.getElementById('signDiv-signIn');
var gameDiv = document.getElementById('gameDiv');

/*
 Checks whether a valid display name has been entered communicates with the server accordingly
 */
signDivSignIn.onclick = function () {
    socket.emit('signIn', {displayName: signDivDisplayName.value});
};

/*
 If the sign-in is a success, the user is presented with the game.
 */
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

/*
 Initialization of the canvas in which the game is drawn.
 */
var ctx = document.getElementById("ctx").getContext("2d");

/*
 The total time running client-side.
 Used to display the ground and background images running alongside.
 */
var timeRunning = 0;

/*
 Template for a standard Box object.
 On creation, many variables such as x,y position are initialized as well as functions to be used.
 */
var Box = function (initPack) {
    var self = {};
    self.id = initPack.id;
    self.color = initPack.color;
    self.x = initPack.x;
    self.y = initPack.y;
    self.height = initPack.height;
    self.width = initPack.width;
    /*
     Drawing function for the Box object. Displays it on the canvas when invoked.
     */
    self.draw = function () {
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = self.color;
        var x = self.x - 20, y = self.y - self.height + 30, width = self.width, height = self.height, radius = 5;
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
        ctx.globalAlpha = 1;
    };
    Box.list[self.id] = self;
    return self;
};
/*
 Records a list of all currently existing Box objects.
 */
Box.list = {};

/*
 Template for a standard Player object. This is the lifeblood of all users.
 */
var Player = function (initPack) {
    var self = {};
    self.id = initPack.id;
    self.x = initPack.x;
    self.y = initPack.y;
    self.name = initPack.name;
    self.color = initPack.color;
    /*
     Score used to determine the ranks of all players.
     */
    self.score = 0;

    /*
     Drawing function for the Player object.
     Current player is given full opacity and is outlined in yellow whereas other players are given half opacity and are outlined in pink.
     This is purely to allow the player to be able to distinguish himself from others.
     */
    self.draw = function () {
        if (self.id != selfId) {
            ctx.globalAlpha = 0.5;
            ctx.strokeStyle = '#ff5ef6';
        } else
            ctx.strokeStyle = 'yellow';
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
        ctx.globalAlpha = 1;
    };
    Player.list[self.id] = self;
    return self;
};
/*
Records a list of all currently existing Player objects.
 */
Player.list = {};

/*
The id of the player interacting with the client.
Used to distinguish the interacting player from other players.
 */
var selfId = null;

/*
Action committed client-side when the server communicates to it.
Initializes the player.
 */
socket.on('init', function (data) {
    if (data.selfId) selfId = data.selfId;
    console.log("Player length: " + data.length + " or " + data.player.length);
    for (var i = 0; i < data.player.length; i++) {
        console.log("Player added");
        new Player(data.player[i]);
    }
});

/*
Server communication to client every so-often to update the player's values and running time.
 */
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
    if (timeRunning % 160 == 0) socket.emit('updateScore');
});

/*
Server-side communication to client to update the box so that it moves along the canvas and for player hit-detection.
 */
socket.on('updateBox', function (data) {
    for (var i = 0; i < data.length; i++) {
        var pack = data[i];
        new Box(pack);
        var currentPlayer = Player.list[selfId];
        var currentBox = Box.list[pack.id];
        if (currentPlayer == null)  return;
        if (currentPlayer.x >= (currentBox.x - 40) && currentPlayer.x <= (currentBox.x + currentBox.width) && (currentPlayer.y >= currentBox.y - currentBox.height + 30) && currentPlayer.y <= (currentBox.y + 30))
            socket.emit('touchBox');
        if (Box.list[pack.id].x < -Box.list[pack.id].width) {
            delete Box.list[pack.id];
            socket.emit('deleteBox', {boxId: pack.id});
        }

    }
});

/*
Removes the player from the player list when a user decides to unfortunately quit the game.
 */
socket.on('remove', function (data) {
    for (var i = 0; i < data.player.length; i++) delete Player.list[data.player[i]];
});

/*
The grand client-side loop.
Draws everything needed on the canvas.
 */
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
    ctx.drawImage(Img.grassTiles, 0 - (timeRunning / 1.5) % 70, 380);
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
    for (var b in Box.list) {
        Box.list[b].draw();
    }

}, 40);

/*
Events sent to server when arrow keys are pressed client-side so that the player moves accordingly.
 */
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
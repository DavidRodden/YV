/*
All the dependencies required to use nodeJs.
Also, use of crypto for extra randomness when generating colors for players and boxes.
 */
var express = require('express');
var app = express();
var serv = require('http').Server(app);
var crypto = require('crypto');

/*
When site is reached, index.html is what is displayed.
 */
app.get('/', function (req, res) {
    res.sendfile(__dirname + '/client/index.html');
});

/*
Allowing user access to the client folder so that resources can be pulled and used client-sided.
 */
app.use('/client', express.static(__dirname + '/client'));

/*
Listening either to the environment variable PORT if accessed online or port 2000 if accessed locally.
 */
serv.listen(process.env.PORT || 2000);
console.log("Server started");

var socketList = {};

/*
The template for a Box object that moves across the screen and is meant to be dodged by the player.
 */
var Box = function (id) {
    var self = {
        x: 1100,
        y: 350,
        xVelocity: 5,
        yVelocity: 0,
        height: Math.random() * 100 + 50,
        width: Math.random() * 10 + 100,
        id: id,
        color: "#" + crypto.randomBytes(3).toString('hex')
    };
    self.updatePosition = function () {
        self.x -= self.xVelocity;
    };
    self.getInitPack = function () {
        return {
            id: self.id,
            color: self.color,
            x: self.x,
            y: self.y,
            height: self.height,
            width: self.width
        };
    };
    self.getUpdatePack = function () {
        return {
            id: self.id,
            color: self.color,
            x: self.x,
            y: self.y,
            height: self.height,
            width: self.width
        };
    };
    Box.list[id] = self;
    initPack.box.push(self.getInitPack());
    return self;
};
Box.list = {};

var Player = function (id, name) {
    var self = {
        x: 250,
        y: 350,
        xVelocity: 0,
        yVelocity: 0,
        maxXVelocity: 10,
        maxYVelocity: 25,
        xAcceleration: 1,
        yAcceleration: 2,
        id: id,
        name: name,
        color: "#" + crypto.randomBytes(3).toString('hex'),
        pressingRight: false,
        pressingLeft: false,
        pressingUp: false,
        pressingDown: false,
        score: 0
    };
    self.updatePosition = function () {
        if (Math.abs(self.xVelocity) < self.maxXVelocity) {
            if (self.pressingRight && self.x < 980)  self.xVelocity += self.xAcceleration;
            if (self.pressingLeft && self.x > 20)   self.xVelocity -= self.xAcceleration;
        }
        if (!(self.pressingRight || self.pressingLeft) || (self.pressingRight && self.xVelocity < 0) || (self.pressingLeft && self.xVelocity > 0))
            self.xVelocity += (self.xVelocity > 0) ? -self.xAcceleration : (self.xVelocity < 0) ? self.xAcceleration : 0;
        if (self.y < 350)  self.yVelocity += self.yAcceleration;
        else self.yVelocity = 0;
        if (self.pressingUp && self.yVelocity == 0 && self.y >= 350) self.yVelocity -= self.maxYVelocity;
        if (self.x >= 980 && self.xVelocity > 0) self.xVelocity = 0;
        if (self.x <= 20 && self.xVelocity < 0)  self.xVelocity = 0;
        self.x += self.xVelocity;
        self.y += self.yVelocity;
    };
    self.getInitPack = function () {
        return {
            id: self.id,
            x: self.x,
            y: self.y,
            name: self.name,
            color: self.color
        };
    };
    self.getUpdatePack = function () {
        return {
            id: self.id,
            x: self.x,
            y: self.y,
            name: self.name,
            color: self.color,
            score: self.score
        };
    };
    Player.list[id] = self;
    initPack.player.push(self.getInitPack());
    return self;
};

Player.list = {};
Player.onConnect = function (socket, name) {
    var player = Player(socket.id, name);
    socket.on('keyPress', function (data) {
        if (data.inputId === 'left')
            player.pressingLeft = data.state;
        else if (data.inputId === 'right')
            player.pressingRight = data.state;
        else if (data.inputId === 'up')
            player.pressingUp = data.state;
        else if (data.inputId === 'down')
            player.pressingDown = data.state;
    });
    socket.on('updateScore', function () {
        player.score = Math.floor(player.score * 1.1) + 1;
    });
    socket.on('deleteBox', function (data) {
        delete Box.list[data.boxId];
    });
    socket.on('touchBox', function () {
        player.score = 0;
    });
    socket.emit('init', {
        selfId: socket.id,
        player: Player.getAllInitPack()
    });
};
Player.getAllInitPack = function () {
    var players = [];
    for (var i in Player.list)   players.push(Player.list[i].getInitPack());
    return players;
};
Player.onDisconnect = function (socket) {
    delete Player.list[socket.id];
    removePack.player.push(socket.id);
};
Player.update = function () {
    var pack = [];
    for (var i in Player.list) {
        var player = Player.list[i];
        player.updatePosition();
        pack.push(player.getUpdatePack());
    }
    return pack;
};
Box.create = function () {
    var players = Object.keys(Player.list).length;
    if (players > 50)    players = 50;
    if (Math.floor(Math.random() * (200 - players)) == 0) {
        Box(Math.random());
    }
};
Box.update = function () {
    Box.create();
    var pack = [];
    for (var i in Box.list) {
        var box = Box.list[i];
        box.updatePosition();
        pack.push(box.getUpdatePack());
    }
    return pack;
};

/*
Requiring socketio for communication between client and server.
 */
var io = require('socket.io')(serv, {});

/*
While connected, specific actions can be performed.
 */
io.sockets.on('connection', function (socket) {
    socket.id = Math.random();
    socketList[socket.id] = socket;
    /*
    When trying to sign-in, checks if the name is too big or is non-existent.
    Sends a message back if the name is non-compliant.
     */
    socket.on('signIn', function (data) {
        if (data.displayName.length === 0) {
            socket.emit('signInResponse', {success: false, tooBig: false});
            return;
        }
        if (data.displayName.length > 15) {
            socket.emit('signInResponse', {success: false, tooBig: true});
            return;
        }
        Player.onConnect(socket, data.displayName);
        socket.emit('signInResponse', {success: true});
    });

    /*
    When disconnected, client sends a message to the server, which removes the player accordingly.
     */
    socket.on('disconnect', function () {
        delete socketList[socket.id];
        Player.onDisconnect(socket);
    });
});

/*
The initial pack to be sent to the client.
 */
var initPack = {player: [], box: []};

/*
The pack to be used to remove elements.
 */
var removePack = {player: []};

/*
Server's grand loop.
Packs information into variables to be sent to the client.
 */
setInterval(function () {
    var playerPack = Player.update();
    var boxPack = Box.update();
    for (var i in socketList) {
        var socket = socketList[i];
        socket.emit('init', initPack);
        socket.emit('updatePlayer', playerPack);
        socket.emit('updateBox', boxPack);
        socket.emit('remove', removePack);
    }
    initPack.player = [];
    initPack.box = [];
    removePack.player = [];
}, 40);
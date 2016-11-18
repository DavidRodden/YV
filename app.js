var express = require('express');
var app = express();
var serv = require('http').Server(app);
var crypto = require('crypto');
app.get('/', function (req, res) {
    res.sendfile(__dirname + '/client/index.html');
});
app.use('/client', express.static(__dirname + '/client'));
serv.listen(process.env.PORT || 2000);
console.log("Server started");

var socketList = {};
var Player = function (id, name) {
    var self = {
        x: 250,
        y: 250,
        xVelocity: 0,
        yVelocity: 0,
        maxXVelocity: 10,
        maxYVelocity: 20,
        xAcceleration: 1,
        yAcceleration: 2,
        id: id,
        name: name,
        color: "#" + crypto.randomBytes(3).toString('hex'),
        pressingRight: false,
        pressingLeft: false,
        pressingUp: false,
        pressingDown: false
    };
    self.updatePosition = function () {
        if (Math.abs(self.xVelocity) < self.maxXVelocity) {
            if (self.pressingRight)  self.xVelocity += self.xAcceleration;
            if (self.pressingLeft)   self.xVelocity -= self.xAcceleration;
        }
        if (!(self.pressingRight || self.pressingLeft) || (self.pressingRight && self.xVelocity < 0) || (self.pressingLeft && self.xVelocity > 0))
            self.xVelocity += (self.xVelocity > 0) ? -self.xAcceleration : (self.xVelocity < 0) ? self.xAcceleration : 0;
        if (self.y < 250)  self.yVelocity += self.yAcceleration;
        else self.yVelocity = 0;
        if (self.pressingUp && self.yVelocity == 0 && self.y >= 250) self.yVelocity -= self.maxYVelocity;
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
            color: self.color
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

var DEBUG = true;
var io = require('socket.io')(serv, {});
io.sockets.on('connection', function (socket) {
    socket.id = Math.random();
    socketList[socket.id] = socket;
    socket.on('signIn', function (data) {
        if (data.displayName.length === 0) {
            socket.emit('signInResponse', {success: false});
            return;
        }
        Player.onConnect(socket, data.displayName);
        socket.emit('signInResponse', {success: true});
    });
    socket.on('disconnect', function () {
        delete socketList[socket.id];
        Player.onDisconnect(socket);
    });
    socket.on('evalServer', function (data) {
        if (!DEBUG)  return;
        socket.emit('evalAnswer', eval(data));
    });
});

var initPack = {player: []};
var removePack = {player: []};

setInterval(function () {
    var pack = Player.update();
    for (var i in socketList) {
        var socket = socketList[i];
        socket.emit('init', initPack);
        socket.emit('update', pack);
        socket.emit('remove', removePack);
    }
    initPack.player = [];
    removePack.player = [];
}, 40);
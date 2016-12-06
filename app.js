var express = require('express');
var app = express();
var serv = require('http').Server(app);
var crypto = require('crypto');

app.get('/', function (req, res) {
    res.sendfile(__dirname + '/client/index.html');
});
app.use('/client', express.static(__dirname + '/client'));
//process.env.PORT
serv.listen(process.env.PORT || 2000);
console.log("Server started");

// tmx.parse('/client/img/map.tmx', function (err, map) {
//     if (err) throw err;
//     console.log(map);
// });

var socketList = {};
var messageList = {};
var Message = function (id, name, content) {
    var self = {
        id: self.id,
        name: self.name,
        content: content
    };
    self.getMessagePack = function () {
        return {
            id: self.id,
            name: self.name,
            content: self.content
        };
    };
};

var Box = function (id) {
    var self = {
        x: 800,
        y: 250,
        xVelocity: -10,
        yVelocity: 0,
        id: id,
        color: "#" + crypto.randomBytes(3).toString('hex')
    };
    self.updatePosition = function () {
        self.x -= self.xVelocity;
    };
    self.getUpdatePack = function () {
        return {
            id: self.id,
            color: self.color,
            x: self.x,
            y: self.y
        };
    }
    Box.list[id] = self;
    initPack.box.push(self.getInitPack());
    return self;
};

Box.list = {};
var Player = function (id, name) {
    var self = {
        x: 250,
        y: 250,
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
        if (self.y < 250)  self.yVelocity += self.yAcceleration;
        else self.yVelocity = 0;
        if (self.pressingUp && self.yVelocity == 0 && self.y >= 250) self.yVelocity -= self.maxYVelocity;
        if (self.x >= 980 && self.xVelocity > 0) self.xVelocity = 0;
        if (self.x <= 20 && self.xVelocity < 0)  self.xVelocity = 0;
        self.x += self.xVelocity;
        self.y += self.yVelocity;
        if (self.yVelocity != 0)    self.score++;//score increase for testing pursposes
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
Box.update = function () {
    var pack = [];
    for (var i in Box.list) {
        var box = Box.list[i];
        box.updatePosition();
        box.push(box.getUpdatePack());
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

var initPack = {player: [], box: []};
var removePack = {player: []};

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
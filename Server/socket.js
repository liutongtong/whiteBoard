var http = require('http')
var sio = require('socket.io')
var server = http.createServer();
server.listen(3000, '0.0.0.0');
var io = sio.listen(server);
io.on('connection', function(socket){
    console.log('connection')
    socket.on('msg', function(data) {
        console.log(data)
        socket.broadcast.emit(data)
    })
});
console.log('socket server 0.0.0.0:3000')
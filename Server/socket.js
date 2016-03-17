var io = require('socket.io').listen(4000)
io.on('connection', function(socket) {
  socket.on('msg', function (data) {
    console.log(data)
  })
  socket.emit('msg', {my: 'data'})
  socket.on('drawClick', function(data) {
    socket.broadcast.emit('draw', data)
  })
})
console.log('socket server 0.0.0.0:3000')
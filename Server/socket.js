var io = require('socket.io')()
var userNum = 0
io.on('connection', function(socket) {
  socket.emit('status', {
    userNum: userNum++
  })
  socket.on('disconnect', function() {
    socket.emit('status', {
      userNum: userNum--
    })
  })
  socket.on('drawClick', function(data) {
    socket.broadcast.emit('draw', data)
  })
})
io.listen(4000);
console.log('socket server 0.0.0.0:4000')
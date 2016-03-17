var socket = window.io && io.connect('/socket.io')
socket && socket.on('connect', function(data) {
    console.log('There are', data)
})
socket.on('draw', function(point) {
  renderDraw(point)
})

var canvas = document.getElementById('canvas')
var ctx = canvas.getContext('2d')
var isMousedownFlag = false
var startTime = 0
var result = []

var eventMap = {
    mousedown: 'start',
    touchstart: 'start',
    mousemove: 'move',
    touchmove: 'move',
    mouseup: 'end',
    touchend: 'end',
    mouseout: 'end'
}

function renderDraw (point) {
    if (point.type === 'start') {
      ctx.beginPath();
      return ctx.moveTo(point.x, point.y)
    } else if (point.type === 'move') {
      ctx.lineTo(point.x, point.y)
      return ctx.stroke()
    } else return ctx.closePath()
}

function handerDrawListen (e) {
    e.preventDefault()
    var type = eventMap[e.type]
    var rect = canvas.getBoundingClientRect()
    if (type === 'start') {
        startTime = startTime || +new Date
        isMousedownFlag = true
    }
    if (!isMousedownFlag) return
    var point = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        type: type,
        t: +new Date - startTime
    }
    renderDraw(point)
    result.push(point)
    socket && socket.emit('drawClick', point)
    if (type === 'end') isMousedownFlag = false
}

canvas.addEventListener('mousedown', handerDrawListen)
canvas.addEventListener('touchstart', handerDrawListen)
canvas.addEventListener('mousemove', handerDrawListen)
canvas.addEventListener('mouseout', handerDrawListen)
canvas.addEventListener('touchmove', handerDrawListen)
canvas.addEventListener('mouseup', handerDrawListen)
canvas.addEventListener('touchend', handerDrawListen)

var rangeBarInput = document.getElementById('rangeBarInput')
rangeBarInput.addEventListener('input', function(e) {
  //  console.log(e.target.value)
  var curData = getArrayByPos(e.target.value)
  if (!curData.length) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.beginPath()
  ctx.moveTo(curData[0].x, curData[0].y)
  curData.map(renderDraw)
})

var controlButton = document.querySelector('#rangeBar .controlButton')
var curPos = 0
var playTimer

function getArrayByPos(pos) {
    var array = []
    if (!result.length) return array
    var data = result.slice(0)
    var t = data[data.length - 1].t - data[0].t
    data.some(function(item) {
        if (item.t < t * pos / 100) {
            array.push(item)
        } 
     })
     return array
}

function handlePlay(e) {
    var speed =  Math.min(result.length/10, 100)
   // var speed =  result.length/100
    var data = result.slice(0)
    var isPlaying = controlButton.className === 'controlButton'
    if (isPlaying) {
        controlButton.className = 'controlButton pause'
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        var t = data[data.length - 1].t - data[0].t
        var duration = 0
        playTimer = setInterval(function () {
            if (!data.length) {
                rangeBarInput.value = 0
                controlButton.className = 'controlButton'
                return clearInterval(playTimer)
            }
            data.some(function (item) {
                if (item.t < (duration += 16)) {
                    rangeBarInput.value = duration / t * 100
                    renderDraw(data.shift())
                } else return true
            })
        }, 16)
    }
    else {
        controlButton.className = 'controlButton'
        clearInterval(playTimer)
    }
}
controlButton.addEventListener('click', handlePlay)
controlButton.addEventListener('touchend', handlePlay)

document.querySelector('#rangeBar .save').addEventListener('click', function(e) {
    e.preventDefault()
    var dataURL = canvas.toDataURL("image/png")
    window.open(dataURL, "Preview", "width=800, height=600")
})
document.querySelector('#rangeBar .share').addEventListener('click', function(e) {
    e.preventDefault()
    var dataURL = canvas.toDataURL("image/png").replace(/^data:image\/(png|jpg);base64,/, "")
    var clientId = '8ce65e964c3df45'
    $.ajax({
        url: 'https://api.imgur.com/3/image',
        type: 'post',
        data: {
            image: dataURL,
            type: 'base64'
        },
        beforeSend: function (xhr) {
            xhr.setRequestHeader("Authorization", "Client-ID " + clientId)
        },
        dataType: 'json',
        success: function(response) {
            document.querySelector('.cover').style.display = 'block'
            document.querySelector('.cover .msg img').src = response.data.link
            document.querySelector('.cover .msg a').innerHTML = response.data.link
            document.querySelector('.cover .msg a').href = response.data.link
        }
    })
})

document.querySelector('.cover .close').addEventListener('click', function(e) {
    document.querySelector('.cover').style.display = 'none'
})
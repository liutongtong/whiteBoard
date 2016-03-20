var socket = window.io ? io.connect('/socket.io') : null
socket && socket.on('status', function(data) {
    console.log('There are', data)
})
socket && socket.on('draw', function(point) {
  renderDraw(point)
})
socket && socket.on('reset', function() {
  resetCanvas()
})

var canvas = document.getElementById('canvas')
var ctx = canvas.getContext('2d')
var isMousedownFlag = false
var isRecording = false
var startTime = 0
var result = []
var Brush = {
    color: '#000',
    mode: '',
    size: 10
}

var sizeMap = {
    large: 30,
    medium: 10,
    small: 5
}

var eventMap = {
    mousedown: 'start',
    touchstart: 'start',
    mousemove: 'move',
    touchmove: 'move',
    mouseup: 'end',
    touchend: 'end',
    mouseout: 'end'
}

// Optimize retina screen
function scaleCanvas (scale) {
    scale = window.devicePixelRatio || 1
    var width = window.innerWidth
    var height = window.innerHeight
    canvas.width = width * window.devicePixelRatio
    canvas.height = height * window.devicePixelRatio
    canvas.style.width = width + 'px'
    canvas.style.height = height + 'px'
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
}

scaleCanvas()

function renderDraw (point) {
    // ctx.shadowOffsetX = 0
    // ctx.shadowOffsetY = 0
    // ctx.shadowBlur = 10
    ctx.strokeStyle = point.brush.color
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.lineWidth = point.brush.size

    ctx.globalCompositeOperation = point.brush.mode === 'erasure' ? 'destination-out' : 'source-over'
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
        isMousedownFlag = true
    }
    if (!isMousedownFlag) return
    var point = {
        x: e.clientX || e.targetTouches[0] && e.targetTouches[0].pageX - rect.left,
        y: e.clientY || e.targetTouches[0] && e.targetTouches[0].pageY - rect.top,
        type: type,
        t: +new Date - startTime,
        brush: {
            size: Brush.size,
            color: Brush.color,
            mode: Brush.mode
        }
    }
    renderDraw(point)
    isRecording && result.push(point)
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
  playTimer && clearInterval(playTimer)
  //  console.log(e.target.value)
  var curData = getArrayByPos(e.target.value)
  if (!curData.length) return
  resetCanvas()
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
    var data = result.slice(0)
    if (!data.length) return
    var isPlaying = controlButton.className === 'controlButton'
    var fps = 1000 / 60
    if (isPlaying) {
        controlButton.className = 'controlButton pause'
        resetCanvas()
        var t = data[data.length - 1].t - data[0].t
        var duration = 0
        playTimer = setInterval(function () {
            if (!data.length) {
                rangeBarInput.value = 0
                controlButton.className = 'controlButton'
                return clearInterval(playTimer)
            }
            data.some(function (item) {
                if (item.t < (duration += fps / 2)) {
                    rangeBarInput.value = duration / t * 100 / 2
                    renderDraw(data.shift())
                } else return true
            })
        }, fps)
    }
    else {
        controlButton.className = 'controlButton'
        clearInterval(playTimer)
    }
}
controlButton.addEventListener('click', handlePlay)
var recordBtn = document.querySelector('#rangeBar .record')
recordBtn.addEventListener('click', function (e) {
    if (!isRecording) {
        result = []
        startTime = +new Date
        resetCanvas()
        isRecording = true
        recordBtn.className = 'record active'
    } else {
        isRecording = false
        recordBtn.className = 'record'
        controlButton.className = 'controlButton'
        rangeBarInput.disabled = false
    }
})

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

function resetCanvas (e) {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.beginPath()
}


!function () {
    var pens = document.querySelector('.tools .pen ul')  
    var pen = document.querySelector('.tools .pen')
    var erasure = document.querySelector('.tools .erasure')
    var intro = document.querySelector('.intro')
    var resetBtn = document.querySelector('.tools .reset')

/*    setTimeout(function () {
        intro.style.display = 'none'
    }, 4000)*/

    resetBtn.addEventListener('click', function (e) {
        resetCanvas(e)
        socket && socket.emit('reset', {})
    })

    pen.addEventListener('click', function (e) {
        document.body.className = Brush.mode = ''
        if (e.target.tagName === 'LI') return
        pens.style.display = pens.style.display === 'block' ? 'none' : 'block'
    })

    var handle = function (e) {
        // intro.style.display = 'none'
        if (e.target.tagName === 'LI') {
            var size = e.target.className
            pen.className = 'pen ' + size
            Brush.size = sizeMap[size]
        }
        if (!~e.target.parentNode.className.indexOf('pen')) pens.style.display = 'none'
    }
    document.addEventListener('mousedown', handle)
    document.addEventListener('touchstart', handle)

    $('.tools .color').colorPicker({
        renderCallback: function($el, toggled) {
            if (toggled === false) Brush.color = $el.css('background-color')
        }
    })

    erasure.addEventListener('click', function () {
        document.body.className = 'is-erasure'
        Brush.mode = 'erasure'
    })

    document.querySelector('.tools .color').addEventListener('click', function (e) {
        document.body.className = Brush.mode = ''
    })
}()


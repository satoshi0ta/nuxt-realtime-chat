const express = require('express')
const consola = require('consola')
const { Nuxt, Builder } = require('nuxt')
const app = express()

// Import and Set Nuxt.js options
const config = require('../nuxt.config.js')
config.dev = process.env.NODE_ENV !== 'production'

async function start() {
  // Init Nuxt.js
  const nuxt = new Nuxt(config)

  const { host, port } = nuxt.options.server

  await nuxt.ready()
  // Build only in dev mode
  if (config.dev) {
    const builder = new Builder(nuxt)
    await builder.build()
  }

  // Give nuxt middleware to express
  app.use(nuxt.render)

  // Listen the server
  const server = app.listen(port, host)
  consola.ready({
    message: `Server listening on http://${host}:${port}`,
    badge: true
  })

  // Start WebSocket
  socketStart(server)
  // console.log('Socket.IO starts')
}

let messageQueue = []

function socketStart(server) {
  // Websocketサーバーインスタンスを生成する
  const io = require('socket.io').listen(server)

  // クライアントからサーバーに接続があった場合のイベントを作成する
  io.on('connection', (socket) => {
    // 接続されたクライアントのidをコンソールに表示する
    // console.log('id: ' + socket.id + ' is connected')

    // サーバー側で保持しているメッセージをクライアント側に送信する
    if (messageQueue.length > 0) {
      messageQueue.forEach((message) => {
        socket.emit('new-message', message)
      })
    }

    // クライアントから送信があった場合のイベントを作成する
    socket.on('send-message', (message) => {
      // console.log(message)

      // サーバーで保持している変数にメッセージを格納する
      messageQueue.push(message)
      // 送信を行ったクライアント以外のクライアントに対してメッセージを送信する
      socket.broadcast.emit('new-message', message)

      // サーバー側で保持しているメッセージが10を超えたら古いものから削除する
      if (messageQueue.length > 10) {
        messageQueue = messageQueue.slice(-10)
      }
    })
  })
}

start()

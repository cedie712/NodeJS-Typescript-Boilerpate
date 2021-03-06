/**
 * ** NOTE ** add .env on gitignore
 */
// load .env file immediately
require("dotenv").config({ path: `${__dirname}/../.env` })

import express from "express"
import SocketIO from "socket.io"
import mongoose, { mongo } from "mongoose"
import morgan from 'morgan'
const fingerprint = require('express-fingerprint')
import Router from './urls'
import { Response, Request, Application,  NextFunction} from 'express'
import indexRouter from './urls/index'


class Main {
  // type declarations
  private app: Application
  private port: string | number | any
  private io: any
  private dbUrlString: string | any

  constructor() {
    this.app = express()
    this.port = process.env.PORT
    this.dbUrlString = `mongodb://${process.env.DB_HOST}/${process.env.DB_NAME}`
    this.appConfig()
  }

  // listen to port
  public listen() {
    const server = this.app.listen(this.port, (): void => {
      console.log(`*** Server is listening on port ${this.port}`)
    })
    this.io = SocketIO(server, {path: process.env.WEB_SOCKET_PATH})
    this.loadWebSocketConfig()
  }

  // initialize connection to mongodb
  private connectToDatabase() {
    mongoose.set("useUnifiedTopology", true)
    mongoose.set("useFindAndModify", false)
    mongoose.set("useCreateIndex", true)
    mongoose.set("useNewUrlParser", true)
    mongoose
      .connect(this.dbUrlString)
      .then((): void => {
        console.log(
          `*** Server is connected to database. Connection String: ${this.dbUrlString}`
        )
      })
      .catch((error: string): void => {
        console.log(
          `*** Server connection to the database failed. Connection String: ${this.dbUrlString}. Error: ${error}`
        )
      })
  }

  // WebSocket Init and Config
  private loadWebSocketConfig() {
    let webSocketClients: Array<any> = []
    this.app.set("ws", this.io)
    this.app.set("ws_clients", webSocketClients)
    // listen to web sockets connection
    this.io.on("connection", (socket: any) => {
      // push socket id to memory Array
      webSocketClients.push(socket.id)
      // log client connections
      console.log(
        `*** ${webSocketClients.length} web socket client/s connected`
      )
      // listen to web sockets disconnect, remove socket id to memory Array
      socket.on("disconnect", (socket: any) => {
        webSocketClients.splice(webSocketClients.indexOf(socket.id), 1)
      })
    })
  }

  // initialize routes
  private loadRouters() {
    this.app.use('', indexRouter)
  }

  // initialize server configurations
  private appConfig() {
    this.app.use(morgan("dev"))
    // restrict headers contents and methods
    // allowed all for development
    this.app.use((request: Request, response: Response, next: NextFunction) => {
      response.header("Access-Control-Allow-Origin", "*")
      response.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Authorization, Content-Type, Accept"
      )
      response.setHeader("Access-Control-Allow-Credentials", "true")
      if (request.method === "OPTIONS") {
        response.header(
          "Access-Control-Allow-Methods",
          "GET, POST, PUT, PATCH, DELETE"
        )
        return response.sendStatus(200)
      }
      next()
    })
    this.app.use(express.urlencoded({ extended: false }))
    // enable device fingerprinting
    this.app.use(fingerprint({
      parameters: [
        fingerprint.useragent,
        fingerprint.acceptHeaders,
        fingerprint.geoip
      ]
    }))
    this.connectToDatabase()
    this.loadRouters()
  }

}

// create server instance
const main = new Main()
main.listen()

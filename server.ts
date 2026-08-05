import { createServer } from "http"
import { parse } from "url"
import next from "next"
import { initSocketServer } from "./src/server/socket"

const dev = process.env.NODE_ENV !== "production"
const hostname = process.env.HOSTNAME || "0.0.0.0"
const port = parseInt(process.env.PORT || "3000", 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true)
    handle(req, res, parsedUrl)
  })

  initSocketServer(httpServer)

  httpServer.listen(port, () => {
    console.log(`> KhatBar running on http://${hostname}:${port}`)
    console.log(`> Socket.IO ready on port ${port}`)
  })
})
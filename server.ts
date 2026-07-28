import { createServer } from "http"
import next from "next"
import { initSocketServer } from "./src/server/socket"

const dev = process.env.NODE_ENV !== "production"
const hostname = "localhost"
const port = parseInt(process.env.PORT || "3000", 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const url = new URL(req.url!, `http://${hostname}:${port}`)
    handle(req, res, {
      auth: null,
      hash: url.hash || null,
      hostname: url.hostname,
      href: url.href,
      pathname: url.pathname,
      protocol: url.protocol,
      search: url.search || null,
      slashes: true,
      port: url.port || null,
      query: Object.fromEntries(url.searchParams.entries()),
    })
  })

  initSocketServer(httpServer)

  httpServer.listen(port, () => {
    console.log(`> KhatBar running on http://${hostname}:${port}`)
    console.log(`> Socket.IO ready on port ${port}`)
  })
})
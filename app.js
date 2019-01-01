require('mongodb-core')
const { MongoClient } = require('mongodb')
const Koa = require('koa')
const Router = require('koa-router')
const koaBody = require('koa-body')
const moment = require('moment')
const _ = require('lodash')
const http = require('http')
const url = require('url')


const mongoUrl = 'mongodb://localhost:27017'
const app = new Koa()
const router = new Router()


const indexHtml = _.template(`
<!DOCTYPE html>
<html>
<head>
    <link href="https://stackpath.bootstrapcdn.com/bootstrap/4.1.1/css/bootstrap.min.css" rel="stylesheet">
</head>
<body style="color: gray; font-size: 1.2em;">
    <div class="container" style="margin:50px auto;">
        <div class="row" style="font-family: Segoe UI Emoji; font-size: 3.5em; color: transparent; text-shadow: 0 0 0 lightblue;">
            <span style="margin: 30px auto;">🔔 Short URL</span>
        </div>
        <form action="/" method="POST"class="form">
            <div class="input-group row">
                <input type="text" name="url" placeholder="URL" class="form-control">
                <div class="input-group-append">
                    <input type="submit" value="Submit" class="btn btn-primary">
                </div>
            </div>
        </form>
        <div class="row">
            <span style="margin: 20px auto; font-size: 1.5em;">your URL</span>
        </div>
        <%for(const url of urls) {%>
            <div class="row">
                <div class="col-3" style="text-align: center;"><%=moment(url._id.getTimestamp()).format('YYYY-MM-DD HH:mm:ss')%></div>
                <div class="col-1"><a href="<%=url.key%>"><%=url.key%></a></div>
                <div class="col"><a href="<%=url.value%>"><%=url.value%></a></div>
            </div>
        <%}%>
    </div>
</body>
</html>
`)
router.get('/', async (ctx) => {
    const urls = await ctx.db.collection('url').find({}).sort({ _id: -1 }).limit(1).toArray()
    ctx.body = indexHtml({ urls, moment })
})


const KeyCharList = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
router.post('/', async (ctx) => {
    const urlObj = url.parse(ctx.request.body.url)
    const isValidUrl = urlObj.protocol && urlObj.host
    if (isValidUrl) {
        await ctx.db.collection('url').save({
            key: _.sampleSize(KeyCharList, 5).join(''),
            value: ctx.request.body.url,
        })
    }
    ctx.redirect('/')
})


router.get('/:key', async (ctx) => {
    const url = await ctx.db.collection('url').findOne({ key: ctx.params.key })
    ctx.redirect(url ? url.value : '/')
})


app.use(koaBody())
app.use(router.routes())
app.use(router.allowedMethods())
const server = http.createServer(app.callback())


const connMongo = async function () {
    let client = await MongoClient.connect(mongoUrl)
    const db = client.db()
    await db.createCollection('url')
    await db.collection('url').createIndex('key', { unique: true })
    app.context.db = db
}
connMongo()

server.listen(3000)

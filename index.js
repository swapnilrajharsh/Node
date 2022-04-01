const express = require('express');
const { redirect } = require('express/lib/response');
const app = express()
var morgan     = require('morgan');

var port     = process.env.PORT || 8080;

// configure app
app.use(morgan('dev'));
app.get('/', (req, res) => {
    res.send('&#128516 Welcome to our Swapnil\'s POC product service API &#128516');
})

app.get('/oauth2/authorize', (req, res) => {
    const redirect_uri = req.body.redirect_uri;
    res.redirect(redirect_uri);
})

app.get('/oauth2/token', (req, res) => {
    res.send('Please Sign in with your account');
})

app.listen(port);
const express = require('express');
const querystring = require('querystring'); 
const { redirect } = require('express/lib/response');
const app = express()
var morgan     = require('morgan');

var port     = process.env.PORT || 5000;

// configure app
app.use(morgan('dev'));
app.get('/', (req, res) => {
    res.send('&#128516 Welcome to our Swapnil\'s POC product service API &#128516');
})

app.get('/oauth2/authorize', (req, res) => {
    const state = req.query.state;
    const redirect_uri = req.query.redirect_uri;
    console.log(redirect_uri + " and " + state);
    const query = querystring.stringify({
        "code": "alphabetathetaa",
        "state": state
    });
    res.redirect(redirect_uri+ '/?' + query);
})

app.get('/oauth2/token', (req, res) => {
    res.send('Please Sign in with your account');
})

app.listen(port);
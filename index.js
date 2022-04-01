const express = require('express')
const app = express()
var morgan     = require('morgan');

var port     = process.env.PORT || 8080;

// configure app
app.use(morgan('dev'));
app.get('/', (req, res) => {
    res.send('&#128516 Welcome to our XYZ POC product service API &#128516');
})

app.listen(port);
const express = require('express');
const cors = require('cors');

const app = express();

app.get('/', require('./page/home.js'));
app.get('/css/:alusername/:malusername/scores.css', cors(), require('./gen/scorecss.js').gen);

app.listen('3136', function() {
    console.log('ready!');
});

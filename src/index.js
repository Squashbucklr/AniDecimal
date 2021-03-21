const express = require('express');
const cors = require('cors');

const app = express();

app.get('/', require('./page/home.js'));
app.get('/anime/:alusername/:malusername/scores.css', cors(), require('./gen/scorecss.js').gen);
app.get('/anime/:alusername/:malusername/data.json', cors(), require('./gen/scorecss.js').data);

app.listen('3136', function() {
    console.log('ready!');
});

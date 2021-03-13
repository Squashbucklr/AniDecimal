var fetch = require('node-fetch');

module.exports.getList = async function(username) {   
    let allData = [];

    let needsMore = true;
    let offset = 0

    while (needsMore) {
        let url = `https://myanimelist.net/animelist/${username}/load.json?offset=${offset}&status=7&order=4`;
        let options = {
            method: "GET",
        } 
        
        let response = await fetch(url, options);
        let data = await response.json();
        allData = allData.concat(data);
        if (data.length < 300) needsMore = false;
        else offset += 300;
    }
    return allData;
}


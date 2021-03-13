const fs = require('fs');
const path = require('path');

let targets = Object.freeze({
    "datatagsdivbefore": "datatagsdivbefore"
});

const links = JSON.parse(fs.readFileSync(path.join(__dirname, './links.json'), 'utf8'));
const linksKeys = Object.keys(links);

module.exports.gen = async function(req, res) {
    let date_start = new Date();



    // get input options

    const malusername = req.params.malusername;
    const alusername = req.params.alusername;

    const options = {
        nostyle: req.query.nostyle == "false" ? false : !!req.query.nostyle,
        target: req.query.target || targets.datatagsdivbefore,
        pointzero: req.query.pointzero == "false" ? false : !!req.query.pointzero,
        tenpointzero: req.query.tenpointzero == "false" ? false : !!req.query.tenpointzero,
        favcolor: req.query.favcolor || ""
    }

    // input validation
    if (!Object.keys(targets).includes(options.target)) {
        options.target = targets.datatagsdivbefore;
    }

    let match = /^([[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.exec(options.favcolor);
    if (!match) options.favcolor = "";


    console.log("\nloading " + alusername + " into " + malusername);
    console.log("    start:  " + date_start.toLocaleString());
    

    
    // get list data
    let [maldata, aldata] = await Promise.all([
        require('../connection/myanimelist.js').getList(malusername),
        require('../connection/anilist.js').getList(alusername)
    ]); 



    // assemble order data

    let seenMalIds = {};
    let malIdToOrder = {};
    
    for (let i = 0; i < aldata.favorites.length; i++) {
        // get MAL ids for entry
        let malIds = [];
        if (linksKeys.includes(aldata.favorites[i].id + '')) {
            malIds = links[aldata.favorites[i].id]; 
        } else {
            malIds = [aldata.favorites[i].idMal];
        }
        
        for (let j = 0; j < malIds.length; j++) {
            if (!seenMalIds[malIds[j]]) {
                seenMalIds[malIds[j]] = true;
                malIdToOrder[malIds[j]] = 100 + (25 - i); // 25 supported favorites
            } 
        }
    }

    for (let i = 0; i < aldata.entries.length; i++) {
        // get MAL ids for entry
        let malIds = [];
        if (linksKeys.includes(aldata.entries[i].media.id + '')) {
            malIds = links[aldata.entries[i].media.id]; 
        } else {
            malIds = [aldata.entries[i].media.idMal];
        }
        
        for (let j = 0; j < malIds.length; j++) {
            if (!seenMalIds[malIds[j]]) {
                seenMalIds[malIds[j]] = true;
                malIdToOrder[malIds[j]] = aldata.entries[i].score * 10;
            } 
        }
    }

    for (let i = 0; i < maldata.length; i++) {
        if (!seenMalIds[maldata[i].anime_id]) {
            seenMalIds[maldata[i].anime_id] = true;
            malIdToOrder[maldata[i].anime_id] = maldata[i].score * 10;
        } 
    }



    // Get orders as they appear on list

    let orders7 = []; // 7 = all
    let orders1 = []; // 1 = currently watching
    let orders2 = []; // 2 = completed
    let orders7r = [];
    let orders1r = [];
    let orders2r = [];

    let in7 = 1;
    let in1 = 1;
    let in2 = 1;
    let in7r = 1;
    let in1r = 1;
    let in2r = 1;

    for (let i = 0; i < maldata.length; i++) {
        let entry = maldata[i];

        in7++;
        orders7.push(malIdToOrder[entry.anime_id]);

        if (entry.status === 1 || (entry.status === 2 && entry.is_rewatching !== 0)) {
            in1++;
            orders1.push(malIdToOrder[entry.anime_id]);
        }

        if (entry.status === 2 && entry.is_rewatching === 0) {
            in2++;
            orders2.push(malIdToOrder[entry.anime_id]);
        }
        
    }

    let maldatareverse = [...maldata].sort(function(a, b) {
        let diff = a.score - b.score;
        if (diff == 0) {
            return a.anime_id - b.anime_id;
        } 
        return diff;
    });

    for (let i = 0; i < maldatareverse.length; i++) {
        let entry = maldatareverse[i];

        in7r++;
        orders7r.push(malIdToOrder[entry.anime_id]);

        if (entry.status === 1 || (entry.status === 2 && entry.is_rewatching !== 0)) {
            in1r++;
            orders1r.push(malIdToOrder[entry.anime_id]);
        }

        if (entry.status === 2 && entry.is_rewatching === 0) {
            in2r++;
            orders2r.push(malIdToOrder[entry.anime_id]);
        }
        
    }



    // assemble output
 
    let output = "";

    // scores
    output += "/* scores */\n";
    for (let i = 0; i < maldata.length; i++) {
        let scoresource = malIdToOrder[maldata[i].anime_id];
        if (scoresource > 100) {
            output += "#tags-" + maldata[i].anime_id + ":before{" +
                "content:\"#" + (26 - (scoresource - 100)) + "\"" +
                (options.favcolor !== "" ? (";color:#" + options.favcolor) : "") +
                "}\n";
        }
        else {
            let score = (scoresource / 10) + "";
            if (scoresource % 10 === 0 && options.pointzero && scoresource < 100) score += ".0";
            if (scoresource === 100 && options.tenpointzero) score += ".0";
            if (scoresource === 0) score = "-";
            output += "#tags-" + maldata[i].anime_id + ":before{content:\"" + score + "\"}\n"
        }
    }
    output += "\n";

    // orders
    output += "/* orderings for \"all anime\" status */\n";
    for (let i = 0; i < orders7.length; i++) {
        output += "*[data-query*=\"\\\"status\\\"\\:7\"][data-query*=\"der\\\"\\:4\"] tbody:nth-child(" + (i + 2) + "){order:" + (125 - orders7[i]) + "}\n"
        output += "*[data-query*=\"\\\"status\\\"\\:7\"][data-query*=\"der\\\"\\:-4\"] tbody:nth-child(" + (i + 2) + "){order:" + orders7r[i] + "}\n"
    }
    output += "\n";

    output += "/* orderings for \"currently watching\" status */\n";
    for (let i = 0; i < orders1.length; i++) {
        output += "*[data-query*=\"\\\"status\\\"\\:1\"][data-query*=\"der\\\"\\:4\"] tbody:nth-child(" + (i + 2) + "){order:" + (125 - orders1[i]) + "}\n"
        output += "*[data-query*=\"\\\"status\\\"\\:1\"][data-query*=\"der\\\"\\:-4\"] tbody:nth-child(" + (i + 2) + "){order:" + orders1r[i] + "}\n"
    }
    output += "\n";

    output += "/* orderings for \"completed\" status */\n";
    for (let i = 0; i < orders2.length; i++) {
        output += "*[data-query*=\"\\\"status\\\"\\:2\"][data-query*=\"der\\\"\\:4\"] tbody:nth-child(" + (i + 2) + "){order:" + (125 - orders2[i]) + "}\n"
        output += "*[data-query*=\"\\\"status\\\"\\:2\"][data-query*=\"der\\\"\\:-4\"] tbody:nth-child(" + (i + 2) + "){order:" + orders2r[i] + "}\n"
    }



    // Header

    let date_finish = new Date();
    let header = ""
    header += "/************************************************/\n";
    header += "/* AniDecimalSync: written by Squashbucklr      */\n";
    header += "/* https://myanimelist.net/clubs.php?cid=79537  */\n";
    header += "/*                                              */\n";
    header += ("/* Score data from " + alusername).padEnd(48) + "*/\n";
    header += ("/* Insert into " + malusername).padEnd(48) + "*/\n";
    header += "/*                                              */\n";
    header += "/* Options:                                     */\n";
    header += ("/*     nostyle: " + options.nostyle).padEnd(48) + "*/\n";
    header += ("/*     target: " + options.target).padEnd(48) + "*/\n";
    header += ("/*     pointzero: " + options.pointzero).padEnd(48) + "*/\n";
    header += ("/*     tenpointzero: " + options.tenpointzero).padEnd(48) + "*/\n";
    header += ("/*     favcolor: " + options.favcolor).padEnd(48) + "*/\n";
    header += "/*                                              */\n";
    header += ("/* Generate start: " + date_start.valueOf()).padEnd(48) + "*/\n";
    header += ("/* Generate end:   " + date_finish.valueOf()).padEnd(48) + "*/\n";
    header += ("/* Time spent:     " + (date_finish.valueOf() - date_start.valueOf()) + "ms").padEnd(48) + "*/\n";
    header += "/************************************************/\n";
    header += "\n";
    header += "*[data-query*=\"\\\"status\\\"\\:3\"] tbody,\n";
    header += "*[data-query*=\"\\\"status\\\"\\:4\"] tbody,\n";
    header += "*[data-query*=\"\\\"status\\\"\\:6\"] tbody,\n";
    header += "*[data-query*=\"\\\"s\\\"\\:\"] tbody,\n";
    header += "*[data-query*=\"_status\\\"\\:\"] tbody,\n";
    header += "*[data-query*=\"cer\\\"\\:\"] tbody,\n";
    header += "*[data-query*=\"m_year\\\"\\:\"] tbody,\n";
    header += "*[data-query*=\"m_month\\\"\\:\"] tbody,\n";
    header += "*[data-query*=\"m_day\\\"\\:\"] tbody,\n";
    header += "*[data-query*=\"o_year\\\"\\:\"] tbody,\n";
    header += "*[data-query*=\"o_month\\\"\\:\"] tbody,\n";
    header += "*[data-query*=\"o_day\\\"\\:\"] tbody,\n";
    header += "*[data-query*=\"n_year\\\"\\:\"] tbody,\n";
    header += "*[data-query*=\"n\\\"\\:\"] tbody,\n";
    header += "*[data-query*=\"2\\\"\\:\"]:not([data-query*=\"2\\\"\\:0\"]) tbody\n";
    header += "{order:1!important}\n";
    header += "\n";

    if (options.nostyle) {
        header += await new Promise(function(resolve, reject) {
            fs.readFile(path.join(__dirname, 'nostyle.css'), 'utf8', (err, data) => {
                if (err) reject(err);
                else resolve(data); 
            });
        });
        header += "\n";
    }

    output = header + output;
    


    // deliver file
    res.setHeader('Content-Type', 'text/css');
    res.setHeader('Content-disposition', 'attachment; filename=scores.css');
    res.send(output);

    console.log("    finish: " + date_finish.toLocaleString());
    console.log("    time:   " + (date_finish.valueOf() - date_start.valueOf()) + "ms");
}

/*
abbreviation reference

status                  "status
s                       "s
airing_status           _status
producer                cer
aired_from_year         m_year
aired_from_month        m_month
aired_from_day          m_day
aired_to_year           o_year
aired_to_month          o_month
aired_to_day            o_day
season_year             n_year
season                  n
order                   der
order2                  2
*/

var fetch = require('node-fetch');

module.exports.getList = async function(username) {
    var hasmore = true;
    var chunk = 1;

    let alldata = [];
    let favorites = []
    let foundids = {};

    while(hasmore) {
        var query = `
            query ($username: String, $chunk: Int) {
        ` + (chunk == 1 ? `
                User (name: $username) {
                    id,
                    favourites {
                        anime (page: 1, perPage: 10) {
                            nodes {
                                id,
                                idMal,
                            }
                        }
                    }
                }
        ` : "") + `
                MediaListCollection (userName: $username, type: ANIME, perChunk: 500, chunk: $chunk) {
                    lists {
                        entries {
                            score (format: POINT_10_DECIMAL),
                            media {
                                id,
                                idMal
                            }
                        }
                    },
                    hasNextChunk
                }
            }
        `;
        let variables = {
            username,
            chunk
        };

        var url = 'https://graphql.anilist.co';
        var options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                query,
                variables
            })  
        };
        
        var response = await fetch(url, options);
        try {
            var data = await response.json();
        } catch (e) {
            console.log(e);
        }
        if(data.errors && data.errors.length) {
            console.log(data);
            return null;
        }
        else {
            for(var i = 0; i < data.data.MediaListCollection.lists.length; i++) {
                for(var j = 0; j < data.data.MediaListCollection.lists[i].entries.length; j++) {
                    if(!foundids[data.data.MediaListCollection.lists[i].entries[j].media.id]) {
                        foundids[data.data.MediaListCollection.lists[i].entries[j].media.id] = true;
                        alldata.push(data.data.MediaListCollection.lists[i].entries[j]);
                    }
                }
            }
            if (chunk == 1) {
                favorites = data.data.User.favourites.anime.nodes;
            }
            hasmore = data.data.MediaListCollection.hasNextChunk;
            chunk++;
        }
    }
    return {
        entries: alldata,
        favorites
    };
}

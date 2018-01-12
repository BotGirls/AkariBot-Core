let is_running = 1;
let eti = 0, admin_i = 0, admin_pm = false, is_talking = false, i = 0;
let config = require('./config');
let talk_data_base = require('./data/talk/base');
let fetch = require('node-fetch');
let mysql = require('mysql');

if (!config.db_host || !config.db_user || !config.db_pass || !config.db_name ||
    !config.domain || !config.token ||
    !config.bot_id || !config.bot_admin) {
    console.log("ERROR!:config情報が不足しています！");
    process.exit();
}
AkariBot_main();

function AkariBot_main() {
    /*
let db = mysql.createConnection({
    host     : config.db_host,
    user     : config.db_user,
    password : config.db_pass,
    database : config.db_name
});
db.connect();
 */
    let db = null;

    let WebSocketClient = require('websocket').client;
    let client = new WebSocketClient();

    client.on('connectFailed', function(error) {
        console.log('Connect Error: ' + error.toString());
        if (db) db.end();
    });

    client.on('connect', function(connection) {
        console.log('WebSocket Client Connected');
        connection.on('error', function(error) {
            console.log("Connection Error: " + error.toString());
            if (db) db.end();
        });
        connection.on('close', function() {
            console.log('サーバとの接続が切れました。60秒後にリトライします...');
            setTimeout( function() {
                AkariBot_main();
            }, 60000);
            if (db) db.end();
            //鯖落ち
        });
        connection.on('message', function(message) {
            //console.log(message);
            try {
                if (message.type === 'utf8') {
                    let json = JSON.parse(JSON.parse(message.utf8Data).payload);
                    if (json['account']) {
                        let acct = json['account']['acct'];
                        let text = json['content'];
                        if (acct !== config.bot_id) {
                            if (is_running) {
                                //終了
                                if (text.match(/!stop/i)) {
                                    admin_i = 0;
                                    admin_pm = false;

                                    while (config.bot_admin[admin_i]) {
                                        if (acct === config.bot_admin[admin_i]) admin_pm = true;
                                        admin_i++;
                                    }

                                    if (admin_pm) {
                                        if (acct !== config.bot_admin[0]) {
                                            post("@"+acct+" @"+config.bot_admin[0]+" 終了しました。", {}, "direct");
                                        }
                                        post("そろおち～", {}, "public", true);
                                        change_running(0);
                                        console.log("OK:STOP:@"+acct);
                                    }
                                }

                                //話題感知
                                if (text.match(/(ねじり|わさび|ねじわさ|KnzkApp|神崎丼アプリ)/i)) {
                                    post("@y ねじり検知", {in_reply_to_id: json['id']}, "direct");
                                    rt(json['id']);
                                    console.log("OK:match:"+acct);
                                }

                                //こおりたそと一緒にエタフォ
                                if (text.match(/エターナルフォースブリザード/i)) {
                                    post("@"+acct+" 私も.....！！！", {in_reply_to_id: json['id']});
                                    eti = 0;
                                    etfav(json['id']);
                                    console.log("OK:エタフォ:"+acct);
                                }

                                //メイン部分
                                if (text.match(/(a!|あかり)/i)) {
                                    is_talking = false;
                                    rt(json['id']);

                                    if (text.match(/あかり \(Bot\)さん/i) && acct === "1") {
                                        post("こおりちゃんこんにちは！");
                                        is_talking = true;
                                    }

                                    if (text.match(/(URL|リンク|短縮)/i) && config.urlshort_api) {
                                        URL(json);
                                        is_talking = true;
                                    }

                                    //埋める
                                    if (text.match(/埋め(たい|ろ|て)/i)) {
                                        let name = "", postm = 0, postd = 0;

                                        if (text.match(/(神崎|おにいさん|お兄さん)/i)) {
                                            name = "knzk";
                                        } else {
                                            post("@"+acct+" ごめんね、今は神埼おにいさん以外埋められないの...", {in_reply_to_id: json['id']}, "direct");
                                        }
                                        if (name === "knzk") {
                                            postd = 1;
                                            postm = 0;
                                        }

                                        if (postm) {
                                            post(umeume(4, name));
                                            console.log("OK:埋める:"+acct);
                                        } else if (postd) {
                                            post(umeume(20, name), {cw: "ｺﾞｺﾞｺﾞｺﾞｺﾞｺﾞ..."});
                                            console.log("OK:埋める(岩盤):"+acct);
                                        }
                                        is_talking = true;
                                    }

                                    //たこ焼き (ちょくだいさんに無能扱いされたので)
                                    if (text.match(/たこ(焼き|やき)/i) && text.match(/((焼|や)いて|(作|つく)って|(食|た)べたい|ちょ(ー|～|う|く)だい|(欲|ほ)しい|お(願|ねが)い)/i)) {
                                        setTimeout(function () {
                                            post("@"+acct+" たこ焼きど～ぞ！\n\n" +
                                                "[large=5x]:takoyaki:[/large]");
                                        }, 5000);
                                        console.log("OK:takoyaki:"+acct);
                                        is_talking = true;
                                    }

                                    if (!is_talking) {
                                        i = 0;
                                        while (talk_data_base.talkdata_base[i]) {
                                            if (text.match(new RegExp(talk_data_base.talkdata_base[i][0], 'i'))) {
                                                post("@"+acct+" "+talk_data_base.talkdata_base[i][1], {in_reply_to_id: json['id']});
                                            }
                                            i++;
                                        }
                                    }
                                }
                            } else {
                                if (acct === config.bot_admin[0]) {
                                    if (text.match(/!start/i) || text.match(/あかり(ちゃん|たそ)(起動|おきて|起きて)/i)) {
                                        change_running(1);
                                        post("おはおは～");
                                    }
                                }
                            }
                        }
                    }
                }
            } catch (e) {
                post("ごほっ、ごほっ...\n" +
                    "ちょっと体調悪いから休む...\n\n" +
                    "【エラーが発生したため停止します】");
                change_running(0);

                post("@y 【エラー検知】\n\n"+ e, {}, "direct");
            }
        });
    });

    client.connect("wss://" + config.domain + "/api/v1/streaming/?access_token=" + config.token + "&stream=public:local");
}


// ここからいろいろ
function umeume(depth, name) {
    let res = "", is_bedrock = false, i = 0;
    if (depth > 4) is_bedrock = true;
    depth -= 3;
    res = ":minecraft_dirt:​:minecraft_dirt:​:minecraft_dirt:​:minecraft_dirt:​:minecraft_dirt:\n";

    while (i <= depth) {
        res += ":minecraft_stone:​:minecraft_stone:​:minecraft_stone:​:minecraft_stone:​:minecraft_stone:\n";
        i++;
    }

    res += ":minecraft_stone:​:minecraft_stone:​:"+name+":​:minecraft_stone:​:minecraft_stone:\n";
    res += is_bedrock ? ":minecraft_bedrock:​:minecraft_bedrock:​:minecraft_bedrock:​:minecraft_bedrock:​:minecraft_bedrock:" : ":minecraft_stone:​:minecraft_stone:​:minecraft_stone:​:minecraft_stone:​:minecraft_stone:";
    return res;

}

function URL(json) {
    post("@"+json['account']['acct']+" 送信してるから数十秒まっててねー！", {in_reply_to_id: json['id']});
    setTimeout( function() {
        fetch("https://" + config.domain + "/api/v1/statuses/"+json['id']+"/card", {
            method: 'GET'
        }).then(function(response) {
            if(response.ok) {
                return response.json();
            } else {
                throw new Error();
            }
        }).then(function(json_url) {
            if (json_url["url"]) {
                fetch("https://" + config.urlshort_api + "?akari_id=Akari_"+json['account']['acct']+"&url="+encodeURIComponent(json_url["url"]), {
                    method: 'GET'
                }).then(function(response) {
                    if(response.ok) {
                        return response.text();
                    } else {
                        throw new Error();
                    }
                }).then(function(text) {
                    if (text.match(/http/i)) {
                        post("@"+json['account']['acct']+" はいど～ぞ！\n"+text, {in_reply_to_id: json['id']});
                    } else {
                        post("@"+json['account']['acct']+" @y 何か失敗したみたい... エラー:"+text, {in_reply_to_id: json['id']}, "direct");
                        console.warn("NG:url:"+json);
                    }
                }).catch(function(error) {
                    post("@"+json['account']['acct']+" @y APIにアクセスできなかった...", {in_reply_to_id: json['id']}, "direct");
                    console.warn("NG:url:SERVER");
                });
            } else {
                post("@"+json['account']['acct']+" ...？\nURLが取得できなかった...", {in_reply_to_id: json['id']});
            }
        }).catch(function(error) {
            console.warn("NG:url_card:SERVER");
        });
    }, 20000);
}

function etfav(id) {
    fetch("https://" + config.domain + "/api/v1/statuses/"+id+"/favourite", {
        headers: {'content-type': 'application/json', 'Authorization': 'Bearer '+config.token},
        method: 'POST'
    }).then(function(response) {
        if(response.ok) {
            return response.json();
        } else {
            throw new Error();
        }
    }).then(function(json) {
        if (json["id"]) {
            console.log("OK:fav");
            fetch("https://" + config.domain + "/api/v1/statuses/"+id+"/unfavourite", {
                headers: {'content-type': 'application/json', 'Authorization': 'Bearer '+config.token},
                method: 'POST'
            }).then(function(response) {
                if(response.ok) {
                    return response.json();
                } else {
                    throw new Error();
                }
            }).then(function(json) {
                if (json["id"]) {
                    console.log("OK:fav");
                    if (eti < 20) {
                        etfav(id);
                        eti++;
                    }
                } else {
                    console.warn("NG:fav:"+json);
                }
            }).catch(function(error) {
                console.warn("NG:fav:SERVER");
            });
        } else {
            console.warn("NG:fav:"+json);
        }
    }).catch(function(error) {
        console.warn("NG:fav:SERVER");
    });
}


function rt(id) {
    fetch("https://" + config.domain + "/api/v1/statuses/"+id+"/reblog", {
        headers: {'content-type': 'application/json', 'Authorization': 'Bearer '+config.token},
        method: 'POST'
    }).then(function(response) {
        if(response.ok) {
            return response.json();
        } else {
            throw new Error();
        }
    }).then(function(json) {
        if (json["id"]) {
            console.log("OK:RT");
        } else {
            console.warn("NG:RT:"+json);
        }
    }).catch(function(error) {
        console.warn("NG:RT:SERVER");
    });
}

function post(value, option = {}, visibility = "public", force) {
    var optiondata = {
        status: value,
        visibility: visibility
    };

    if (option.cw) {
        optiondata.spoiler_text = option.cw;
    }
    if (option.in_reply_to_id) {
        optiondata.in_reply_to_id = option.in_reply_to_id;
    }
    if (is_running || force) {
        fetch("https://" + config.domain + "/api/v1/statuses", {
            headers: {'content-type': 'application/json', 'Authorization': 'Bearer '+config.token},
            method: 'POST',
            body: JSON.stringify(optiondata)
        }).then(function(response) {
            if(response.ok) {
                return response.json();
            } else {
                throw new Error();
            }
        }).then(function(json) {
            if (json["id"]) {
                console.log("OK:POST");
            } else {
                console.warn("NG:POST:"+json);
            }
        }).catch(function(error) {
            console.warn("NG:POST:SERVER");
        });
    }
}

function change_running(mode) {
    if (mode === 1) {
        is_running = 1;
        console.log("OK:START");
    } else {
        is_running = 0;
        console.log("OK:STOP");
    }
}
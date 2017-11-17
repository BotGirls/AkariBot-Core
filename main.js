let is_running = 1;
let config = require('./config');
let fetch = require('node-fetch');

let WebSocketClient = require('websocket').client;
let client = new WebSocketClient();

client.on('connectFailed', function(error) {
    console.log('Connect Error: ' + error.toString());
});

client.on('connect', function(connection) {
    console.log('WebSocket Client Connected');
    connection.on('error', function(error) {
        console.log("Connection Error: " + error.toString());
    });
    connection.on('close', function() {
        console.log('AkariBot Connection Closed');
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
                    if (acct !== "yuzu") {
                        if (is_running) {
                            //終了
                            if (acct === "y" || acct === "imncls" || acct === "_5" || acct === "Knzk") {
                                if (text.match(/!stop/i)) {
                                    if (acct !== "y") {
                                        post("@"+acct+" @y 終了しました。", {}, "direct");
                                    }
                                    post("そろおち～", {}, "public", true);
                                    change_running(0);
                                    console.log("OK:STOP:@"+acct);
                                }
                            }

                            //話題感知
                            if (text.match(/(ねじり|わさび|ねじわさ|KnzkApp|神崎丼アプリ)/i)) {
                                //post("@y 検知しました。", {in_reply_to_id: json['id']}, "direct");
                                rt(json['id']);
                                console.log("OK:match:"+acct);
                            }

                            //メイン部分
                            if (text.match(/(a!|あかり)/i)) {
                                //神崎を埋める
                                if (text.match(/埋め(たい|ろ|て)/i)) {
                                    let name = "", postm = 0;

                                    if (json['mentions'][0]) {
                                        if (json['mentions'][0]['acct'] === "yuzu") {
                                            post("自分を埋めたくないよっ！！");
                                        } else {
                                            name = "@" + json['mentions'][0]['acct'];
                                            postm = 1;
                                        }
                                    } else if (text.match(/(霧島|ひなた|イキリ島)/i)) {
                                        name = "@Kirishimalab21";
                                        postm = 1;
                                    } else if (text.match(/(神崎|おにいさん|お兄さん)/i)) {
                                        name = "@Knzk";
                                        postm = 1;
                                    } else {
                                        post("@"+acct+" 誰を埋めればいいかな...？\n" +
                                            "指定例: 「あかりちゃん @<埋めたいユーザID> を埋めて」\n\n" +
                                            "（霧島ひなたさん、神崎おにいさんは名前でも反応します）", {in_reply_to_id: json['id']}, "direct");
                                    }

                                    rt(json['id']);
                                    if (postm) {
                                        post(":minecraft_dirt:​:minecraft_dirt:​:minecraft_dirt:​:minecraft_dirt:​:minecraft_dirt:\n" +
                                            ":minecraft_stone:​:minecraft_stone:​:minecraft_stone:​:minecraft_stone:​:minecraft_stone:\n" +
                                            ":minecraft_stone:​:minecraft_stone:​:"+name+":​:minecraft_stone:​:minecraft_stone:\n" +
                                            ":minecraft_stone:​:minecraft_stone:​:minecraft_stone:​:minecraft_stone:​:minecraft_stone:");
                                        console.log("OK:埋める:"+acct);
                                    }
                                }

                                //たこ焼き (ちょくだいさんに無能扱いされたので)
                                if (text.match(/たこ(焼き|やき)/i) && text.match(/((焼|や)いて|(作|つく)って|(食|た)べたい|ちょ(ー|～|う|く)だい|(欲|ほ)しい|お(願|ねが)い)/i)) {
                                    rt(json['id']);
                                    setTimeout(function () {
                                        post("@"+acct+" たこ焼きど～ぞ！\n\n" +
                                            "[large=5x]:takoyaki:[/large]");
                                    }, 5000);
                                    console.log("OK:takoyaki:"+acct);
                                }
                            }
                        } else {
                            if (acct === "y") {
                                if (text.match(/!start/i) || text.match(/あかり(ちゃん|たそ)(起動|おきて|起きて)/i)) {
                                    post("おはおは～");
                                    change_running(1);
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


// ここからいろいろ

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
    setTimeout(function () {
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
    }, 1000);
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
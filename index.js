const WebSocket = require('ws')
const md5 = require('js-md5')
const fs = require('fs');
const server = WebSocket.Server

fs.access("./user.json", (err) => {
    if (err) {
      fs.appendFileSync("./user.json", '[]', 'utf-8', (err) => {
        if (err) {
          return console.log('该文件不存在，重新创建失败！')
        }
        console.log("文件不存在，已新创建");
      });
    }
  })
const wss = new server({
    port: 4000
})

const user = JSON.parse(fs.readFileSync('./user.json', { encoding: 'utf8' }) ?? "[]");
for(userKey in user) {
    delete user[userKey].username;
    delete user[userKey].password;
    delete user[userKey].xp;
    user[userKey].players = [];
}
let rooms = user;

function sendmsg(ws, type, msg, data) {
    const array = {
        type: type,
        msg: msg,
        data: data
    }
    ws.send(JSON.stringify(array));
}

wss.on('connection',function(ws){
    sendmsg(ws, 'connected', 'success', {})
    ws.on('message',function(msg){
        msg = msg.toString();
        console.log(msg);
        let data = JSON.parse(msg);
        endmsg = 'success';
        let user = {};
        let core = {};
        let t_data = {};
        let userjson = {};
        switch(data.type){
            case 'ping':
                sendmsg(ws, 'ping', 'pong', {})
                break;
            case 'login':
                user = JSON.parse(fs.readFileSync('./user.json', { encoding: 'utf8' }) ?? "[]");
                
                for(let userKey in user){
                    if (user[userKey].username === data.data.username && user[userKey].password === md5.md5(data.data.password)) {
                        t_data.username = user[userKey].username;
                        t_data.rid = userKey;
                        t_data.xp = user[userKey].xp;
                    }
                }

                for(room in userjson){
                    userjson[room].players = userjson[room].players.filter(function(item) {
                        return item !== data.data.username
                        });
                }
                
                if(!t_data.username){
                    endmsg = 'fail'
                }
                sendmsg(ws, 'login', endmsg, t_data)
                break;
            case 'register':
                user = JSON.parse(fs.readFileSync('./user.json', { encoding: 'utf8' }) ?? "[]");
                if (user.some(element => element.username === data.data.username)) {
                    console.log("Username already exists.");
                    return false;
                }

                user.push({
                    rid: user.length,
                    title: "联机大厅",
                    img: "",
                    dec: "房主很懒，什么都没写",
                    servercore: "null",
                    clientcore: "null",
                    maxplayers: 4,
                    viplevel: 0,
                    plugins: [],
                    mods: [],
                    username: data.data.username,
                    password: md5.md5(data.data.password),
                    xp: 0
                })
                    
                fs.writeFileSync('./user.json', JSON.stringify(user));

                for(let userKey in user){
                    if (user[userKey].username === data.data.username && user[userKey].password === md5.md5(data.data.password)) {
                        t_data.username = user[userKey].username;
                        t_data.rid = userKey;
                        t_data.xp = user[userKey].xp;
                    }
                }
                if(!t_data.username){
                    endmsg = 'fail'
                }
                sendmsg(ws, 'login', endmsg, t_data)
                break;
            case 'join':
                
                userjson = JSON.parse(fs.readFileSync('./user.json', { encoding: 'utf8' }) ?? "[]");
                for(userKey in userjson) {
                    delete userjson[userKey].username;
                    delete userjson[userKey].password;
                    delete userjson[userKey].xp;
                    userjson[userKey].players = rooms[userKey].players;
                    if(userjson[userKey].viplevel > 0){
                        userjson[userKey].maxplayers = userjson[userKey].maxplayers + ((userjson[userKey].viplevel+1) * 10)
                    }
                }
                for(room in userjson){
                    if(userjson[room].rid == data.data.rid){
                        if(userjson[room].players.length >= userjson[room].maxplayers){
                            endmsg = '房间人数已满';
                            continue;
                        }
                        if(userjson[room].players.indexOf(data.data.username) !== -1){
                            endmsg = '该玩家已在房间内';
                            continue;
                        }
                        userjson[room].players.push(data.data.username)
                        
                    }
                }
                rooms = userjson.sort(function(a,b) {
                    return a.players.length - b.players.length;    
                });
                sendmsg(ws, 'room', endmsg, rooms)
                break;
            case 'leave':
                userjson = JSON.parse(fs.readFileSync('./user.json', { encoding: 'utf8' }) ?? "[]");
                for(userKey in userjson) {
                    delete userjson[userKey].username;
                    delete userjson[userKey].password;
                    delete userjson[userKey].xp;
                    userjson[userKey].players = rooms[userKey].players;
                    if(userjson[userKey].viplevel > 0){
                        userjson[userKey].maxplayers = userjson[userKey].maxplayers + ((userjson[userKey].viplevel+1) * 10)
                    }
                }
                
                for(room in userjson){
                    if(userjson[room].rid == data.data.rid){
                        if(userjson[room].players.indexOf(data.data.username) === -1){
                            endmsg = '该玩家已不在房间内'
                            continue;
                        }
                        userjson[room].players = userjson[room].players.filter(function(item) {
                            
                            return item !== data.data.username
                            });
                        
                    }
                }
                rooms = userjson.sort(function(a,b) {
                    return a.players.length - b.players.length;    
                });
                sendmsg(ws, 'room', endmsg, rooms)
                break;
            case 'getroom':
                userjson = JSON.parse(fs.readFileSync('./user.json', { encoding: 'utf8' }) ?? "[]");
                for(userKey in userjson) {
                    delete userjson[userKey].username;
                    delete userjson[userKey].password;
                    delete userjson[userKey].xp;
                    if(rooms[userKey].players){
                        userjson[userKey].players = rooms[userKey].players;
                    }else{
                        userjson[userKey].players = []
                    }

                    if(userjson[userKey].viplevel > 0){
                        userjson[userKey].maxplayers = userjson[userKey].maxplayers + ((userjson[userKey].viplevel+1) * 10)
                    }
                }

                rooms = userjson.sort(function(a,b) {
                    return a.players.length - b.players.length;    
                });
                sendmsg(ws, 'room', 'success', rooms)
                break;
            case 'changeinfo':
                userjson = JSON.parse(fs.readFileSync('./user.json', { encoding: 'utf8' }) ?? "[]");
                for(userKey in userjson) {
                    delete userjson[userKey].username;
                    delete userjson[userKey].password;
                    delete userjson[userKey].xp;
                    userjson[userKey].players = rooms[userKey].players;
                    if(userjson[userKey].viplevel > 0){
                        userjson[userKey].maxplayers = userjson[userKey].maxplayers + ((userjson[userKey].viplevel+1) * 10)
                    }
                    if(userjson[userKey].rid == data.data.rid){
                        userjson[userKey].title = data.data.title
                        userjson[userKey].dec = data.data.dec
                        userjson[userKey].servercore = data.data.servercore
                        userjson[userKey].clientcore = data.data.clientcore
                    }
                }
                rooms = userjson.sort(function(a,b) {
                    return a.players.length - b.players.length;    
                });
                userjson = JSON.parse(fs.readFileSync('./user.json', { encoding: 'utf8' }) ?? "[]");
                for(userKey in userjson) {
                    if(userjson[userKey].rid == data.data.rid){
                        userjson[userKey].title = data.data.title
                        userjson[userKey].dec = data.data.dec
                        userjson[userKey].servercore = data.data.servercore
                        userjson[userKey].clientcore = data.data.clientcore
                    }
                }
                fs.writeFileSync('./user.json',JSON.stringify(userjson))
                sendmsg(ws, 'room', 'success', rooms)
                break;
            case 'getservercore':
                core = JSON.parse(fs.readFileSync('./core.json', { encoding: 'utf8' }) ?? "[]");
                sendmsg(ws, 'servercore', 'success', core.servercore)
                break;
            case 'getclientcore':
                core = JSON.parse(fs.readFileSync('./core.json', { encoding: 'utf8' }) ?? "[]");
                sendmsg(ws, 'clientcore', 'success', core.clientcore)
                break;
            case 'uploadimg':
                userjson = JSON.parse(fs.readFileSync('./user.json', { encoding: 'utf8' }) ?? "[]");
                for(userKey in userjson) {
                    delete userjson[userKey].username;
                    delete userjson[userKey].password;
                    delete userjson[userKey].xp;
                    userjson[userKey].players = rooms[userKey].players;
                    if(userjson[userKey].viplevel > 0){
                        userjson[userKey].maxplayers = userjson[userKey].maxplayers + ((userjson[userKey].viplevel+1) * 10)
                    }
                    if(userjson[userKey].rid == data.data.rid){
                        userjson[userKey].img = data.data.img
                    }
                }
                rooms = userjson.sort(function(a,b) {
                    return a.players.length - b.players.length;    
                });

                userjson = JSON.parse(fs.readFileSync('./user.json', { encoding: 'utf8' }) ?? "[]");
                for(userKey in userjson) {
                    if(userjson[userKey].rid == data.data.rid){
                        userjson[userKey].img = data.data.img
                    }
                }
                fs.writeFileSync('./user.json',JSON.stringify(userjson))
                sendmsg(ws, 'room', 'success', rooms)
                break;
            default: break;

        }
    })
})
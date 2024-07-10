const md5 = require('js-md5');
const WebSocket = require('ws');
const fs = require('fs');
const server = WebSocket.Server
const configDir = require('path').resolve(__dirname, 'config');
const config = {
    resources: configDir+'/resource.json',
    users: configDir+'/users.json',
    cores: configDir+'/cores.json',
}

fs.access(config.users, (err) => {
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

const user = JSON.parse(fs.readFileSync(config.users, { encoding: 'utf8' }) ?? "[]");

// function getRandomString(length) {
//     let chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
//     let res = '';
//     for (let i = 0; i < length; i++) {
//         res += chars.charAt(Math.floor(Math.random() * chars.length));
//     }
//     return res;
// }
// for(let i = 0; i < 100; i++) {
//     const username = getRandomString(10);
//     const password = getRandomString(16);
//     if (user.some(element => element.username === username)) {
//         console.log("Username already exists.");
//         return false;
//     }

//     user.push({
//         rid: user.length,
//         title: "联机大厅",
//         img: "",
//         dec: "房主很懒，什么都没写",
//         servercore: "null",
//         clientcore: "null",
//         maxplayers: 4,
//         viplevel: 0,
//         plugins: [],
//         mods: [],
//         username: username,
//         password: md5.md5(password),
//         xp: 0
//     })
// }
// fs.writeFileSync(config.users, JSON.stringify(user));

for(let userKey in user) {
    delete user[userKey].username;
    delete user[userKey].password;
    delete user[userKey].xp;
    user[userKey].players = [];
}

let rooms = user;

function sendMsg(ws, type, msg, data) {
    const array = {
        type: type,
        msg: msg,
        data: data
    }
    ws.send(JSON.stringify(array));
}

wss.on('connection',function(ws){
    sendMsg(ws, 'connected', 'success', {})
    ws.on('message',function(msg){
        msg = msg.toString();
        let data = JSON.parse(msg);
        let endMsg = 'success';
        let user = {};
        let core = {};
        let t_data = {};
        let userJson = {};
        switch(data.type){
            case 'ping':
                sendMsg(ws, 'ping', 'pong', {})
                break;
            case 'login':
                user = JSON.parse(fs.readFileSync(config.users, { encoding: 'utf8' }) ?? "[]");
                
                for(let userKey in user){
                    if (user[userKey].username === data.data.username && user[userKey].password === md5.md5(data.data.password)) {
                        t_data.username = user[userKey].username;
                        t_data.rid = userKey;
                        t_data.xp = user[userKey].xp;
                    }
                }

                for(room in userJson){
                    userJson[room].players = userJson[room].players.filter(function(item) {
                        return item !== data.data.username
                        });
                }
                
                if(!t_data.username){
                    endMsg = 'fail'
                }
                sendMsg(ws, 'Login', endMsg, t_data)
                break;
            case 'register':
                user = JSON.parse(fs.readFileSync(config.users, { encoding: 'utf8' }) ?? "[]");
                if (user.some(element => element.username === data.data.username)) {
                    console.log("Username already exists.");
                    return false;
                }

                user.push({
                    rid: user.length,
                    title: "联机大厅",
                    img: "",
                    dec: "房主很懒，什么都没写",
                    ServerCore: {
                        "name": "",
                        "version": "",
                    },
                    ClientCore: {
                        "name": "",
                        "version": "",
                    },
                    maxPlayers: 4,
                    vipLevel: 0,
                    plugins: [],
                    mods: [],
                    username: data.data.username,
                    password: md5.md5(data.data.password),
                    xp: 0
                })
                    
                fs.writeFileSync(config.users, JSON.stringify(user));

                for(userKey in user){
                    if (user[userKey].username === data.data.username && user[userKey].password === md5.md5(data.data.password)) {
                        t_data.username = user[userKey].username;
                        t_data.rid = userKey;
                        t_data.xp = user[userKey].xp;
                    }
                }
                if(!t_data.username){
                    endMsg = 'fail'
                }
                sendMsg(ws, 'Login', endMsg, t_data)
                break;
            case 'join':
                
                userJson = JSON.parse(fs.readFileSync(config.users, { encoding: 'utf8' }) ?? "[]");
                for(userKey in userJson) {
                    delete userJson[userKey].username;
                    delete userJson[userKey].password;
                    delete userJson[userKey].xp;
                    if(!rooms[userKey]) {
                        rooms[userKey] = {};
                    }
                    if(!rooms[userKey].players){
                        userJson[userKey].players = []
                    }else{
                        for(room in rooms){
                            if(userJson[userKey].rid === Number(rooms[room].rid)){
                                userJson[userKey].players = rooms[room].players;
                            }
                        }
                    }
                    if(userJson[userKey].viplevel > 0){
                        userJson[userKey].maxplayers = userJson[userKey].maxplayers + ((userJson[userKey].viplevel+1) * 10)
                    }
                }
                for(room in userJson){
                    if(userJson[room].rid === Number(data.data.rid)){
                        if(userJson[room].players.length >= userJson[room].maxplayers){
                            endMsg = '房间人数已满';
                            continue;
                        }
                        if(userJson[room].players.indexOf(data.data.username) !== -1){
                            endMsg = '该玩家已在房间内';
                            continue;
                        }
                        userJson[room].players.push(data.data.username)
                        
                        
                    }
                }
                rooms = userJson.sort(function(a,b) {
                    return b.players.length - a.players.length;    
                });
                sendMsg(ws, 'Room', endMsg, rooms)
                break;
            case 'leave':
                userJson = JSON.parse(fs.readFileSync(config.users, { encoding: 'utf8' }) ?? "[]");
                for(userKey in userJson) {
                    delete userJson[userKey].username;
                    delete userJson[userKey].password;
                    delete userJson[userKey].xp;
                    if(!rooms[userKey]) {
                        rooms[userKey] = {};
                    }
                    if(!rooms[userKey].players){
                        userJson[userKey].players = []
                    }else{
                        for(room in rooms){
                            if(userJson[userKey].rid === Number(rooms[room].rid)){
                                userJson[userKey].players = rooms[room].players;
                            }
                        }
                    }
                    if(userJson[userKey].viplevel > 0){
                        userJson[userKey].maxplayers = userJson[userKey].maxplayers + ((userJson[userKey].viplevel+1) * 10)
                    }
                }
                
                for(room in userJson){
                    
                    if(userJson[room].rid === Number(data.data.rid)){
                        if(userJson[room].players.indexOf(data.data.username) === -1){
                            endMsg = '该玩家已不在房间内'
                            continue;
                        }
                        userJson[room].players = userJson[room].players.filter(function(item) {
                            
                            return item !== data.data.username
                            });
                        
                    }
                }
                rooms = userJson.sort(function(a,b) {
                    return b.players.length - a.players.length;    
                });
                sendMsg(ws, 'Room', endMsg, rooms)
                break;
            case 'getRoom':
                userJson = JSON.parse(fs.readFileSync(config.users, { encoding: 'utf8' }) ?? "[]");
                for(userKey in userJson) {
                    delete userJson[userKey].username;
                    delete userJson[userKey].password;
                    delete userJson[userKey].xp;
                    if(!rooms[userKey]) {
                        rooms[userKey] = {};
                    }
                    if(!rooms[userKey].players){
                        userJson[userKey].players = []
                    }else{
                        for(room in rooms){
                            if(userJson[userKey].rid === Number(rooms[room].rid)){
                                userJson[userKey].players = rooms[room].players;
                            }
                        }
                    }

                    if(userJson[userKey].viplevel > 0){
                        userJson[userKey].maxplayers = userJson[userKey].maxplayers + ((userJson[userKey].viplevel+1) * 10)
                    }
                }

                rooms = userJson.sort(function(a,b) {
                    return b.players.length - a.players.length;    
                });
                sendMsg(ws, 'Room', 'success', rooms)
                break;
            case 'changeInfo':
                userJson = JSON.parse(fs.readFileSync(config.users, { encoding: 'utf8' }) ?? "[]");
                for(userKey in userJson) {
                    delete userJson[userKey].username;
                    delete userJson[userKey].password;
                    delete userJson[userKey].xp;
                    if(!rooms[userKey]) {
                        rooms[userKey] = {};
                    }
                    if(!rooms[userKey].players){
                        userJson[userKey].players = []
                    }else{
                        for(room in rooms){
                            if(userJson[userKey].rid === Number(rooms[room].rid)){
                                userJson[userKey].players = rooms[room].players;
                            }
                        }
                    }
                    if(userJson[userKey].viplevel > 0){
                        userJson[userKey].maxplayers = userJson[userKey].maxplayers + ((userJson[userKey].viplevel+1) * 10)
                    }
                    if(userJson[userKey].rid === Number(data.data.rid)){
                        userJson[userKey].title = data.data.title
                        userJson[userKey].dec = data.data.dec
                        userJson[userKey].servercore = data.data.servercore
                        userJson[userKey].clientcore = data.data.clientcore
                    }
                }
                rooms = userJson.sort(function(a,b) {
                    return b.players.length - a.players.length;    
                });
                userJson = JSON.parse(fs.readFileSync(config.users, { encoding: 'utf8' }) ?? "[]");
                for(userKey in userJson) {
                    if(userJson[userKey].rid === Number(data.data.rid)){
                        userJson[userKey].title = data.data.title
                        userJson[userKey].dec = data.data.dec
                        userJson[userKey].servercore = data.data.servercore
                        userJson[userKey].clientcore = data.data.clientcore
                    }
                }
                fs.writeFileSync(config.users,JSON.stringify(userJson))
                sendMsg(ws, 'Room', 'success', rooms)
                break;
            case 'getServerCore':
                core = JSON.parse(fs.readFileSync(config.cores, { encoding: 'utf8' }) ?? "[]");
                sendMsg(ws, 'ServerCore', 'success', core.ServerCore)
                break;
            case 'getClientCore':
                core = JSON.parse(fs.readFileSync(config.cores, { encoding: 'utf8' }) ?? "[]");
                sendMsg(ws, 'ClientCore', 'success', core.ClientCore)
                break;
            case 'uploadImg':
                userJson = JSON.parse(fs.readFileSync(config.users, { encoding: 'utf8' }) ?? "[]");
                for(userKey in userJson) {
                    delete userJson[userKey].username;
                    delete userJson[userKey].password;
                    delete userJson[userKey].xp;
                    if(!rooms[userKey]) {
                        rooms[userKey] = {};
                    }
                    if(!rooms[userKey].players){
                        userJson[userKey].players = []
                    }else{
                        for(room in rooms){
                            if(userJson[userKey].rid === Number(rooms[room].rid)){
                                userJson[userKey].players = rooms[room].players;
                            }
                        }
                    }
                    if(userJson[userKey].viplevel > 0){
                        userJson[userKey].maxplayers = userJson[userKey].maxplayers + ((userJson[userKey].viplevel+1) * 10)
                    }
                    if(userJson[userKey].rid === Number(data.data.rid)){
                        userJson[userKey].img = data.data.img
                    }
                }
                rooms = userJson.sort(function(a,b) {
                    return b.players.length - a.players.length;    
                });

                userJson = JSON.parse(fs.readFileSync(config.users, { encoding: 'utf8' }) ?? "[]");
                for(userKey in userJson) {
                    if(userJson[userKey].rid === Number(data.data.rid)){
                        userJson[userKey].img = data.data.img
                    }
                }
                fs.writeFileSync(config.users,JSON.stringify(userJson))
                sendMsg(ws, 'Room', 'success', rooms)
                break;
            case 'getResource':
                res = JSON.parse(fs.readFileSync(config.resources, { encoding: 'utf8' })?? "[]");
                sendMsg(ws, 'Resource', 'success', res)
                break;
            case 'addPlugin':
                userJson = JSON.parse(fs.readFileSync(config.users, { encoding: 'utf8' }) ?? "[]");
                for(userKey in userJson) {
                    delete userJson[userKey].username;
                    delete userJson[userKey].password;
                    delete userJson[userKey].xp;
                    if(!rooms[userKey]) {
                        rooms[userKey] = {};
                    }
                    if(!rooms[userKey].players){
                        userJson[userKey].players = []
                    }else{
                        for(room in rooms){
                            if(userJson[userKey].rid === Number(rooms[room].rid)){
                                userJson[userKey].players = rooms[room].players;
                            }
                        }
                    }
                    if(userJson[userKey].viplevel > 0){
                        userJson[userKey].maxplayers = userJson[userKey].maxplayers + ((userJson[userKey].viplevel+1) * 10)
                    }
                    if(userJson[userKey].rid === Number(data.data.rid)){
                        userJson[userKey].plugins.push(data.data.plugin)
                    }
                }
                rooms = userJson.sort(function(a,b) {
                    return b.players.length - a.players.length;
                });

                userJson = JSON.parse(fs.readFileSync(config.users, { encoding: 'utf8' }) ?? "[]");
                for(userKey in userJson) {
                    if(userJson[userKey].rid === Number(data.data.rid)){
                        userJson[userKey].plugins.push(data.data.plugin)
                    }
                }
                fs.writeFileSync(config.users,JSON.stringify(userJson))
                sendMsg(ws, 'Room', 'success', rooms)
                break;
            case 'delPlugin':
                userJson = JSON.parse(fs.readFileSync(config.users, { encoding: 'utf8' }) ?? "[]");
                for(userKey in userJson) {
                    delete userJson[userKey].username;
                    delete userJson[userKey].password;
                    delete userJson[userKey].xp;
                    if(!rooms[userKey]) {
                        rooms[userKey] = {};
                    }
                    if(!rooms[userKey].players){
                        userJson[userKey].players = []
                    }else{
                        for(room in rooms){
                            if(userJson[userKey].rid === Number(rooms[room].rid)){
                                userJson[userKey].players = rooms[room].players;
                            }
                        }
                    }
                    if(userJson[userKey].viplevel > 0){
                        userJson[userKey].maxplayers = userJson[userKey].maxplayers + ((userJson[userKey].viplevel+1) * 10)
                    }
                    if(userJson[userKey].rid === Number(data.data.rid)){
                        userJson[userKey].plugins = userJson[userKey].plugins.filter(function(item) {
                            return item.name !== data.data.plugin.name
                        });
                        console.log(userJson[userKey].plugins);
                    }
                }
                rooms = userJson.sort(function(a,b) {
                    return b.players.length - a.players.length;
                });

                userJson = JSON.parse(fs.readFileSync(config.users, { encoding: 'utf8' }) ?? "[]");
                for(userKey in userJson) {
                    if(userJson[userKey].rid === Number(data.data.rid)){
                        userJson[userKey].plugins = userJson[userKey].plugins.filter(function(item) {
                            return item.name !== data.data.plugin.name
                        });
                    }
                }
                fs.writeFileSync(config.users,JSON.stringify(userJson))
                sendMsg(ws, 'Room', 'success', rooms)
                break;
            case 'addMod':
                userJson = JSON.parse(fs.readFileSync(config.users, { encoding: 'utf8' }) ?? "[]");
                for(userKey in userJson) {
                    delete userJson[userKey].username;
                    delete userJson[userKey].password;
                    delete userJson[userKey].xp;
                    if(!rooms[userKey]) {
                        rooms[userKey] = {};
                    }
                    if(!rooms[userKey].players){
                        userJson[userKey].players = []
                    }else{
                        for(room in rooms){
                            if(userJson[userKey].rid === Number(rooms[room].rid)){
                                userJson[userKey].players = rooms[room].players;
                            }
                        }
                    }
                    if(userJson[userKey].viplevel > 0){
                        userJson[userKey].maxplayers = userJson[userKey].maxplayers + ((userJson[userKey].viplevel+1) * 10)
                    }
                    if(userJson[userKey].rid === Number(data.data.rid)){
                        userJson[userKey].mods.push(data.data.mod)
                    }
                }
                rooms = userJson.sort(function(a,b) {
                    return b.players.length - a.players.length;
                });

                userJson = JSON.parse(fs.readFileSync(config.users, { encoding: 'utf8' }) ?? "[]");
                for(userKey in userJson) {
                    if(userJson[userKey].rid === Number(data.data.rid)){
                        userJson[userKey].mods.push(data.data.mod)
                    }
                }
                fs.writeFileSync(config.users,JSON.stringify(userJson))
                sendMsg(ws, 'Room', 'success', rooms)
                break;
            case 'delMod':
                userJson = JSON.parse(fs.readFileSync(config.users, { encoding: 'utf8' }) ?? "[]");
                for(userKey in userJson) {
                    delete userJson[userKey].username;
                    delete userJson[userKey].password;
                    delete userJson[userKey].xp;
                    if(!rooms[userKey]) {
                        rooms[userKey] = {};
                    }
                    if(!rooms[userKey].players){
                        userJson[userKey].players = []
                    }else{
                        for(room in rooms){
                            if(userJson[userKey].rid === Number(rooms[room].rid)){
                                userJson[userKey].players = rooms[room].players;
                            }
                        }
                    }
                    if(userJson[userKey].viplevel > 0){
                        userJson[userKey].maxplayers = userJson[userKey].maxplayers + ((userJson[userKey].viplevel+1) * 10)
                    }
                    if(userJson[userKey].rid === Number(data.data.rid)){
                        userJson[userKey].mods = userJson[userKey].mods.filter(function(item) {
                            return item.name !== data.data.mod.name
                        });
                        console.log(userJson[userKey].mods);
                    }
                }
                rooms = userJson.sort(function(a,b) {
                    return b.players.length - a.players.length;
                });

                userJson = JSON.parse(fs.readFileSync(config.users, { encoding: 'utf8' }) ?? "[]");
                for(userKey in userJson) {
                    if(userJson[userKey].rid === Number(data.data.rid)){
                        userJson[userKey].mods = userJson[userKey].mods.filter(function(item) {
                            return item.name !== data.data.mod.name
                        });
                    }
                }
                fs.writeFileSync(config.users,JSON.stringify(userJson))
                sendMsg(ws, 'Room', 'success', rooms)
                break;
            default: break;

        }
    })
})
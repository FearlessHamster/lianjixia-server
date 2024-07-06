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
    user[userKey].rid = userKey;
}
const rooms = user;



function leftstr(str,findstr){
    return str.substring(0,findstr.length) == findstr
}

function subargs(str){
    return str.split(' ').slice(1)
}

wss.on('connection',function(ws){
    ws.send('connected');
    ws.on('message',function(msg){
        msg = msg.toString();
        if(leftstr(msg,"login")) {
            const args = subargs(msg)
            const user = JSON.parse(fs.readFileSync('./user.json', { encoding: 'utf8' }) ?? "[]");
            const data = {}
            for(let userKey in user){
                if (user[userKey].username === args[0] && user[userKey].password === md5.md5(args[1])) {
                    data.username = user[userKey].username;
                    data.rid = userKey;
                    data.xp = user[userKey].xp;
                }
            }
            let endmsg = 'success'
            if(!data.username){
                endmsg = 'fail'
            }
            const array = {
                type: 'login',
                msg: endmsg,
                data: data
            }
            
            ws.send(JSON.stringify(array));
        }else if(leftstr(msg,"register")) {
            const args = subargs(msg)
            const data = {}
            const user = JSON.parse(fs.readFileSync('./user.json', { encoding: 'utf8' }) ?? "[]");
            if (user.some(element => element.username === args[0])) {
                console.log("Username already exists.");
                return false;
            }

            user.push({
                title: "联机大厅",
                img: "",
                dec: "房主很懒，什么都没写",
                servercore: "null",
                clientcore: "null",
                maxplayers: 4,
                viplevel: 0,
                plugins: [],
                mods: [],
                username: args[0],
                password: md5.md5(args[1]),
                xp: 0
            })
                
            fs.writeFileSync('./user.json', JSON.stringify(user));

            for(let userKey in user){
                if (user[userKey].username === args[0] && user[userKey].password === md5.md5(args[1])) {
                    data.username = user[userKey].username;
                    data.rid = userKey;
                    data.xp = user[userKey].xp;
                }
            }
            let endmsg = 'success'
            if(!data.username){
                endmsg = 'fail'
            }
            const array = {
                type: 'register',
                msg: endmsg,
                data: data
            }
            
            ws.send(JSON.stringify(array));
        }else if(leftstr(msg,"join")){
            const args = subargs(msg)
            let endmsg = ''
            for(room in rooms){
                
                if(rooms[room].rid = args[0]){
                    if(rooms[room].players.length >= rooms[room].maxplayers){
                        endmsg = '房间人数已满'
                        continue;
                    }
                    if(rooms[room].players.indexOf(args[1]) != -1){
                        endmsg = '该玩家已在房间内'
                        continue;
                    }
                    endmsg = 'success'
                    rooms[room].players.push(args[1])
                }
            }
            const array = {
                type: 'room',
                msg: endmsg,
                data: rooms
            }
            const data = JSON.stringify(array)
            ws.send(data);
        }else if(leftstr(msg,"leave")){
            const args = subargs(msg)
            let endmsg = ''
            for(room in rooms){
                if(rooms[room].rid = args[0]){
                    if(rooms[room].players.indexOf(args[1]) == -1){
                        endmsg = '该玩家已不在房间内'
                        continue;
                    }
                    endmsg = 'success'
                    rooms[room].players = rooms[room].players.filter(function(item) {
                        return item !== args[1]
                      });
                }
            }
            const array = {
                type: 'room',
                msg: 'success',
                data: rooms
            }
            const data = JSON.stringify(array)
            ws.send(data);
        }else if(leftstr(msg,"ping")){
            ws.send("pong");
        }else if(leftstr(msg,"getroom")){
            const array = {
                type: 'room',
                msg: 'success',
                data: rooms
            }
            const data = JSON.stringify(array)
            ws.send(data);
        }
    })
})
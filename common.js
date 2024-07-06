const md5 = require('js-md5')
const fs = require('fs');

let common = {};
common.getRooms = async function () {
    const user = JSON.parse(await fs.readFileSync('./user.json', { encoding: 'utf8' }) ?? "[]");
    for(userKey in user) {
        delete user[userKey].username, user[userKey].password, user[userKey].xp;
    }
    return user;
}

common.Login = async function(username, password) {
    const user = JSON.parse(await fs.readFileSync('./user.json', { encoding: 'utf8' }) ?? "[]");
    const data = {}
    for(let userKey in user){
        if (user[userKey].username === username && user[userKey].password === md5.md5(password)) {
            data.username = user[userKey].username;
            data.rid = userKey;
            data.xp = user[userKey].xp;
            return data;
        }else{
            return {}
        }
    }
}

common.Register = function(username, password, data) {
    const user = JSON.parse(fs.readFileSync('./user.json', { encoding: 'utf8' }) ?? "[]");
    data = {}
    if (user.some(element => element.username === username)) {
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
        username: username,
        password: md5.md5(password),
        xp: 0
      })
        
    fs.writeFileSync('./user.json', JSON.stringify(user));

    for(let userKey in user){
        if (user[userKey].username === username && user[userKey].password === md5.md5(password)) {
            data.username = user[userKey].username;
            data.rid = userKey;
            data.xp = user[userKey].xp;
        }
    }
}

module.exports = common;
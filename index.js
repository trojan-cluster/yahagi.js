const got = require('got');
const os = require('os');
const redis = require('redis');
const crypto = require('crypto');
const schedule = require('node-schedule');

// Configuration Start
let domain = "";
let node_id = "";
let key = "";
// Configuration End

const webApiUrlBase = `https://${domain}/mod_mu`;

function schedule_report() {
    schedule.scheduleJob('30 * * * * *', getUserJob);
    schedule.scheduleJob('15 * * * * *', reportLoadJob);
}

const sha224 = (str) => {
    const hash = crypto.createHash('sha224');
    return hash.update(str).digest().toString('hex');
}

const client = redis.createClient(6379, '127.0.0.1');

const getUserJob = () => {
    const webApiUrl = `${webApiUrlBase}/users?node_id=${node_id}&key=${key}`;
    got(webApiUrl).then(userListCallback).catch(console.log);
}

const userListCallback = (response) => {
    const userListEntity = response.body.data;
    let userSet = new Set();
    for (const userEntity of userListEntity) {
        const sha224uuid = sha224(userEntity.uuid.toString());
        userSet.add(sha224uuid);
        client.hset(sha224uuid, "uid", userEntity.id.toString());
        client.hincrby(sha224uuid, "upload", 0); // Create Users.
        client.hincrby(sha224uuid, "download", 0);
        queryTraffic(sha224uuid, userEntity.id);
    }
    // Remove Users.
    const deleteUserCallbackW = (err, keyList) => {
        deleteUserCallback(keyList, userSet);
    }
    client.keys("*", deleteUserCallbackW);
}

const deleteUserCallback = (keys_list, user_list) => {
    let expiredUser = [];
    for(const sha224uuid of keys_list) {
        if (!user_list.has(sha224uuid)) {
            expiredUser.push(sha224uuid.toString());
        }
    }
    for(const expired of expiredUser) {
        client.del(expired);
    }
}

const queryTraffic = (sha224uuid, uid) => {
    client.hget(sha224uuid, "upload", (err, res) => {
        let u = res;
        client.hget(sha224uuid, "download", (error, resp) => {
            if(u == 0 && resp == 0) {
                return;
            }
            reportTraffic(sha224uuid, uid, u, resp);
        })
    })
}

const reportTraffic = (user_sha, uid, upload, download) => {
    const webApiUrl = `${webApiUrlBase}/users/traffic?node_id=${node_id}&key=${key}`;
    let log_set = {
        data: []
    }
    log_set.data.push({
        'u': upload,
        'd': download,
        'user_id': uid,
    })
    got.post(webApiUrl, {
        json: log_set
    }).then(() => {
        client.hset(user_sha, "upload", 0);
        client.hset(user_sha, "download", 0);
    }).catch(console.log);
}

const reportLoadJob = () => {
    const webApiUrl = `${webApiUrlBase}/nodes/${node_id}/info?key=${key}&node_id=${node_id}`;

    const payload = {
        'load': os.loadavg(),
        'uptime': Math.floor(os.uptime()),
    };
    got.post(webApiUrl, {
        json: payload
    }).then(console.log);
}

schedule_report();

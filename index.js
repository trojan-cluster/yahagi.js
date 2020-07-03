const axios = require('axios').default;
const os = require('os');
const redis = require('redis');
const crypto = require('crypto');
const schedule = require('node-schedule');

// Configure

let domain = "";
let node_id = "";
let key = "";

function schedule_report() {
    schedule.scheduleJob('30 * * * *', getUserList(domain, node_id, key));
    schedule.scheduleJob('15 * * * *', reportLoad(domain, node_id, key));
}

const sha224 = (str) => {
    const hash = crypto.createHash('sha224');
    return hash.update(str).digest().toString('hex');
}

const client = redis.createClient(6379, '127.0.0.1');

const getUserList = (domain, node_id, key) => {
    const webApiUrl = "https://" +
        domain +
        "/mod_mu/users?node_id=" +
        node_id +
        "&key=" +
        key;
    axios.get(webApiUrl).then(userListCallback).catch(console.log);
}

const userListCallback = (response) => {
    const userListEntity = response.data.data;
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
            if(u === 0 && resp === 0) {
                return;
            }
            reportTraffic(domain, node_id, key, sha224uuid, uid, u, resp);
        })
    })
}

const reportTraffic = (domain, node_id, key, user_sha, uid, upload, download) => {
    const webApiUrl = "https://" +
        domain +
        "/mod_mu/users/traffic?nodeid=" +
        node_id +
        "&key=" +
        key;
    let log_set = [].push({
        'u': upload,
        'd': download,
        'user_id': uid,
    })
    axios({
        method: 'POST',
        url: webApiUrl,
        data: JSON.stringify(log_set)
    }).then(() => {
        client.hset(user_sha, "upload", 0);
        client.hset(user_sha, "download", 0);
    }).catch(console.log);
}

const reportLoad = (domain, node_id, key) => {
    const webApiUrl = "https://" +
        domain +
        "/mod_mu/nodes/" +
        node_id +
        "/info?key=" +
        key +
        "&node_id=" +
        node_id;
    const payload = {
        'load': os.loadavg(),
        'uptime': Math.floor(os.uptime()),
    };
    axios.post(webApiUrl, payload).then(console.log);
}

schedule_report();

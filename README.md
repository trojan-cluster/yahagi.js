# yahagi.js
A program to connect sspanel-uim with trojan-cluster

## How to use

You need a machine that runs trojan-cluster or redis mode of trojan-go.  
This program make use of sspanel-uim's webapi mode.

1. Clone this repository to your machine that runs `trojan-cluster`.
    `git clone https://github.com/trojan-cluster/yahagi.js/`
2. Run `npm install yahagi.js`
3. Fill the entry in `index.js`.
4. Make something to run it as a daemon, you can create a systemd service or use pm2. If you don't like these complex things, nohup or screen will work, too.


Now it will work.

## Donation

[![Donate with Ethereum](https://en.cryptobadges.io/badge/big/0x26Bd1b9d8EE3DA1ff19DEFc4E2a45EF6A1aD5D50)](https://en.cryptobadges.io/donate/0x26Bd1b9d8EE3DA1ff19DEFc4E2a45EF6A1aD5D50)

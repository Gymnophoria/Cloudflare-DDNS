# Cloudflare-DDNS
Simple Cloudflare dynamic DNS updater.

This program will update a Cloudflare DNS record dynamically to match your public IP. 

## Usage
Download and run as a standalone node application (`$ node index`) or with a process manager, such as [pm2](http://pm2.keymetrics.io/). 

Make sure to have configuration set up in a `config.json` file.

This application will create a `ddns.cache` file upon startup, keep it as is.

If you need to update multiple entries, consider using CNAME DNS records on Cloudflare to have other records match the IP of the record you update using this script. However, this script now supports multiple record updates — simply add another config object in the "configs" array below.

## Example Configuration
```json
{
    "configs": [
        {
            "email": "name@example.com",
            "key": "nQSSID7h7Ads2fyOeArShTmWhhj2D3c5kdtVomGFu0TIo",
            "zone": "ajs3j819jmxv48mdfp39rsfj38jssf135",
            "name": "example.com",
            "ipv6": false,
            "proxied": true
        }
    ],
    "refresh": 300
}
```

`email`: (String) The email associated with your cloudflare account.  
`key`: (String) Your account's API key  
`zone`: (String) The zone ID for your website. Found on the right side of the website overview on Cloudflare.  
`name`: (String) The name of the record you are updating

*Optional*  
`ipv6`: (Boolean) Whether or not your IP is an IPv6 IP address, true meaning it is. Default: `false`  
`proxied`: (Boolean) Whether or not to proxy this record's traffic through Cloudflare's network. Default is none, meaning no change.  
`refresh`: (int) How often to check for an IP change, in seconds. Default 300 seconds (5 minutes)

Note how all configuration settings are per-configuration, aside from `refresh`, which is global.

Example with two records:

```json
{
    "configs": [
        {
            "email": "name@example.com",
            "key": "nQSSID7h7Ads2fyOeArShTmWhhj2D3c5kdtVomGFu0TIo",
            "zone": "ajs3j819jmxv48mdfp39rsfj38jssf135",
            "name": "example.com",
            "proxied": true
        },
        {
            "email": "example@name.com",
            "key": "nQSSID7h7Ads2fyOeArShTmWhhj2D3c5kdtVomGFu0TIo",
            "zone": "ajs3j819jmxv48mdfp39rsfj38jssf135",
            "name": "name.com",
            "ipv6": true
        }
    ],
    "refresh": 300
}
```

## Full Setup

This will set up the application to run 24/7 using PM2, so that you can start it and forget it. (Will work on any OS that supports node.)

1. Download and install [node.js](https://nodejs.org/en/download/) (LTS will do).
2. Clone or download this repository, and open that folder.
3. Create a `config.json` file that follows the example format above.
4. Open a console in the current directory, and type `npm install`.
5. To install PM2, type `npm install -g pm2`.
6. Restart your command prompt.
7. Test that the program works by running it with `node index`. If there are no errors and it has an "Init complete." message, you're good. Use `Ctrl + C` to terminate the program.
8. Type `pm2 start index.js --name="cddns"` (you can replace "cddns" with another name if you'd like) to start the process with pm2.
9. Type `pm2 startup` and follow the instructions to start the program (and any other programs running with pm2) on startup.
10. Close your console and enjoy!

## Update notes

Note, as of July 12th, 2023, this script supports multiple record updates. This comes with a non-backwards-compatible restructuring of `ddns.cache` and `config.json`. Please see above for how to set up the new `config.json` (the format is similar, but not the same). Please delete your old `ddns.cache` before running the newly-updated version. (This note is for the incredibly rare chance someone uses my script.. who would that be? I have no idea.)

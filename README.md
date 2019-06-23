# Cloudflare-DDNS
Cloudflare Dynamic DNS updater

## Usage
Download and run as a standalone node application (`$ node index`) or use a process manager, such as [pm2](http://pm2.keymetrics.io/).

Make sure to have configuration in a `config.json` file.

This application will create a `ddns.cache` file upon startup, keep it as is.

If you need to update multiple entries, considering using CNAME DNS records on cloudflare to have other records match the IP of record you update using this script.

## Example Configuration
```json
{
    "email": "name@example.com",
    "key": "nQSSID7h7Ads2fyOeArShTmWhhj2D3c5kdtVomGFu0TIo",
    "zone": "ajs3j819jmxv48mdfp39rsfj38jssf135",
    "name": "example.com",
    "ipv6": false,
    "proxied": true,
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
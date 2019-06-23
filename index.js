const publicIp = require('public-ip');
const request = require('request');
const path = require('path');
const fs = require('fs');

class DDNS {
	constructor(email, key, zone, name, ipv6 = false, proxied, refresh = 300) {
		this.email = email;
		this.key = key;
		this.zone = zone;
		this.name = name;
		this.ipv6 = ipv6;
		this.proxied = proxied ? proxied : null;
		this.refresh = refresh;
	}

	async init() {
		const cachePath = path.join('.', 'ddns.cache');

		if (!fs.existsSync(cachePath)) {
			console.log('No ddns.cache file found, creating one.');
			fs.writeFileSync(cachePath, '{}');
		}

		console.log('Reading cache file.');
		let cacheFile = fs.readFileSync(cachePath, 'utf8');
		this.cache = JSON.parse(cacheFile);
		let write = false;

		if (!this.cache.recordID) {
			console.log('Fetching record ID from Cloudflare.');

			try {
				await this._getRecordID();
			} catch (err) {
				return console.error('Error fetching record ID:\n' + err);
			}

			console.log('Fetched record ID.');
			write = true;
		}

		if (!this.cache.currentIP) write = true;

		console.log('Fetching public IP address');

		try {
			await this._getIP();
		} catch (err) {
			return console.error('Error fetching public IP:\n' + err);
		}

		console.log('Fetched public IP.');

		if (this.cache.currentIP !== this.cache.recordContent) {
			console.log(`Updating DNS record from ${this.cache.recordContent} to ${this.cache.currentIP}`);

			try {
				await this._updateRecord();
			} catch (err) {
				return console.error('Error updating DNS record:\n' + err);
			}

			console.log('DNS record is up to date.');
			write = true;
		}

		if (write) {
			console.log('Writing cache to disk.');
			this._writeCache();
		}

		console.log('Init complete.\n');
	}

	start() {
		if (!this.refresh) return;

		this._interval = setInterval(async () => {
			await this._getIP();

			if (this.cache.currentIP !== this.cache.recordContent) {
				console.log(`Updating DNS record from ${this.cache.recordContent} to ${this.cache.currentIP}`);

				try {
					await this._updateRecord();
				} catch (err) {
					return console.error('Error updating DNS record:\n' + err);
				}

				console.log('DNS record is up to date.');

				this._writeCache();
			}
		}, this.refresh * 1000);
	}

	stop() {
		if (this._interval) clearInterval(this._interval);
	}

	_getRecordID() {
		return new Promise((resolve, reject) => {
			const options = {
				method: 'GET',
				url: `https://api.cloudflare.com/client/v4/zones/${this.zone}/dns_records?name=${this.name}`,
				headers: {
					'X-Auth-Key': this.key,
					'X-Auth-Email': this.email
				},
				json: true
			};

			request(options, (err, res, body) => {
				if (err) return reject(err);
				if (!body.success) return reject(body.errors);

				this.cache.recordID = body.result[0].id;
				this.cache.recordContent = body.result[0].content;
				resolve();
			});
		});
	}

	_getIP() {
		return new Promise(async (resolve, reject) => {
			let ip;

			try {
				ip = this.ipv6
					? await publicIp.v6()
					: await publicIp.v4();
			} catch (err) {
				return reject(err);
			}

			if (ip) {
				this.cache.currentIP = ip;
				resolve();
			} else reject('Could not fetch IP using module.');
		});
	}

	_writeCache() {
		fs.writeFileSync(path.join('.', 'ddns.cache'), JSON.stringify(this.cache), 'utf8')
	}

	_updateRecord() {
		return new Promise((resolve, reject) => {
			const options = {
				method: 'PUT',
				url: `https://api.cloudflare.com/client/v4/zones/${this.zone}/dns_records/${this.cache.recordID}`,
				headers: {
					'X-Auth-Key': this.key,
					'X-Auth-Email': this.email
				},
				json: {
					type: this.ipv6 ? 'AAAA' : 'A',
					name: this.name,
					content: this.cache.currentIP
				}
			};

			if (this.proxied !== null) options.json.proxied = this.proxied;

			request(options, (err, res, body) => {
				if (err) return reject(err);
				if (!body.success) return reject(body.errors);

				this.cache.recordContent = body.result[0].content;
				resolve();
			});
		});
	}
}

if (!fs.existsSync(path.join('.', 'config.json'))) return console.error('There is no config.json file! Create one according to the README.md document.');

const requiredConfigProperties = [ 'email', 'key', 'zone', 'name' ];
const config = require('./config.json');

let end = false;
requiredConfigProperties.forEach(prop => {
	if (!config[prop]) {
		end = true;
		console.error(`Config is missing required property "${prop}" - add it.`);
	}
});

if (end) return;

ddns = new DDNS(config.email, config.key, config.zone, config.name, config.ipv6, config.proxied, config.refresh);
ddns.init().catch(console.error);
ddns.start();

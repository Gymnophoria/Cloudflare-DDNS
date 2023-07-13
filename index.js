const publicIP = require('public-ip');
const request = require('request');
const path = require('path');
const fs = require('fs');

const API_ENDPOINT = 'https://api.cloudflare.com/client/v4';

DEFAULT_IPV6_VAL = false;
DEFAULT_PROXIED_VAL = null;
DEFAULT_REFRESH = 300;

class DDNS {
	constructor(configs, refresh = DEFAULT_REFRESH) {
		this.configs = [];
		this.refresh = refresh;
		this.fetch_ipv4 = false;
		this.fetch_ipv6 = false;

		configs.forEach(({ email, key, zone, name, ipv6 = DEFAULT_IPV6_VAL,
			proxied = DEFAULT_PROXIED_VAL }) => {
			this.configs.push({ email, key, zone, name, ipv6, proxied });

			if (ipv6)
				this.fetch_ipv6 = true;
			else
				this.fetch_ipv4 = true;
		});
	}

	async init() {
		if (this.configs.length === 0)
			return console.error('No configs defined!');

		const cachePath = path.join(__dirname, 'ddns.cache');

		if (!fs.existsSync(cachePath)) {
			console.log('No ddns.cache file found, creating one.');
			fs.writeFileSync(cachePath, JSON.stringify({
				records: Array(this.configs.length).fill({})
			}));
		}

		console.log('Reading cache file.');
		let cacheFile = fs.readFileSync(cachePath, 'utf8');
		this.cache = JSON.parse(cacheFile);
		let write = false;

		for (const [index, record] of this.cache.records.entries()) {
			if (record.recordID && record.recordContent)
				continue;

			console.log(`Fetching record ID ${index} from Cloudflare.`);

			try {
				await this._getRecordID(index);
			} catch (err) {
				return console.error('Error fetching record ID:\n' + err);
			}

			console.log('Fetched record ID.');
			write = true;
		}

		if (!this.cache.currentIPv4 && !this.cache.currentIPv6) write = true;

		console.log('Fetching public IP address.');

		try {
			await this._getIP();
		} catch (err) {
			return console.error('Error fetching public IP:\n' + err);
		}

		console.log('Fetched public IP.');

		if (this._checkRecords())
			write = true;

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

			if (this._checkRecords())
				this._writeCache();
		}, this.refresh * 1000);
	}

	stop() {
		if (this._interval) clearInterval(this._interval);
	}

	// return: bool: whether to write new cache to disk
	async _checkRecords(index, record) {
		let write = false;

		for (const [index, record] of this.cache.records.entries()) {
			if (this.cache.currentIPv4 === record.recordContent || 
				this.cache.currentIPv6 === record.recordContent)
				continue;
	
			console.log(`Updating DNS record ${index} from ${record.recordContent} to ` +
				(record.ipv6 ? this.cache.currentIPv6 : this.cache.currentIPv4));
	
			try {
				await this._updateRecord(index);
			} catch (err) {
				console.error('Error updating DNS record:\n' + err);
				process.exit();
			}
	
			console.log('DNS record is up to date.');
			write = true;
		}

		return write;
	}

	_getRecordID(index) {
		return new Promise((resolve, reject) => {
			const options = {
				method: 'GET',
				url: `${API_ENDPOINT}/zones/${this.configs[index].zone}` +
					`/dns_records?name=${this.configs[index].name}`,
				headers: {
					'X-Auth-Key': this.configs[index].key,
					'X-Auth-Email': this.configs[index].email
				},
				json: true
			};

			request(options, (err, res, body) => {
				if (err) return reject(err);
				if (!body.success) return reject(body.errors);

				this.cache.records[index].recordID = body.result[0].id;
				this.cache.records[index].recordContent = body.result[0].content;
				resolve();
			});
		});
	}

	_getIP() {
		return new Promise(async (resolve, reject) => {
			let v4, v6;

			try {
				if (this.fetch_ipv4)
					v4 = await publicIP.v4();
				if (this.fetch_ipv6)
					v6 = await publicIP.v6();
			} catch (err) {
				return reject(err);
			}

			if (v4 || v6) {
				if (v4)
					this.cache.currentIPv4 = v4;
				if (v6)
					this.cache.currentIPv6 = v6;

				resolve();
			} else reject('Could not fetch IP using module.');
		});
	}

	_writeCache() {
		fs.writeFileSync(path.join(__dirname, 'ddns.cache'), JSON.stringify(this.cache), 'utf8')
	}

	_updateRecord(index) {
		return new Promise((resolve, reject) => {
			const config = this.configs[index];

			const options = {
				method: 'PUT',
				url: `${API_ENDPOINT}/zones/${config.zone}/dns_records/` + 
					`${this.cache.records[index].recordID}`,
				headers: {
					'X-Auth-Key': config.key,
					'X-Auth-Email': config.email
				},
				json: {
					type: config.ipv6 ? 'AAAA' : 'A',
					name: config.name,
					content: config.ipv6 ? this.cache.currentIPv6 : this.cache.currentIPv4
				}
			};

			if (config.proxied !== null)
				options.json.proxied = config.proxied;

			request(options, (err, res, body) => {
				if (err) return reject(err);
				if (!body.success) return reject(body.errors);

				this.cache.records[index].recordContent = body.result.content;
				resolve();
			});
		});
	}
}

if (!fs.existsSync(path.join(__dirname, 'config.json')))
	return console.error('There is no config.json file! See README.');

const requiredConfigProperties = [ 'email', 'key', 'zone', 'name' ];
const config = require('./config.json');

if (!config)
	return console.error('Invalid config.json file. See README.');

if (!config.configs || !Array.isArray(config.configs))
	return console.error('No (or invalid) configurations present in config.json. See README.')

for (const [index, conf] of config.configs.entries()) {
	let end = false;
	
	requiredConfigProperties.forEach(prop => {
		if (!conf[prop]) {
			end = true;
			console.error(`Config ${index} is missing required property "${prop}" - add it.`);
		}
	});

	if (end) return;
}

const ddns = new DDNS(config.configs, config.refresh);
ddns.init().catch(console.error);
ddns.start();

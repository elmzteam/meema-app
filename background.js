chrome.app.runtime.onLaunched.addListener(function() {
	chrome.app.window.create('main.html', {
		id: 'MyWindowID',
		bounds: {
			width: 500,
			height: 300,
			left: 400,
			top: 100
		},
		minWidth: 500,
		maxWidth: 500,
		minHeight: 300,
		maxHeight: 300,
	});
});

var sp;

serialProxy = function() {

	this.connectionId;
	this.uid = 0;

	this.callbacks = {}

	this.blocked = false;

	var onSend = function(){}

	var that = this;

	var onGetDevices = function(ports) {
		for (var i=0; i<ports.length; i++) {
			if (ports[i].path.indexOf("usbmodem") > 0 && ports[i].path.indexOf("tty") > 0) {
				chrome.serial.connect(ports[i].path, {bitrate: 9600}, begin);
				console.log(ports[i].path);
				return;
			}
		}
	}

	var begin = function(info) {
		console.log(info);
		if (info) {
			that.connectionId = info.connectionId;
		}
		writeSerial([0x01]);
	}


	
	var commProxy = function(info) {
		if(info.data) {
			var array = arrayBufferToArray(info.data);
			if (array[0] != that.uid) {
				return;
			}
			that.blocked = false;
			switch (array[1]) {
				case 0xFF: 
					that.uid = array[2];
					break;

			}
			if (that.callbacks[array[1]]) {
				var f = that.callbacks[array[1]];
				delete that.callbacks[array[1]];
				f(array);
			}
		}
	}


	chrome.serial.getDevices(onGetDevices);
	chrome.serial.onReceive.addListener(commProxy);

	var writeSerial=function(str) {
		if (that.blocked) {
			return -1;
		}
		that.blocked = true;
		if (that.connectionId == null) {
			return;
		}
		if (typeof str == "string") {
			chrome.serial.send(that.connectionId, convertStringToArrayBuffer(str), onSend);
		} else {
			chrome.serial.send(that.connectionId, arrayToBuffer(str), onSend);
		}
	}

	var arrayBufferToArray = function(buf) {
		var ui8 = new Uint8Array(buf);
		var out = []
		for (var a in ui8) {
			out.push(ui8[a]);
		}
		return out;
	}

	var arrayBufferToString = function(buf) {
		return String.fromCharCode.apply(null, new Uint8Array(buf));
	}

	var convertStringToArrayBuffer=function(str) {
		var buf=new ArrayBuffer(str.length);
		var bufView=new Uint8Array(buf);
		for (var i=0; i<str.length; i++) {
			bufView[i]=str.charCodeAt(i);
		}
		return buf;
	}

	var arrayToBuffer = function(arr) {
		arr.unshift(that.uid);
		var buf=new ArrayBuffer(arr.length);
		var bufView=new Uint8Array(buf);
		for (var i=0; i<arr.length; i++) {
			bufView[i]=arr[i];
		}
		return buf;
	}

	var stringify = function(arr) {
		var out = ""
		for (var a = 0; a < arr.length; a++) {
			out+= String.fromCharCode(arr[a])
		}
		return out;
	}

	var arrayify = function(string) {
		var out = []
		for (var a = 0; a < string.length; a++) {
			out[a] = string.charCodeAt(a);
		}
		return out;
	}

	var err = function(cb) {
		that.callbacks[0xF0] = function() {
			cb(1,null);
		}
		that.callbacks[0xEF] = function() {
			cb(2, null);
		}
	}
	this.onLoad = function(cb) {
		if (that.uid > 0) {
			cb(that.uid)
		} else {
			that.callbacks[0xFF] = cb;
		}
	}
	this.isUnlocked = function(cb) {
		writeSerial([0x02]);
		that.callbacks[0xFE] = function(row) {
			cb(null, row[2] ? true : false);
		}
		err(cb);
	}
	this.getDeviceUID = function(cb) {
		writeSerial([0x03]);
		that.callbacks[0xF2] = function(row) {
			cb(null, stringify(row.slice(0x04, 0x04+row[0x02]+row[0x03]*256)));
		}
		err(cb);
	}
	this.getActiveAccount = function(cb) {
		writeSerial([0x04]);
		that.callbacks[0xF2] = function(row) {
			cb(null, stringify(row.slice(0x04, 0x04+row[0x02]+row[0x03]*256)));
		}
		err(cb);
	}
	this.getAccounts = function(cb) {
		writeSerial([0x05]);
		that.callbacks[0xF2] = function(row) {
			cb(null,JSON.parse(stringify(row.slice(0x04, 0x04+row[0x02]+row[0x03]*256))))
		}
		err(cb);
	}
	this.authenticateAccount = function(username, password, cb) {
		writeSerial([0x06, username.length].concat(arrayify(username)).concat([password.length]).concat(arrayify(password)));
		that.callbacks[0xFE] = function(row) {
			cb(null, row[2] ? true : false);
		}
		err(cb);
	}
	this.fetchFragment = function(url, cb) {
		writeSerial([0x07, url.length].concat(arrayify(url)));
		that.callbacks[0xF2] = function(row) {
			cb(null, stringify(row.slice(0x04, 0x04+row[0x02]+row[0x03]*256)));
		}
		err(cb);
	}
	this.fetchFragmentList = function(cb) {
		writeSerial([0x08]);
		that.callbacks[0xF2] = function(row) {
			cb(null, JSON.parse(stringify(row.slice(0x04, 0x04+row[0x02]+row[0x03]*256))));
		}
		err(cb);
	}
	this.createAccount = function(name, password, cb) {
		writeSerial([0x10, name.length].concat(arrayify(name)).concat([password.length]).concat(arrayify(password)));
		that.callbacks[0xF1] = function() {
			cb(null, true);
		}
		err(cb);
	}
	this.registerPassword = function(url, password, cb) {
		var tmp = ([0x11, url.length].concat(arrayify(url)).concat([password.length]).concat(arrayify(password)));
		console.log(tmp);
		writeSerial(tmp);
		that.callbacks[0xF1] = function() {
			cb(null, true);
		}
		err(cb);
	}
};

(function() {
	sp = new serialProxy();
	/*sp.onLoad(function() {
		sp.registerPassword("3bing.com", "loljk", function(err, success) {
			if (success) {
				sp.fetchFragmentList(function(err, list) {
					console.log(list);
				})
			} else {
				console.log("failed");
			}
		})
		/*sp.getAccounts(function(err, accounts) {
			sp.authenticateAccount("zach", "whoami", function(err, success) {
				if (success) {
					console.log("Successful")
					sp.getActiveAccount(function (err, account) {
						console.log("Signed in as: "+account);
						sp.fetchFragmentList(function(err, list) {
							console.log("anything?");
							console.log(list);
						})
					})
				} else {
					console.log("Failed")
				}
			})
		})*/
		/*sp.isUnlocked(function(err, is) {
			if (is) {
				console.log("Its unlocked");
			} else {
				console.log("Its locked");
			}
		})*/
	/*})*/
})();

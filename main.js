onload = function() {
	gui.Window.get().show();
};

function getUserHome() {
	// return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
	return process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
}
var events = require('events');
var path = require('path');
var fs = require('fs');
var gui = require('nw.gui');
// var emitter = new events.EventEmitter();
var crypto = require('crypto');
var dir = getUserHome() + path.sep + '.kepass';
var dataFile = path.sep + '.data';
var entries = [];
var content = [];


function encrypto(text, key) {
	var cipher = require('crypto').createCipher('aes256', key)
	var u = cipher.update(text, 'binary', 'base64');
	var f = cipher.final('base64');
	return u + f;
}

function decrypto(text, key) {
	var decipher = require('crypto').createDecipher('aes256', key);
	var d = decipher.update(text, "base64", "binary");
	var d2 = decipher.final("binary");
	return d + d2;
}


//check
var doLogin = function(key) {
	//validate
	try {
		var p = decrypto(content[0], key);
		return p == 'this is key!';
	} catch (e) {
		return false;
	}

};

function initPwd() {
	$('#loginpwd').attr('placeholder', 'create your password...');
	doLogin = function(key) {

		//init password
		var what = encrypto('this is key!', key);
		fs.appendFile(dir + dataFile, what, 'base64', function(err) {
			if (err)
				console.log("fail " + err);
			else
				console.log("ok");
		});

		return true;
	}

	$('#loginBox').css('display', 'block');
}

fs.exists(dir, function(exists) {
	if (exists) {
		fs.readFile(dir + dataFile, 'base64', function(err, data) {
			if (err) {
				initPwd();
			} else {
				//load data
				content = data.split('\n');
				$('#loginBox').css('display', 'block');
			}
		});
	} else {
		fs.mkdirSync(dir);
		initPwd();
	}
});


$('#loginpwd').keydown(function() {
	if (event.keyCode == 13) {
		var key = $('#loginpwd').val();

		if (doLogin(key)) {
			$('#loginBox').css('display', 'none');
			$('#main').css('display', 'block');
		} else {
			$('#loginpwd').css('background', 'red');
		}


		return false;
	}
});


function entry(n) {
	this.site = n;
	this.user = "";
	this.pwds = new Array();
	this.getMainPwd = function() {
		return this.pwds[0];
	};
	this.addPwd = function(e) {
		this.pwds.push(e);
	};
}
$('#btnAddItem').click(function() {
	var site = $('#site');
	var user = $('#user');
	var pwd = $('#password');
	var e = new entry(site.val());
	e.user = user.val();
	e.addPwd(pwd.val());
	entries.push(e);
	console.log(e);
	site.val('');
	user.val('');
	pwd.val('');
});



//test
var test = function() {
	// console.log(e);
	var crypto = require('crypto');
	var cipher = crypto.createCipher('aes256', 'whosyourdad');
	var u = cipher.update('nobody what lasdfj iii', 'binary', 'base64');
	var f = cipher.final('base64');;
	// console.log(u+f);
	// console.log(u);
	var decipher = crypto.createDecipher('aes256', 'whosyourdad');
	var d = decipher.update(u + f, "base64", "binary");
	var d2 = decipher.final('binary');
	console.log(d + d2);
	// fs.readFile(dir + dataFile, 'base64', function(err, data) {
	// 	if (err) {
	// 		console.log("read fail " + err);
	// 		if (!fs.existsSync(dir)) {
	// 			fs.mkdirSync(dir);
	// 		}
	// 		fs.appendFile(dir + dataFile, u + f, 'base64', function(err) {
	// 			if (err)
	// 				console.log("fail " + err);
	// 			else
	// 				console.log("写入文件ok");
	// 		});
	// 	} else {
	// 		console.log(data);
	// 	}
	// });
}
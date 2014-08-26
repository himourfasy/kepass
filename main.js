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
var dir = getUserHome() + path.sep + '.kepass';
var keyFile = dir + path.sep + '.key';
var dataFile = dir + path.sep + '.data';
var entries = [];
var keyContent;
var mainpwd;
var interval;


function encrypto(buf, key) {
	var cipher = require('crypto').createCipher('aes256', key)
	return Buffer.concat([cipher.update(buf), cipher.final()]);
}

function decrypto(buf, key) {
	var decipher = require('crypto').createDecipher('aes256', key);
	return Buffer.concat([decipher.update(buf), decipher.final()]);
}


//check
var doLogin = function(key) {
	//validate
	try {
		var p = decrypto(keyContent, key);
		return p == 'this is key!';
	} catch (e) {
		return false;
	}

};

function showMsg(parent, msg) {
	parent.append(msg);
	setTimeout(function() {
		msg.fadeOut('fast', function() {
			msg.remove();
		});

	}, 3000);
}

function initPwd() {
	$('#loginpwd').attr('placeholder', 'create your password...');
	doLogin = function(key) {

		//init password
		var what = encrypto('this is key!', key);
		var err = fs.writeFileSync(keyFile, what);

		if (err) {
			console.log("fail " + err);
			var p = $('<div class="alert alert-error" role="alert">could not create key, why?</div>');
			showMsg($('#lgMsg'), p);
			return false;
		} else {
			console.log("ok");
			var p = $('<div class="alert alert-success" role="alert">key generated.</div>');
			showMsg($('#lgMsg'), p);
			return true;
		}
	}

	$('#loginBox').fadeIn('slow', function() {
		$('#loginpwd').focus();
	});
}

fs.exists(dir, function(exists) {
	if (exists) {
		//read key file.
		fs.readFile(keyFile, function(err, data) {
			if (err) {
				initPwd();
			} else {
				//load data
				keyContent = data;
				$('#loginBox').fadeIn('slow', function() {
					$('#loginpwd').focus();
				});
			}
		});
		//read data file
		fs.readFile(dataFile, 'utf8', function(err, data) {
			if (!err) {
				//load data
				var content = new Buffer(data,'hex').toString().split('\n');
				for (var line in content) {
					try {
						entries.push(entry.fromJSONObject(JSON.parse(content[line])));
					} catch (e) {}

				}
			}
		});
	} else {
		fs.mkdirSync(dir);
		initPwd();
	}
});


$('#loginpwd').keydown(function(event) {
	if (event.keyCode == 13) {
		var key = $('#loginpwd').val();

		if (doLogin(key)) {
			if (interval) {
				clearInterval(interval);
				$('#countDown').fadeOut('fast');
			}
			$('#loginBox').addClass('has-success');
			$('#loginBox').fadeOut('fast', function() {
				$('#main').show('fast', function() {
					$('#query').focus();
				});
			});
			mainpwd = key;
		} else {
			var pd = $('#loginBox');
			$('#loginpwd').css('background', 'red');
			pd.addClass(' has-error');

			var p = $('<div class="alert alert-warning" role="alert">Invalid key, please correct it in 10 secs, or we\'ll say goodbye.</div>');
			showMsg($('#lgMsg'), p);

			var count = 0;
			$('#countDown').fadeIn('fast');
			for (var i = 1; i < 4; i++) {
				pd.animate({
					height: '+=10px',
					width: '+=20px'
				}, 30);
				pd.animate({
					height: '-=10px',
					width: '-=20px'
				}, 30);
			}
			if (!interval) {
				interval = setInterval(function() {
					if (count == 10) {
						gui.App.quit();
					}
					$('#countDown').animate({
						width: '-=10%'
					}, 500);
					if (count > 4) {
						for (var i = 1; i < 4; i++) {
							pd.animate({
								height: '+=10px',
								width: '+=20px'
							}, 30);
							pd.animate({
								height: '-=10px',
								width: '-=20px'
							}, 30);
						}
					}

					count++;
				}, 1000);
			}

		}

		return false;
	}
});

$('a[data-toggle="tab"]').on('shown.bs.tab', function(e) {
	if (e.target.hash == '#home') {
		$('#query').focus();
	} else if (e.target.hash == '#add') {
		$('#site').focus();
	}
});

function query(t) {
	var result = [];
	for (var i in entries) {
		if (entries[i].site.indexOf(t) > -1) {
			result.push(entries[i])
		}
	}
	return result;
}

function deToString(bs) {
	var b = new Buffer(bs, 'base64');
	return decrypto(b, mainpwd).toString();
}

function showResult(r) {
	var a = $(' <a href="#" class="list-group-item"></a>');
	var result = $('#result');
	result.empty();
	var click = function(e) {
		$(e.target).siblings().removeClass('active');
		$(e.target).addClass('active');
		var detail = $('#detail');
		detail.empty();
		var i = parseInt(e.target.hash.substr(1));
		var di = $('  <li class="list-group-item"></li>');
		var user = di.clone();
		user.text(deToString(r[i].user));
		detail.append(user);
		var pwd = di;
		pwd.text(deToString(r[i].getMainPwd()));
		detail.append(pwd);
	};
	for (var i in r) {
		var m = a.clone();
		m.attr('href', '#' + i);
		m.text(r[i].site);
		result.append(m);
		m.click(click);
	}
}
$('#query').keydown(function(event) {
	if (event.keyCode == 13) {
		var text = $('#query').val();
		showResult(query(text));
	}
});

function enToString(s) {
	//why s is double-byte encoded??!!!
	var ba = [];
	for (var i in s) {
		ba.push(s.charCodeAt(i));
	}
	var t = new Buffer(ba);
	var b = encrypto(t, mainpwd);
	return b.toString('base64');
}

function entry(n) {
	this.site = n;
	this.user = "";
	this.pwds = new Array();
}
entry.prototype.getMainPwd = function() {
	return this.pwds[0];
};
entry.prototype.setUser = function(u) {
	this.user = enToString(u);
}
entry.prototype.addPwd = function(e) {
	this.pwds.push(enToString(e));
};
entry.fromJSONObject = function(j) {
	var e = new entry(j.site);
	e.user = j.user;
	e.pwds = j.pwds;
	return e;
}

function addItem(item) {
	entries.push(item);

	fs.appendFile(dataFile, new Buffer(JSON.stringify(item) + '\n').toString('hex'), function(err) {
		var p;
		if (err) {
			console.log("fail " + err);
			p = $('<div class="alert alert-error" role="alert">Faild to write.Why?</div>');
		} else {
			console.log("ok");
			p = $('<div class="alert alert-success" role="alert">Success</div>');
		}
		showMsg($('#addRight'), p);

	});
}

function validateInput(e) {
	if (e.val().trim().length == 0) {
		e.parent().addClass('has-error');
		return false;
	} else {
		e.parent().removeClass('has-error');
		return true;
	}
}

$('#site').keyup(function(event) {
	if (event.keyCode == 13) {
		if (validateInput($('#site'))) {
			$('#user').focus();
		}
	}
});
$('#user').keyup(function(event) {
	if (event.keyCode == 13) {
		if (validateInput($('#user'))) {
			$('#password').focus();
		}
	}
});
var addItemAction = function() {
	var site = $('#site');
	var user = $('#user');
	var pwd = $('#password');
	if (!(validateInput(site) & validateInput(user) & validateInput(pwd))) {
		return;
	}

	var e = new entry(site.val());
	e.setUser(user.val());
	e.addPwd(pwd.val());

	addItem(e);

	site.val('');
	user.val('');
	pwd.val('');
};
$('#password').keyup(function(event) {
	if (event.keyCode == 13) {
		if (validateInput($('#password'))) {
			addItemAction();
		}
	}
});
$('#btnAddItem').click(addItemAction);
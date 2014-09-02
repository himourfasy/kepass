onload = function() {
    gui.Window.get().show();
};

function getUserHome() {
    // return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
    return process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
}

function arraydel(arr, val) {
    var index = -1;
    for (var i = 0; i < arr.length; i++) {
        if (arr[i] == val) {
            index = i;
            break;
        }
    }

    if (index > -1) {
        arr.splice(index, 1);
    }
}

// var events = require('events');
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
var searchResult;


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
            var p = $('<div class="alert alert-danger" role="alert">could not create key, why?</div>');
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
                var content = new Buffer(data, 'hex').toString().split('\n');
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
            $('#loginpwd').val('');
            var pd = $('#loginBox');
            // $('#loginpwd').css('background', '#e74c3c');
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

function saveAll() {
    var buf = '';
    for (var z in entries) {
        buf += JSON.stringify(entries[z]) + '\n';
    }
    fs.writeFile(dataFile, new Buffer(buf).toString('hex'), function(err) {
        var p;
        if (err) {
            console.log("fail " + err);
            p = $('<div class="alert alert-danger" role="alert">Faild to write.Why?</div>');
        } else {
            console.log("ok");
            p = $('<div class="alert alert-success" role="alert">Success</div>');
        }
        showMsg($('#bottomMsg'), p);
    });
}

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


function getCopyAction() {
    var p = $('<a class="btn btn-warning btn-xs" href="#copy" style="float:right;"><span class="glyphicon glyphicon-send"></span></a>');
    p.click(function() {
        var clipboard = gui.Clipboard.get();
        clipboard.set(p.parent().text(), 'text');
    });
    return p;
}

var showDetail = function(e) {
    $(e.target).siblings().removeClass('active');
    $(e.target).addClass('active');
    var detail = $('#detail');
    detail.empty();
    var i = parseInt(e.target.hash.substr(1));
    var di = $('<li class="list-group-item"></li>');
    var user = di.clone();
    user.text(deToString(searchResult[i].user));
    user.append(getCopyAction());
    detail.append(user);
    var pwd = di;
    pwd.text(deToString(searchResult[i].getPwd()));
    pwd.append(getCopyAction());
    detail.append(pwd);

    $('#first').show();
    $('#second').hide();

    detail.parent().fadeIn('fast');
};

function showResult() {
    showPage(1);

    if (searchResult.length > 5) {
        $('#pagination').bootpag({
            total: (searchResult.length + 4) / 5,
            page: 1,
            maxVisible: 5
        }).on('page', function(event, num) {
            showPage(num);
        });
        $('#pagination').show();
    } else {
        $('#pagination').hide();
    }
}

function showPage(num) {
    $('#detail').parent().fadeOut('fast');

    var a = $(' <a href="#" class="list-group-item"></a>');
    var result = $('#result');
    result.empty();

    var i = 5 * (num - 1);
    var to = i + 5 > searchResult.length ? searchResult.length : i + 5;
    for (; i < to; i++) {
        var m = a.clone();
        m.attr('href', '#' + i);
        m.text(searchResult[i].site);
        result.append(m);
        m.click(showDetail);
    }
}

$('#btnEdit').click(function() {
    var ui = $('<input class="form-control" type="text" placeholder="User Name" id="editUser" />');
    ui.val($('#detail').children(':first').text());
    var pi = $('<input class="form-control" type="password" placeholder="Password" id="editPwd" />');
    pi.val($('#detail').children(':last').text());
    ui.keyup(function(event) {
        if (event.keyCode == 13) {
            if (validateInput(ui)) {
                pi.focus();
            }
        }
    });
    pi.keyup(function(event) {
        if (event.keyCode == 13) {
            $('#btnSave').trigger('click');
        }
    });
    var d = $('#detail');
    d.empty();
    d.append(ui, pi);
    ui.focus();
    $('#first').hide();
    $('#second').show();
});
$('#btnSave').click(function() {
    var user = $('#editUser');
    var pwd = $('#editPwd');
    if (!(validateInput(user) & validateInput(pwd))) {
        return;
    }
    var element = $("#result > a.active");
    var index = parseInt(element[0].hash.substr(1));

    var e = searchResult[index];
    e.setUser(user.val());
    e.setPwd(pwd.val());

    saveAll();

    $("#result > a.active").trigger('click');
});
$('#btnCancel').click(function() {
    $("#result > a.active").trigger('click');
});
$('#btnDelete').click(function() {
    $('#detail').parent().fadeOut('fast', function() {
        if (searchResult == null || searchResult.length == 0) {
            return;
        }
        var element = $("#result > a.active");
        element.hide('fast', function() {
            element.remove();

            var index = parseInt(element[0].hash.substr(1));
            //remove data
            arraydel(entries, searchResult[index]);
            searchResult.splice(index, 1);
            //update href
            showResult();
            //update data file
            saveAll();
        });
    });
});
$('#query').keydown(function(event) {
    if (event.keyCode == 13) {
        var text = $('#query').val();
        searchResult = query(text);
        showResult();
    }
});

function enToString(s, key) {
    //why s is double-byte encoded??!!!
    var ba = [];
    for (var i in s) {
        ba.push(s.charCodeAt(i));
    }
    var t = new Buffer(ba);
    var b = encrypto(t, key);
    return b.toString('base64');
}

function entry(n) {
    this.site = n;
    this.user = '';
    this.pwd = '';
}
entry.prototype.getPwd = function() {
    return this.pwd;
};
entry.prototype.setUser = function(u) {
    this.user = enToString(u, mainpwd);
}
entry.prototype.setPwd = function(e) {
    this.pwd = enToString(e, mainpwd);
};
entry.prototype.updateWithKey = function(nk) {
    var t = deToString(this.user);
    this.user = enToString(t, nk);

    t = deToString(this.pwd);
    this.pwd = enToString(t, nk);
};
entry.fromJSONObject = function(j) {
    var e = new entry(j.site);
    e.user = j.user;
    e.pwd = j.pwd;
    return e;
}

function addItem(item) {
    entries.push(item);

    fs.appendFile(dataFile, new Buffer(JSON.stringify(item) + '\n').toString('hex'), function(err) {
        var p;
        if (err) {
            console.log("fail " + err);
            p = $('<div class="alert alert-danger" role="alert">Faild to write.Why?</div>');
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
    e.setPwd(pwd.val());

    addItem(e);

    site.val('');
    user.val('');
    pwd.val('');

    site.focus();
};
$('#password').keyup(function(event) {
    if (event.keyCode == 13) {
        if (validateInput($('#password'))) {
            addItemAction();
        }
    }
});
$('#btnAddItem').click(addItemAction);

var slider = $("#slider");
var update = function() {
    $('#generate').text('key length: ' + slider.slider('value'));
};
if (slider.length > 0) {
    slider.slider({
        min: 5,
        max: 29,
        value: 8,
        orientation: 'horizontal',
        range: 'min',
        slide: update,
        change: update
    });
}

function randomChar(special) {
    if (special) {
        //all
        return random(33, 126);
    } else {
        var n = random(0, 2);
        switch (n) {
            case 0:
                //0-9
                return random(48, 57);
            case 1:
                //A-Z
                return random(65, 90);
            case 2:
            default:
                //a-z
                return random(97, 122);
        }
    }

}

function random(start, end) {
    return Math.floor((end - start + 1) * Math.random() + start);
}
$('#generate').click(function() {
    //33-126
    var length = slider.slider('value');
    var b = [];
    var s = $('#special').parent().hasClass('checked');
    for (; length > 0; length--) {
        b.push(randomChar(s));
    }
    $('#random').val(new Buffer(b).toString('ascii'));
});
$('#random').mouseenter(function() {
    $(this).select();
});

//change password
var invalidCount = 0;
$('#changepwd').click(function() {
    var error = false;
    if (mainpwd == $('#curpwd').val()) {
        //correct
        $('#curpwd').parent().removeClass(' has-error');
        $('#curpwd').parent().addClass(' has-success');
    } else {
        invalidCount++;
        $('#curpwd').parent().removeClass(' has-success');
        $('#curpwd').parent().addClass(' has-error');
        error = true;

        var msg = '<div class="alert alert-danger" role="alert">Wrong password, ' + (4 - invalidCount) + ' times left for trying</div>';
        var p = $(msg);
        showMsg($('#bottomMsg'), p);
    }
    if (invalidCount > 3) {
        gui.App.quit();
    }

    var newpwd = $('#newpwd').val();
    if (newpwd == mainpwd || newpwd.length == 0) {
        $('#newpwd').parent().addClass(' has-error');
        error = true;
    } else {
        $('#newpwd').parent().removeClass(' has-error');
    }
    if (newpwd != $('#confpwd').val()) {
        $('#confpwd').parent().addClass(' has-error');
        error = true;
    } else {
        $('#confpwd').parent().removeClass(' has-error');
    }

    if (error) {
        return;
    }


    //change password
    var what = encrypto('this is key!', newpwd);
    //update key file.
    fs.writeFile(keyFile, what, function(err) {
        if (err) {
            var p = $('<div class="alert alert-danger" role="alert">could not change password, why?</div>');
            showMsg($('#bottomMsg'), p);
        } else {
            //existing entries should be re-encrypto.
            for (var i in entries) {
                entries[i].updateWithKey(newpwd);
            }
            mainpwd = newpwd;
            saveAll();
        }
    });

    $('#curpwd').val('');
    $('#newpwd').val('');
    $('#confpwd').val('');
});
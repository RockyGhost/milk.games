var express = require('express'),
bodyParser = require('body-parser'), 
session  = require('express-session')

const {verify} = require('hcaptcha');

const config = require('./config.json');
const projects = require('./projects.json');
const mysql = require('mysql');
var db = mysql.createConnection({
	host: config.dbhost,
	user: config.dbuser,
	password: config.dbpass,
	database: "site"
});

db.connect(function(err) {
	if (err) throw err;
	console.log("Connected to DB.");
  // Prepare DB
  db.query("CREATE TABLE IF NOT EXISTS feedback (id INTEGER AUTO_INCREMENT PRIMARY KEY, feedback TEXT, ip TEXT)", function (err, result) {
  	if (err) throw err;
  });
});

function findItem(arr, key, value) {
	for (var i = 0; i < arr.length; i++) {
		if (arr[i][key] === value) {
			return(i);
		}
	}
	return(-1);
}

const app = express();
var path = require('path');
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	extended: true
}));

app.set('view engine', 'ejs');
app.set('trust proxy', true)
app.set('views', __dirname + '/views');

app.get('/', function(req, res) {
	res.render('index', {projects: projects});
});

app.get('/lithiio', function(req, res) {
	res.render('lithiio');
});

app.get('/projects', function(req, res) {
	res.render('projects', {projects: projects});
});

app.get('/project/:url', function(req, res) {
	if (findItem(projects, "url", req.params.url) == -1) {
		res.sendStatus(404)
	}
	res.render('project', {projects: projects, project: projects[findItem(projects, "url", req.params.url)]});
});

app.get('/feedback', function(req, res) {
	res.render('feedback', {projects: projects});
});

app.get('/api/projects.json', function(req, res) {
	res.json(projects)
});

app.post('/feedback', function(req, res) {
	if (req.body.feedback.length < 5) { res.end("Feedback must be longer than 5 characters."); return; }
	console.log(req)
	verify(config.cap, req.body["h-captcha-response"])
	.then(function(info){
		console.log(info)
		if (info.success == false) { res.end("Invalid Captcha"); return; } 
		db.query('INSERT INTO feedback SET feedback = ?, ip = ?', [req.body.feedback, req.ip], function (error, results, fields) { 
			if (error) throw error;
		})
		res.redirect("/")
	})
	.catch(function(err){
		console.log(err)
		res.end("Invalid Captcha")
	});
	//if (req.recaptcha.error) { res.end("Recaptcha error!"); return; }

});

app.get('/admin', function(req, res) {
	res.render('admin', {projects: projects, authed: false});
});

app.post('/admin', function(req, res) {
	if (req.body.password == config.key) {
		db.query('SELECT * FROM feedback', function (error, results, fields) { 
			if (error) throw error;
			res.render('admin', {projects: projects, authed: true, feedback: results});
		})
	} else {
		res.redirect("https://google.com")
	}
});


if (config.debug) {
	app.listen(8000);
} else {
	app.listen(80);
}
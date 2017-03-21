var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var jwt = require('jsonwebtoken');
var cookieParser = require('cookie-parser');

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));
app.use(cookieParser());



app.get('/', 
function(req, res) {
  res.render('login');
});

app.get('/login', function(req, res) {
  res.status(200);
  res.clearCookie('jwttoken');
  res.render('login.ejs');
});

app.get('/signup', function(req, res) {
  res.status(200);
  res.render('signup.ejs');
});

app.post('/signup', function(req, res) {
  var nameInput = req.body.username;
  var passwordInput = req.body.password;

  new User.user({ username: nameInput })
  .fetch().then(function(found) {
    if (found) {
      console.log('User already exists', found);
      res.status(200).send(found.attributes);

      //will need to redirect later if user already exists
    } else {
      console.log('Made it to else statement/creating user');
      Users.create({
        username: nameInput,
        password: User.bCryptPassword(passwordInput)
      }).then(function(newUser) {
        console.log('USER ADDED');

        res.status(200).redirect('login');
        return newUser;
      });
      
    }

  });


});

app.post('/login', function (req, res) {
  var nameInput = req.body.username;
  var passwordInput = req.body.password;

  new User.user({ username: nameInput})
  .fetch().then(function(found) {
    if (found) {
      User.checkPassword(nameInput, passwordInput).then(function(isSame) {
        if (isSame === true) {
          var token = jwt.sign(found, 'secretkey', { expiresIn: '5m' });
          res.status(200);
          res.cookie('jwttoken', token);
          res.redirect('home');

        } else {
          console.log('Password is incorrect');
          res.redirect('login');
        }
      }); 
    } else {
      console.log('Did not find the user');
      res.redirect('login');

    }
  });

});


app.use(function(req, res, next) {
  // check header or url parameters or post parameters for token
  var token = req.body.token || req.query.token || req.headers['x-access-token'] || req.cookies.jwttoken;// || req.url;
  // decode token
  if (token) {
    // verifies secret and checks exp
    jwt.verify(token, 'secretkey', function(err, decoded) {      
      if (err) {
        console.log('Failed to verify token');
        return res.status(403).send();    
      } else {
        // if everything is good, save to request for use in other routes
        req.decoded = decoded;    
        next();
      }
    });
  } else {
    return res.status(403).redirect('login');
  }
});

app.get('/home', function(req, res) {
  res.render('index');
});


app.get('/create', 
function(req, res) {
  res.render('index');
});

app.get('/links', 
function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.status(200).send(links.models);
  });
});

app.post('/links', 
function(req, res) {
  var uri = req.body.url;


  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.sendStatus(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.status(200).send(found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.sendStatus(404);
        }

        Links.create({
          url: uri,
          title: title,
          baseUrl: req.headers.origin
        })
        .then(function(newLink) {
          res.status(200).send(newLink);
        });
      });
    }
  });
});




/************************************************************/
// Write your authentication routes here
/************************************************************/


/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        linkId: link.get('id')
      });

      click.save().then(function() {
        link.set('visits', link.get('visits') + 1);
        link.save().then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);

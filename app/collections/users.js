var db = require('../config');
var User = require('../models/user');

var Users = new db.Collection();

Users.model = User.user;

module.exports = Users;
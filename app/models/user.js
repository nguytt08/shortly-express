var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');
var bCryptPassword = function(password) {
  return bcrypt.hashSync(password);
};

var checkPassword = function(user, password) {
  return db.knex.raw(`SELECT password FROM users WHERE username = '${user}'`)
    .then(function(res) {
      return bcrypt.compareSync(password, res[0].password);
    });
};

var User = db.Model.extend({
  tableName: 'users',
});

exports.user = User;
exports.bCryptPassword = bCryptPassword;
exports.checkPassword = checkPassword;
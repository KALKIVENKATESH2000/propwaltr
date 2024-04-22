const mysqlPool = require('../helper/mysql')
const credentials = require('../util/credentials')
const jwt = require('jsonwebtoken')
var bcrypt = require('bcrypt');

module.exports = {

  getUserFromDB: async function(userId) {
    const result = await mysqlPool.query('SELECT * FROM user where id = "' + userId + '"');
    if(result.error || result.result.length === 0) {
      return "";
    } else {
      return result.result[0];
    }
  },

  validateInputPagenation : ( pageNo, pageSize) => {
    if (isNaN(pageNo) || isNaN(pageSize) || pageNo < 1 || pageSize < 1 || !pageNo || !pageSize) {
      return false;
    }
    return true;
  },

  getNewJWTToken: (user_id, session_id) => {
    let data = {
      session_id: session_id,
      user_id: user_id,
      type: credentials.jwtTokenTypeAuth
    }
    const token = jwt.sign(data, process.env.JWT_KEY, {expiresIn: credentials.jwtTokenDuration});
    return token
  }, 

  verifyJWTToken: async (token) => {
    return new Promise(async resolve => {
      try {
        jwt.verify(token, process.env.JWT_KEY, async function(err, decoded) {
          if(err || decoded === undefined || decoded === null) {
            const res = jwt.verify(token, process.env.JWT_KEY, {ignoreExpiration: true});    
            resolve({status:false, id:"", session_id:res.session_id})
          } else {
            const session = await mysqlPool.query('select is_expired from user_session where id = "' + decoded.session_id + '" and is_expired = 0')

            if(session.result.length === 0 || session.error || decoded.type === undefined || decoded.type === null ||decoded.type != credentials.jwtTokenTypeAuth) {
              resolve({status:false, id:"", session_id:""})
            } else {
              resolve({status:true, id:decoded.user_id, session_id:decoded.session_id})
            }
          }
        });  
      } catch (error) {
        resolve({status:false, id:"", session_id:""})
      }
    });
  },

  cryptPassword: (password) => {
    return new Promise(async resolve => {
      bcrypt.genSalt(10, function(err, salt) {
        if (err) 
          return resolve('');
     
        bcrypt.hash(password, salt, function(err, hash) {
          if (err) 
          return resolve('');
          return resolve(hash);
        });
      });
    });
  },

  comparePassword: (plainPass, hashword) => {
    return new Promise(async resolve => {
      bcrypt.compare(plainPass, hashword, function(err, isPasswordMatch) {   
        return err == null ?
        resolve(isPasswordMatch) :
        resolve(false);
      });
    });
  },

  getNewJWTTokenForForgotPassword: (user_id) => {
    let data = {
      user_id: user_id,
      type: credentials.jwtTokenTypeTempAuth
    }
    const token = jwt.sign(data, process.env.JWT_KEY, {expiresIn: "10m"});
    return token
  },

  verifyJWTTokenForForgotPassword: async (token) => {
    return new Promise(async resolve => {
      try {
        jwt.verify(token, process.env.JWT_KEY, async function(err, decoded) {
          if(err || decoded === undefined || decoded === null) {
            const res = jwt.verify(token, process.env.JWT_KEY, {ignoreExpiration: true});    
            resolve({status:false, id:""})
          } else {
            if(decoded.type === undefined || decoded.type === null || decoded.type != credentials.jwtTokenTypeTempAuth) {
              resolve({status:false, id:""})
            } else {
              resolve({status:true, id:decoded.user_id})
            }
          }
        });  
      } catch (error) {
        resolve({status:false, id:""})
      }
    });
  },

  getTokenFromMask: async (token) => {
    return new Promise(async resolve => {
      const session = await mysqlPool.query('select * from user_session where id = "' + token + '" and is_expired = 0')

      if(session.result.length === 0 || session.error) {
        resolve({status:false, token: ""})
      } else {
        resolve({status:true, token:session.result[0].auth_token})
      }
    });
  },
}


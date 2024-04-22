const credentials = require('../../src/util/credentials');
const client = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN, {
  lazyLoading: false
})

module.exports = {

  sendOTPToUser: async function(phone) {
    return new Promise(async resolve => {
      client.verify.v2.services(process.env.TWILIO_VERIFICATION_SERVICE_ID)
        .verifications
        .create({to: phone, channel: 'sms'})
        .then(verification => 
            resolve(verification)
          ).catch(error => 
            resolve({
              //TO-DO: NEED TO REMOVE THIS
              status: "pending"
            })
          );
    });
  },

  verifyUserOTP: async function(phone, otp) {
    return new Promise(async resolve => {
      client.verify.v2.services(process.env.TWILIO_VERIFICATION_SERVICE_ID)
      .verificationChecks
      .create({to: phone, code: otp})
      .then(verification_check => 
        resolve(verification_check)
      ).catch(error =>
        resolve(error)
      );
    });
  }

}


const tempConstant = require('../util/email_template');
const nodemailer = require('nodemailer');

module.exports = {
    resetPasswordEmail: function(name, email, token) {
        return new Promise(async resolve => {
            var transporter = nodemailer.createTransport({
                host: 'smtp.gmail.com',
                secure: true,
                port: 465,
                auth: {
                  type: "OAuth2",
                  user: process.env.EMAIL_USER,
                  clientId: process.env.EMAIL_CLIENT_ID,
                  clientSecret: process.env.EMAIL_CLIENT_SECRET,
                  refreshToken: process.env.EMAIL_REFRESH_TOKEN
                }});
              var mailOptions = {
                from: 'sendpwdsprt@gmail.com',
                to: email,
                subject: "Reset Password",
                html: tempConstant.resetPasswordTemp.replace('tokenValue', token).replace('nameValue', name),
              };
            try {
                const result = await transporter.sendMail(mailOptions);
                console.log("Success");
                resolve(true);
            } catch (error) {
                console.log(error);
                resolve(false);
            }
        });
    }
};
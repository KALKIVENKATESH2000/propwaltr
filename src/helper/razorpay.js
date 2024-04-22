const axios = require('axios');
const authToken = process.env.RAZORPAY_TOKEN

const razorpayBaseURL = "https://api.razorpay.com/v1/"
const razorpayPaymentAPIPath = "payments/"

module.exports = {
  //====================Get payment details========================================
  getPaymentDetails: async function(pay_id) {
    return new Promise (async (resolve)=>{
      try {
        const response = await axios.get(razorpayBaseURL + razorpayPaymentAPIPath + pay_id, {
            headers: {
                Authorization: authToken
            }
          });
          resolve({status: true, data: response.data});
  
      } catch (error) {
        console.log(error);
        resolve({status: false, data: error.response.data.error.description});
      }
      })
    },

  //====================Capture payment========================================
  capturePayment: async function(amount, pay_id) {
    return new Promise (async (resolve)=>{
      try {
        var dic = {
          amount: amount * 100,
          currency: "INR"
        }
        
        const response = await axios.post(razorpayBaseURL + razorpayPaymentAPIPath + pay_id + '/capture', dic, {
            headers: {
                Authorization: authToken
            }
          });
        resolve({status: true, data: response.data});
  
      } catch (error) {
        resolve({status: false, data: error.response.data.error.description});
      }
      })
    },

    //====================Get order details========================================
  initRefundToClient: async function(pay_id, amount, note) {
    return new Promise (async (resolve)=>{
      try {
        var dic = {
          amount: amount * 100,
          receipt: pay_id,
          notes: note
        }

        const response = await axios.post(razorpayBaseURL + razorpayPaymentAPIPath + pay_id + '/refund', dic, {
            headers: {
                Authorization: authToken
            }
          });
          resolve({status: true, data: response.data});
  
      } catch (error) {
        resolve({status: false, data: error.response.data.error.description});
      }
    })
  },
}
module.exports = {
    getDBId: function() {
        let result = '';
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const charactersLength = characters.length;
        let counter = 0;
        while (counter < 20) {
          result += characters.charAt(Math.floor(Math.random() * charactersLength));
          counter += 1;
        }
        return result;
    },

    getTimestamp: function(days) {
        var date;
        date = new Date();
        date.setDate(date.getDate() + days);
        date = date.getUTCFullYear() + '-' +
        ('00' + (date.getUTCMonth()+1)).slice(-2) + '-' +
        ('00' + date.getUTCDate()).slice(-2) + ' ' + 
        ('00' + date.getUTCHours()).slice(-2) + ':' + 
        ('00' + date.getUTCMinutes()).slice(-2) + ':' + 
        ('00' + date.getUTCSeconds()).slice(-2);
        return date;
    },

    currentTimestamp: function() {
        var date;
        date = new Date();
        date = date.getUTCFullYear() + '-' +
        ('00' + (date.getUTCMonth()+1)).slice(-2) + '-' +
        ('00' + date.getUTCDate()).slice(-2) + ' ' + 
        ('00' + date.getUTCHours()).slice(-2) + ':' + 
        ('00' + date.getUTCMinutes()).slice(-2) + ':' + 
        ('00' + date.getUTCSeconds()).slice(-2);
        return date;
    },
    
    currentDate: function() {
        var date;
        date = new Date();
        date = date.getUTCFullYear() + '-' +
        ('00' + (date.getUTCMonth()+1)).slice(-2) + '-' +
        ('00' + date.getUTCDate()).slice(-2);
        return date;
    }, 

    responseJSON: function(status, message, data) {
        return {
            status: status,
            message: message,
            data: data
        };
    },

    responseJSONWithCounts: function(status, message, data, total) {
        return {
            status: status,
            message: message,
            data: data,
            total
        };
    },

    mergeFCMToken: function(currentToken, newToken) {
        if(currentToken === undefined || currentToken === "") {
            return newToken
        }

        if(newToken === undefined) {
            return currentToken
        }
        
        if(this.splitFCMToken(currentToken).includes(newToken)) {
            return currentToken
        }

        return currentToken + "," + newToken
    },
    
    splitFCMToken: function(token) {
        return token.split(",");
    },

    removeFCMToken: function(currentToken, removeToken) {
        var array = currentToken.split(",");
        var index = array.indexOf(removeToken);
        if (index !== -1) {
            array.splice(index, 1);
        }
        return array.join(",");
    },

    isValidImg : (img) => {
        const reg = /.+\.(?:(jpg|gif|png|jpeg|jfif))/;
        return reg.test(img);
      }
};
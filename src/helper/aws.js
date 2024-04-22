const aws = require("aws-sdk")
var fs = require('fs');
var path = require('path');
const credentials = require('../util/credentials')

require('aws-sdk/lib/maintenance_mode_message').suppress = true;

//=======================AWS Configuration====================================
aws.config.update({
    accessKeyId: process.env.AWS_S3_KEY_ID,
    secretAccessKey: process.env.AWS_S3_SECRET_KEY,
    region:"ap-south-1",  
})

//====================Upload File========================================
 exports.uploadFile = async (file, bucket) =>{
    return new Promise ((resolve)=>{
        let s3 = new aws.S3({apiVersion:"2006-03-01"}  )

        var uplodeParams = {
            ACL : "public-read",
            Bucket: bucket,
            Key: '',
            Body: '',
            ContentType: file.mimetype
        }

        var fileStream = fs.createReadStream(file.path);

        uplodeParams.Body = fileStream;
        uplodeParams.Key = path.basename(file.originalname);

        s3.upload(uplodeParams,(err,data)=>{
            fs.unlinkSync(file.path);
            if(err) {
                resolve({error:err, result:null})
                return
            }
            resolve({error: null, result: data.Location})
        })
    })
}

//===========================Delete File============================
exports.deleteFile = async (files, bucket) =>{
    return new Promise ((resolve)=>{
        let s3 = new aws.S3({apiVersion:"2006-03-01"}  )

        var objects = []
        files.forEach(element => {
            objects.push({
                Key: decodeURI(path.parse(element).base)
            })
        });

        var deleteParam = {
            Bucket: bucket,
            Delete: {
                Objects: objects
            }
        };

        s3.deleteObjects(deleteParam, function(err, data) {
            if (err) {
                resolve('');
            } else {
                resolve('')
            }
        });
    })
}


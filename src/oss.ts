const qiniu = require('qiniu');


export default function (config: any, imagePath: String):Promise<string> {
    return new Promise((resolve, reject) => {
        let fileArr = imagePath.split('/');
        let fileName = fileArr[fileArr.length - 1];

        var options = {
            scope: config.bucket,
            returnBody: '{"key":"$(key)","hash":"$(etag)","fsize":$(fsize),"bucket":"$(bucket)","name":"$(x:name)","age":$(x:age),"returnUrl": "$(returnUrl)"}'
        };
        var accessKey = config.accessKey;
        var secretKey = config.secretKey;

        var mac = new qiniu.auth.digest.Mac(accessKey, secretKey);
        var putPolicy = new qiniu.rs.PutPolicy(options);
        var uploadToken=putPolicy.uploadToken(mac);
        var qiniuConfig = new qiniu.conf.Config();
        var formUploader = new qiniu.form_up.FormUploader(qiniuConfig);
        var putExtra = new qiniu.form_up.PutExtra();

        // 文件上传
        formUploader.putFile(uploadToken, `${config.assetPath ? config.assetPath : ''}${fileName}`, imagePath, putExtra, function(respErr: any,
            respBody: any, respInfo: { statusCode: number; data: any; }) {
            if (respErr) {
                throw respErr;
            }
            if (respInfo.statusCode === 200) {
                try {
                    let responeJson = respInfo.data;
                    let fileName = responeJson.key;
                    resolve(`${config.publicPath}${fileName}`);
                } catch (error) {
                    console.log('error: ', error);
                }
            } else {
                reject(respBody);
            }
        });
  
    })
}
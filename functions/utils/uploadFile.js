const { nanoid } = require('nanoid')
const admin = require('firebase-admin');


async function uploadFile(files)  {
    var file = files.fileToUpload;
    if (!file) {
        returnValue = false
        return returnValue
    }

    var filePath = file.path;
    var fileName = file.name;
    var extensions = fileName.split('.')
    extensions = extensions[extensions.length - 1]
    
    var bucket = admin.storage().bucket();
    var dest = "profile/" + nanoid() +"."+ extensions
    const options = {
        destination: dest,
        contentType: "video/"+extensions, //file.path
    };
    const result = await bucket.upload(filePath, options);

    const link = await bucket.file(dest).publicUrl()
    returnValue = link;

    return returnValue;
};
exports.uploadFile = uploadFile;
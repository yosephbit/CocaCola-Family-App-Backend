const { nanoid } = require('nanoid')
const admin = require('firebase-admin');


async function uploadFile(files) {
    var file = files.fileToUpload;
    if (!file) {
        returnValue = false
        return
    }
    var filePath = file.path;
    var bucket = admin.storage().bucket();
    var dest = "profile/" + nanoid() + ".webm"
    const options = {
        destination: dest,
        contentType: "video/webm", //file.path
    };
    const result = await bucket.upload(filePath, options);

    const link = await bucket.file(dest).publicUrl()
    returnValue = link;

    return returnValue;
};
exports.uploadFile = uploadFile;
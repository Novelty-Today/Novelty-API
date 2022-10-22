const { Storage } = require("@google-cloud/storage");
const { Buffer } = require("buffer");
const {googleCloudProjectId} = require('../constants')

const storage = new Storage({
  projectId: googleCloudProjectId,
  keyFilename: "./novelty-service-account-key.json",
});

const uploadFile = ({ bucketName, filePath, destFileName, contentType }) => {
  return storage.bucket(bucketName).upload(filePath, {
    destination: destFileName,
    public: true,
    contentType,
  });
};

const uploadMediaToGoogleCloud = (filename, pathFromTempMedia, bucketName) => {
  const isImage = filename?.includes("png") || filename?.includes("jpeg");
  const filePath = `${pathFromTempMedia}${filename}`;

  return uploadFile({
    bucketName,
    filePath,
    destFileName: filename,
    contentType: isImage ? "image/jpeg" : "video/mp4",
  });
};

const uploadAudioToGoogleCloud = async (base64File, filename, bucketName) => {
  const audioBuffer = Buffer.from(base64File, "base64");
  const file = storage.bucket(bucketName).file(filename);

  return file.save(audioBuffer, { contentType: "audio/wav", public: true });
};

const buildGoogleCloudUrl = (bucketName, filename) => {
  return filename
    ? `https://storage.googleapis.com/${bucketName}/${filename}`
    : null;
};

module.exports = {
  uploadMediaToGoogleCloud,
  uploadAudioToGoogleCloud,
  buildGoogleCloudUrl,
};

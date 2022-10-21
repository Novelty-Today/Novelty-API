const sharp = require("sharp");
const fs = require("fs");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const ffmpeg = require("fluent-ffmpeg");
ffmpeg.setFfmpegPath(ffmpegPath);
const { v4: uuidv4 } = require("uuid");
const { googleCloudMediaBuckets, baseUrl } = require("../constants");
const path = require("path");
const { promisify } = require("util");
const convert = require("heic-convert");
const imageType = require("image-type");
var ffprobe = require("ffprobe-static");
const {
  uploadMediaToGoogleCloud,
  uploadAudioToGoogleCloud,
} = require("../services/gcp-storage");
ffmpeg.setFfprobePath(ffprobe.path);

const userImageUrlWithEmail = (email) => {
  return `${baseUrl}getUserMedia/${email}/micro`;
};

const eventImageUrlWithId = (eventId) => {
  return `${baseUrl}getEventPreviewMedia/${eventId}`;
};

const uploadImageDataToDatabaseWithMiniPicture = (
  media,
  originalFilename,
  filename,
  miniFilename
) => {
  return new Promise(async (resolve, reject) => {
    if (media) {
      try {
        const base64Data = media?.includes("base64,")
          ? media?.split?.("base64,")?.[1]
          : media;

        const imageFolderPath = path.join(
          __dirname.split("functions")[0],
          "tempMedia/image/"
        );

        fs.writeFileSync(
          `${imageFolderPath}${originalFilename}`,
          base64Data,
          "base64"
        );

        const ext = imageType(Buffer.from(base64Data, "base64")).ext;
        const sharpImageName =
          ext == "heic" ? uuidv4() + ".jpeg" : originalFilename;

        return Promise.resolve()
          .then(() => {
            if (ext == "heic") {
              return heicToJpeg(
                `${imageFolderPath}${originalFilename}`,
                `${imageFolderPath}${sharpImageName}`
              );
            }
          })
          .then(() => {
            return Promise.all([
              sharp(`${imageFolderPath}${sharpImageName}`)
                .resize({ width: 720, height: 1280, fit: sharp.fit.inside })
                .toFile(imageFolderPath + filename),
              sharp(`${imageFolderPath}${sharpImageName}`)
                .resize({ width: 500 })
                .toFile(imageFolderPath + miniFilename),
            ]);
          })
          .then(() => {
            return Promise.all([
              uploadMediaToGoogleCloud(
                filename,
                "./tempMedia/image/",
                googleCloudMediaBuckets.chatMediaBucket
              ),
              uploadMediaToGoogleCloud(
                miniFilename,
                "./tempMedia/image/",
                googleCloudMediaBuckets.chatMediaBucket
              ),
            ]);
          })
          .then(() => {
            resolve("done");
          })
          .catch((error) => {
            console.log("Error a*&ifuaif ", error);
            resolve(error);
          });
      } catch (error) {
        console.log("Error adfgay76 ", error);
        resolve(error);
      }
    } else {
      resolve("no image");
    }
  });
};

const uploadAudioDataToDatabase = (voice, filename) => {
  if (voice) {
    return uploadAudioToGoogleCloud(
      voice,
      filename,
      googleCloudMediaBuckets.chatMediaBucket
    );
  } else {
    return Promise.resolve("no voice");
  }
};

const heicToJpeg = async (inputPath, outputPath) => {
  // heic images generally are very good quality and resulting file is large so we set quality to 0.7
  const inputBuffer = await promisify(fs.readFile)(inputPath);
  const outputBuffer = await convert({
    buffer: inputBuffer, // the HEIC file buffer
    format: "JPEG", // output format needs 'JPEG' or 'PNG'
    quality: 0.7, // the jpeg compression quality, between 0 and 1
  });

  await promisify(fs.writeFile)(outputPath, outputBuffer);
};

module.exports = {
  uploadImageDataToDatabaseWithMiniPicture,
  uploadAudioDataToDatabase,
  heicToJpeg,
  userImageUrlWithEmail,
  eventImageUrlWithId,
};

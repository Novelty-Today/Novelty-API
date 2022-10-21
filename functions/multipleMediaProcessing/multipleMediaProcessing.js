const fs = require("fs");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const ffmpeg = require("fluent-ffmpeg");
ffmpeg.setFfmpegPath(ffmpegPath);
const { v4: uuidv4 } = require("uuid");
var ffprobe = require("ffprobe-static");
const sharp = require("sharp");
const { heicToJpeg } = require("../mediaProccessing");
ffmpeg.setFfprobePath(ffprobe.path);
const imageType = require("image-type");
const {
  uploadMediaToGoogleCloud,
  buildGoogleCloudUrl,
} = require("../../services/gcp-storage");
const { getFfmpegOptions } = require("./getFfmpegOptions");

const multipleMediaProcessing = (mediaFilenamesArray = [], bucketName) => {
  let promiseArray = [];

  const miniMediaWidth = 600;

  const miniImagesPath = "./tempMedia/miniImages/";
  const originalImagePath = "./tempMedia/image/";

  const originalVideoPath = "./tempMedia/video/";
  const resizedVideoPath = "./tempMedia/videoHls/";

  let mediaNamesArray = [];
  let miniMediaNamesArray = [];

  mediaFilenamesArray.forEach((filename) => {
    if (
      filename.toLowerCase().includes(".mp4") ||
      filename.toLowerCase().includes(".mov")
    ) {
      const uploadedVideoName = uuidv4() + ".mp4";
      const uploadedMiniImageName = uuidv4() + ".jpeg";

      mediaNamesArray.push(buildGoogleCloudUrl(bucketName, uploadedVideoName));
      miniMediaNamesArray.push(
        buildGoogleCloudUrl(bucketName, uploadedMiniImageName)
      );
      promiseArray.push(
        handleVideo(
          filename,
          originalVideoPath,
          resizedVideoPath,
          uploadedVideoName,
          bucketName
        )
      );
      promiseArray.push(
        handleVideoThumbnail(
          filename,
          originalVideoPath,
          miniImagesPath,
          uploadedMiniImageName,
          miniMediaWidth,
          bucketName
        )
      );
    } else {
      const uploadedImageName = uuidv4() + ".jpeg";
      const uploadedMiniImageName = uuidv4() + ".jpeg";

      mediaNamesArray.push(buildGoogleCloudUrl(bucketName, uploadedImageName));
      miniMediaNamesArray.push(
        buildGoogleCloudUrl(bucketName, uploadedMiniImageName)
      );

      promiseArray.push(
        handleImage(
          filename,
          originalImagePath,
          miniImagesPath,
          uploadedImageName,
          uploadedMiniImageName,
          miniMediaWidth,
          bucketName
        )
      );
    }
  });

  return Promise.all(promiseArray).then(() => {
    return [mediaNamesArray, miniMediaNamesArray];
  });
};

const handleVideo = (
  filename,
  originalVideoPath,
  resizedVideoPath,
  uploadedVideoName,
  bucketName
) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(originalVideoPath + filename, (err, metadata) => {
      const options = getFfmpegOptions(metadata);

      ffmpeg(originalVideoPath + filename, { timeout: 900000 })
        .addOptions(options)
        .output(resizedVideoPath + uploadedVideoName)
        .on("end", () => {
          return uploadMediaToGoogleCloud(
            uploadedVideoName,
            resizedVideoPath,
            bucketName
          ).then(() => {
            resolve("done");
            //   fs.unlinkSync(resizedVideoPath + uploadedVideoName);
          });
        })
        .on("error", (error, stdout, stderr) => {
          console.log("Cannot process video: " + error.message);
          reject(error);
        })
        .run();
    });
  });
};

const handleVideoThumbnail = (
  filename,
  originalVideoPath,
  miniImagesPath,
  uploadedMiniImageName,
  width,
  bucketName
) => {
  return new Promise((resolve, reject) => {
    try {
      let tempName = uuidv4() + ".jpeg";

      ffmpeg({ source: originalVideoPath + filename })
        .takeScreenshots(
          {
            folder: miniImagesPath,
            filename: tempName,
            timemarks: [1],
          },
          "."
        )
        .on("end", () => {
          return sharp(miniImagesPath + tempName)
            .resize({ width })
            .jpeg()
            .toFile(miniImagesPath + uploadedMiniImageName)
            .then(() => {
              return uploadMediaToGoogleCloud(
                uploadedMiniImageName,
                miniImagesPath,
                bucketName
              );
            })
            .then(() => {
              resolve("done");
              // fs.unlink(miniImagesPath + tempName, () => {});
              // fs.unlink(miniImagesPath + uploadedMiniImageName, () => {});
            });
        })
        .on("error", (error) => {
          throw new Error(error);
        });
    } catch (error) {
      console.log("Error 89798645jiuy87t ", error);
      reject(error);
    }
  });
};

const handleImage = (
  filename,
  originalImagePath,
  miniImagesPath,
  uploadedImageName,
  uploadedMiniImageName,
  width,
  bucketName
) => {
  console.log("/handleImage    ", filename);
  const nameAndExt = getSharpImageNameAndExt(originalImagePath, filename);

  return Promise.resolve()
    .then(() => {
      if (nameAndExt.ext == "heic") {
        return heicToJpeg(
          originalImagePath + filename,
          originalImagePath + nameAndExt.name
        );
      }
    })
    .then(() => {
      return Promise.all([
        mainImageResizing(
          originalImagePath,
          filename,
          uploadedImageName,
          nameAndExt
        ),
        sharp(originalImagePath + nameAndExt.name)
          .resize({ width })
          .jpeg()
          .toFile(miniImagesPath + uploadedMiniImageName),
      ]);
    })
    .then(() => {
      return Promise.all([
        uploadMediaToGoogleCloud(
          uploadedImageName,
          originalImagePath,
          bucketName
        ),
        uploadMediaToGoogleCloud(
          uploadedMiniImageName,
          miniImagesPath,
          bucketName
        ),
      ]);
    })
    .then(() => {
      return "done";
    });
};

const mainImageResizing = (
  originalImagePath,
  filename,
  uploadedImageName,
  nameAndExt
) => {
  return new Promise((resolve, reject) => {
    fs.stat(originalImagePath + filename, (error, stats) => {
      if (error) return reject(error.message);

      const fileSizeInMegabytes = stats.size / (1024 * 1024);
      const resizeOptions = {
        width: 1170,
        height: 2532,
        fit: sharp.fit.inside,
      };
      const qualityOptions = { quality: parseInt(100 / fileSizeInMegabytes) };

      const img = sharp(originalImagePath + nameAndExt.name);

      return img
        .metadata()
        .then((metadata) => {
          if (fileSizeInMegabytes > 1) {
            if (metadata.width > 1170 || metadata.height > 2532) {
              return img
                .resize(resizeOptions)
                .jpeg(qualityOptions)
                .toFile(originalImagePath + uploadedImageName);
            } else {
              return img
                .jpeg(qualityOptions)
                .toFile(originalImagePath + uploadedImageName);
            }
          } else {
            if (metadata.width > 1170 || metadata.height > 2532) {
              return img
                .resize(resizeOptions)
                .jpeg()
                .toFile(originalImagePath + uploadedImageName);
            } else {
              return img.jpeg().toFile(originalImagePath + uploadedImageName);
            }
          }
        })
        .then(() => {
          resolve("done");
        });
    });
  });
};

const getSharpImageNameAndExt = (originalImagePath, filename) => {
  try {
    const ext = imageType(fs.readFileSync(originalImagePath + filename)).ext;
    return { name: ext == "heic" ? uuidv4() + ".jpeg" : filename, ext: ext };
  } catch (error) {
    console.log("Error ajfabhg ", error);
    return { name: filename, ext: filename.split(".")[1] };
  }
};

module.exports = { multipleMediaProcessing };

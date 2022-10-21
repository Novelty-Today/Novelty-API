const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const ffmpeg = require("fluent-ffmpeg");
ffmpeg.setFfmpegPath(ffmpegPath);
var ffprobe = require("ffprobe-static");
ffmpeg.setFfprobePath(ffprobe.path);

const getResolution = (metadata) => {
  const defaults = { width: 640, height: 480 };
  let rotate = "0";

  let height = defaults.height;
  let width = defaults.width;
  let resolution = `${width}:${height}`;

  metadata.streams.forEach((stream) => {
    if (stream.width && stream.height) {
      width = ffmpegNum(stream.width);
      height = ffmpegNum(stream.height);
      resolution = `${width}:${height}`;
    }
    if (stream.tags.rotate) {
      rotate = stream.tags.rotate;
    }
  });

  if (rotate == "90") {
    width = resolution.split(":")[1];
    height = resolution.split(":")[0];
    resolution = `${width}:${height}`;
  }

  if (height > defaults.height && width > defaults.width) {
    const scaleDownIndex = Math.max(
      height / defaults.height,
      width / defaults.width
    );
    resolution = `${ffmpegNum(width / scaleDownIndex)}:${ffmpegNum(
      height / scaleDownIndex
    )}`;
  } else if (height > defaults.height) {
    resolution = `${ffmpegNum(width / (height / defaults.height))}:${
      defaults.height
    }`;
  } else if (width > defaults.width) {
    resolution = `${defaults.width}:${ffmpegNum(
      height / (width / defaults.width)
    )}`;
  }

  if (resolution.includes("undefined")) {
    const originalResolution = `${width}:${height}`;
    if (originalResolution.includes("undefined")) {
      return `${defaults.width}:${defaults.height}`;
    } else {
      return originalResolution;
    }
  } else {
    return resolution;
  }
};

const ffmpegNum = (num) => {
  const intNum = parseInt(num);
  if (intNum % 2 == 0) {
    return intNum;
  } else {
    return intNum - 1;
  }
};

const getFfmpegOptions = (metadata) => {
  const resolution = getResolution(metadata);

  let options = [
    "-c:v:0 libx264", // changes encoding to libx264
    `-vf scale=${resolution}`, // changes resolution of video
    "-f mp4",
  ];

  return options;
};

module.exports = { getFfmpegOptions };

const multer = require("multer");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const storageLocalNew = multer.diskStorage({
  destination: (req, file, cb) => {
    const folderPath =
      file.originalname.toLocaleLowerCase().includes(".mp4") ||
      file.originalname.toLocaleLowerCase().includes(".mov")
        ? "tempMedia/video"
        : "tempMedia/image";
    cb(null, folderPath);
  },
  filename: (req, file, cb) => {
    const name = uuidv4() + path.extname(file.originalname.toLocaleLowerCase());
    req.body.MediaFilenamesArray
      ? req.body.MediaFilenamesArray.push(name)
      : (req.body.MediaFilenamesArray = [name]);
    cb(null, name);
  },
});

const uploadNew = multer({
  storage: storageLocalNew,
  limits: { fieldSize: 100 * 1024 * 1024 },
});

const multipleUploadNew = uploadNew.fields([{ name: "mediaArray" }]);

const storageLocal = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "tempMedia/media");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname.toLocaleLowerCase());
    const name = uuidv4() + ext;
    req.body.MediaFilename = name;
    req.body.miniMediaFilename = uuidv4() + ext;
    req.body.microMediaFilename = uuidv4() + ext;
    cb(null, name);
  },
});

//second argument in multer can be file type filter (fileFilter)
const mediaUpload = multer({ storage: storageLocal });

module.exports = { multipleUploadNew, mediaUpload };

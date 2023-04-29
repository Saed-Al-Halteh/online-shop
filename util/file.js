const fs = require("fs");

const deleteFile = (filePath) => {
  fs.unlink(filePath, (err) => {
    if (err) {
      console.log(
        `Error deleting the file in ${filePath}, and error message : ${err.message}`
      );
      throw err;
    }
  });
};

module.exports.deleteFile = deleteFile;

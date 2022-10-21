const { emitToClient, socketEvents } = require("./SocketFunctions");

const liveTranscriptHandler = (
  socketSpecificStream,
  chunk,
  status,
  clientSocket
) => {
  try {
    const speechCallback = (stream) => {
      if (stream.results[0]) {
        emitToClient(clientSocket, socketEvents.liveTranscript, {
          isFinal: stream.results[0].isFinal,
          text: stream.results[0].alternatives[0].transcript,
        });
      }
    };

    if (status !== "recording") {
      if (socketSpecificStream.recognizeStream) {
        socketSpecificStream.recognizeStream?.end();
        socketSpecificStream.recognizeStream?.removeListener(
          "data",
          speechCallback
        );
        socketSpecificStream.recognizeStream = null;
      }
      return;
    }

    if (!socketSpecificStream.recognizeStream?.write) {
      const config = {
        encoding: "LINEAR16",
        sampleRateHertz: 48000,
        languageCode: "en-US",
        model: "video", // by default basic/standard model is applied, "video" is an enhanced model with better accuracy
      };
      const request = {
        config,
        interimResults: true, // to receive non-final/intermediate results of transcription also
      };

      socketSpecificStream.recognizeStream = socketSpecificStream.client
        .streamingRecognize(request)
        .on("error", (err) => {
          if (err.code === 11) {
            console.log("error: asdfXw3423 ", err);
          } else {
            console.error("API request error asdfXw3423 " + err);
          }
        })
        .on("data", speechCallback);

      setTimeout(() => {
        if (socketSpecificStream.recognizeStream) {
          socketSpecificStream.recognizeStream?.end();
          socketSpecificStream.recognizeStream?.removeListener(
            "data",
            speechCallback
          );
          socketSpecificStream.recognizeStream = null;
        }
      }, 290000);
    } else {
      socketSpecificStream.recognizeStream?.write(new Buffer.from(chunk));
    }
  } catch (error) {
    console.log("Error aifuat865 ", error);
  }
};

module.exports = { liveTranscriptHandler };

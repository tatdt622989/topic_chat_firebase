/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {setGlobalOptions} = require("firebase-functions/v2");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

// Initialize the app
admin.initializeApp();

setGlobalOptions({region: "asia-northeast3"});

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

// 建立頻道
exports.createChannel = onCall({
  cors: true,
}, async (request) => {
  const uid = request.auth.uid;
  if (!uid) {
    throw new HttpsError("uid is not exist");
  }
  const channelId = Date.now().toString();
  const {title, privacy, description} = request.data;
  const db = admin.database();
  const channelRef = db.ref(`channels/${channelId}`);
  const res = await channelRef.set({
    info: {
      title,
      privacy,
      description,
      owner: uid,
    },
    members: {
      [uid]: {
        joinTimestamp: Date.now(),
        lastActivity: Date.now(),
      },
    },
  }).then(() => true);
  return {res, channelId};
});

// 尋找使用者可以進入的頻道
exports.getUserChannels = onCall({
  cors: true,
}, async (request) => {
  const uid = request.auth.uid;
  logger.info("uid", uid);
  if (!uid) {
    throw new HttpsError("uid is not exist");
  }
  const db = admin.database();
  const channelRef = db.ref("channels");
  const channels = await channelRef.once("value")
      .then((snap) => snap.val())
      .catch(() => null);
  if (!channels && !Array.isArray(channels)) {
    throw new HttpsError("channels is not exist");
  }
  // add key
  Object.keys(channels).forEach((key) => {
    channels[key].id = key;
  });
  const canEnterChannels = Object.values(channels).filter((channel) => {
    let canEnter = [];
    if (channel.members) {
      canEnter = Object.keys(channel.members).filter((member) => {
        return member === uid;
      });
    }
    logger.info("channel", channel);
    return canEnter;
  });
  return canEnterChannels;
});

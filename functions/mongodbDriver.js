// mongo references
const { MongoClient } = require("mongodb");
const { dbURI,dbName } = require("../constants");
const client = new MongoClient(dbURI);
let dbCon;

const mongoConnect = () => {
  try {
    console.log("Mongo starts connecting"); // do not delete this -> server starts crashing
    return client
      .connect()
      .then(() => {
        dbCon = client.db(dbName);
      })
      .catch((error) => {
        console.log("rjnu36", error);
      });
  } catch (error) {
    console.log("fnj4", error);
  }
};

const mongoFind = async (
  collection,
  filter = {},
  limit = 0,
  skip = 0,
  getLastElementFirst = false
) => {
  return new Promise(async (resolve, reject) => {
    try {
      const array = await dbCon
        .collection(collection)
        .find(filter)
        .sort({ $natural: getLastElementFirst ? -1 : 1 })
        .skip(skip)
        .limit(limit)
        .toArray();
      resolve(array);
    } catch (error) {
      console.log("MongoFind error 64887689 ", error);
      reject(error);
    }
  });
};

const mongoFindSpecificField = async (
  collection,
  filter = {},
  project = {},
  limit = 0,
  skip = 0,
  getLastElementFirst = false
) => {
  return new Promise(async (resolve, reject) => {
    try {
      const array = await dbCon
        .collection(collection)
        .find(filter)
        .project(project)
        .sort({ $natural: getLastElementFirst ? -1 : 1 })
        .skip(skip)
        .limit(limit)
        .toArray();
      resolve(array);
    } catch (error) {
      console.log("MongoFind error 64887689 ", error);
      reject(error);
    }
  });
};

const mongoFindOne = async (collection, filter) => {
  return new Promise(async (resolve, reject) => {
    try {
      const obj = await dbCon.collection(collection).findOne(filter);
      resolve(obj);
    } catch (error) {
      console.log("MongoFind error 64887689 ", error);
      reject(error);
    }
  });
};

const mongoFindOneSpecificField = async (
  collection,
  filter = {},
  project = {}
) => {
  return new Promise(async (resolve, reject) => {
    try {
      const array = await dbCon
        .collection(collection)
        .findOne(filter, { projection: project });
      resolve(array);
    } catch (error) {
      console.log("MongoFind error 64887689 ", error);
      reject(error);
    }
  });
};

const mongoUpdateOne = async (collection, filter, update, options = {}) => {
  return new Promise(async (resolve, reject) => {
    try {
      const obj = await dbCon
        .collection(collection)
        .updateOne(filter, update, options);
      resolve(obj);
    } catch (error) {
      console.log("MongoFind error 64843287689 ", error);
      reject(error);
    }
  });
};

const mongoUpdateMany = async (collection, filter, update, options = {}) => {
  return new Promise(async (resolve, reject) => {
    try {
      const obj = await dbCon
        .collection(collection)
        .updateMany(filter, update, options);
      resolve(obj);
    } catch (error) {
      console.log("MongoFind error 64843287689 ", error);
      reject(error);
    }
  });
};

const mongoFindOneAndUpdate = async (
  collection,
  filter,
  update = {},
  extraParams = {}
) => {
  return new Promise(async (resolve, reject) => {
    try {
      const obj = await dbCon
        .collection(collection)
        .findOneAndUpdate(filter, update, extraParams);

      if (obj.ok) {
        resolve(obj.value);
      } else {
        console.log("mongoFindOneAndUpdate error ", obj.lastErrorObject);
        reject(obj.lastErrorObject);
      }

      resolve(obj);
    } catch (error) {
      console.log("MongoFind error 648542287689 ", error);
      reject(error);
    }
  });
};

const mongoAggregate = async (collection, aggregationArray = []) => {
  return new Promise(async (resolve, reject) => {
    try {
      const array = await dbCon
        .collection(collection)
        .aggregate(aggregationArray)
        .toArray();
      resolve(array);
    } catch (error) {
      console.log("MongoFind error 64887689 ", error);
      reject(error);
    }
  });
};

module.exports = {
  mongoConnect,
  mongoFind,
  mongoFindOne,
  mongoFindOneSpecificField,
  mongoFindSpecificField,
  mongoFindOneAndUpdate,
  mongoUpdateOne,
  mongoUpdateMany,
  mongoAggregate,
};

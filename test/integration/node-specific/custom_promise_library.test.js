'use strict';

const { once } = require('events');
const { expect } = require('chai');
const { PromiseProvider } = require('../../../src/promise_provider');
const { MongoClient } = require('../../../src/mongo_client');

class CustomPromise extends Promise {}
CustomPromise.prototype.isCustomMongo = true;

describe('Optional PromiseLibrary', function () {
  beforeEach(() => {
    PromiseProvider.set(null);
  });

  afterEach(() => {
    PromiseProvider.set(null);
  });

  it('should initially be set to null', () => {
    expect(PromiseProvider.get()).to.be.null;
  });

  it('should allow passing null to .set() to clear the set promise', () => {
    PromiseProvider.set(Promise);
    expect(PromiseProvider.get()).to.equal(Promise);
    expect(() => PromiseProvider.set(null)).to.not.throw();
    expect(PromiseProvider.get()).to.be.null;
  });

  it('should emit a deprecation warning when a promiseLibrary is set', async () => {
    const willEmitWarning = once(process, 'warning');
    new MongoClient('mongodb://iLoveJavascript', { promiseLibrary: () => {} });
    const [warning] = await willEmitWarning;
    expect(warning).to.have.property('message', 'promiseLibrary is a deprecated option');
  });

  it('should correctly implement custom dependency-less promise', function (done) {
    const getCustomPromise = v => new CustomPromise(resolve => resolve(v));
    const getNativePromise = v => new Promise(resolve => resolve(v));
    expect(getNativePromise()).to.not.have.property('isCustomMongo');
    expect(getCustomPromise()).to.have.property('isCustomMongo');
    expect(getNativePromise()).to.have.property('then');
    expect(getCustomPromise()).to.have.property('then');
    done();
  });

  it('should have cursor return native promise', function (done) {
    const configuration = this.configuration;
    const client = this.configuration.newClient({ w: 1 }, { maxPoolSize: 1 });
    client.connect((err, client) => {
      expect(err).to.not.exist;
      const db = client.db(configuration.db);
      const collection = db.collection('test');
      const cursor = collection.find({});
      const isPromise = cursor.toArray();
      expect(isPromise).to.not.have.property('isCustomMongo');
      expect(isPromise).to.have.property('then');
      isPromise.then(() => client.close(done));
    });
  });

  it('should have cursor return custom promise from new client options', function (done) {
    const configuration = this.configuration;
    const client = this.configuration.newClient(
      { w: 1 },
      { maxPoolSize: 1, promiseLibrary: CustomPromise }
    );
    client.connect((err, client) => {
      const db = client.db(configuration.db);
      expect(err).to.not.exist;
      const collection = db.collection('test');
      const cursor = collection.find({});
      const isPromise = cursor.toArray();
      expect(isPromise).to.have.property('isCustomMongo');
      expect(isPromise).to.have.property('then');
      isPromise.then(() => client.close(done));
    });
  });
});

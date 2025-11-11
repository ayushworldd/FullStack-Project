import YjsService from '../src/services/YjsService.js';
import * as Y from 'yjs';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Document from '../src/models/Document.js';
import Operation from '../src/models/Operation.js';
import User from '../src/models/User.js';

describe('YjsService', () => {
  let mongoServer;
  let testUser;
  let testDocument;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Create test user
    testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    });

    // Create test document
    testDocument = await Document.create({
      title: 'Test Document',
      slug: 'test-document-123',
      owner: testUser._id
    });
  });

  afterEach(async () => {
    await User.deleteMany({});
    await Document.deleteMany({});
    await Operation.deleteMany({});
    YjsService.unloadDocument(testDocument._id.toString());
  });

  describe('Document Management', () => {
    test('should create and load a new Yjs document', async () => {
      const ydoc = await YjsService.getDocument(testDocument._id.toString());
      expect(ydoc).toBeInstanceOf(Y.Doc);
    });

    test('should return cached document on subsequent calls', async () => {
      const ydoc1 = await YjsService.getDocument(testDocument._id.toString());
      const ydoc2 = await YjsService.getDocument(testDocument._id.toString());
      expect(ydoc1).toBe(ydoc2);
    });
  });

  describe('Update Operations', () => {
    test('should apply update to document', async () => {
      const ydoc = await YjsService.getDocument(testDocument._id.toString());
      const ytext = ydoc.getText('content');
      
      // Create an update
      ytext.insert(0, 'Hello World');
      const update = Y.encodeStateAsUpdate(ydoc);

      const result = await YjsService.applyUpdate(
        testDocument._id.toString(),
        update,
        testUser._id,
        'test-client-123'
      );

      expect(result.isDuplicate).toBe(false);
      expect(result.clock).toBeGreaterThan(0);
    });

    test('should detect duplicate operations', async () => {
      const ydoc = await YjsService.getDocument(testDocument._id.toString());
      const ytext = ydoc.getText('content');
      ytext.insert(0, 'Test');
      const update = Y.encodeStateAsUpdate(ydoc);

      // Apply first time
      await YjsService.applyUpdate(
        testDocument._id.toString(),
        update,
        testUser._id,
        'client-1'
      );

      // Apply duplicate
      const result = await YjsService.applyUpdate(
        testDocument._id.toString(),
        update,
        testUser._id,
        'client-1'
      );

      expect(result.isDuplicate).toBe(true);
    });

    test('should handle concurrent updates correctly', async () => {
      const docId = testDocument._id.toString();
      
      // Simulate two concurrent updates
      const ydoc1 = new Y.Doc();
      const ydoc2 = new Y.Doc();
      
      ydoc1.getText('content').insert(0, 'User 1');
      ydoc2.getText('content').insert(0, 'User 2');
      
      const update1 = Y.encodeStateAsUpdate(ydoc1);
      const update2 = Y.encodeStateAsUpdate(ydoc2);

      await Promise.all([
        YjsService.applyUpdate(docId, update1, testUser._id, 'client-1'),
        YjsService.applyUpdate(docId, update2, testUser._id, 'client-2')
      ]);

      const content = await YjsService.getContent(docId);
      expect(content.length).toBeGreaterThan(0);
    });
  });

  describe('Snapshots', () => {
    test('should create snapshot', async () => {
      const ydoc = await YjsService.getDocument(testDocument._id.toString());
      const ytext = ydoc.getText('content');
      ytext.insert(0, 'Snapshot test');

      const result = await YjsService.createSnapshot(testDocument._id.toString());
      
      expect(result.success).toBe(true);
      expect(result.stateSize).toBeGreaterThan(0);

      const doc = await Document.findById(testDocument._id);
      expect(doc.yjsState).toBeTruthy();
      expect(doc.lastSnapshotAt).toBeTruthy();
    });
  });

  describe('Time Travel', () => {
    test('should retrieve document state at specific time', async () => {
      const docId = testDocument._id.toString();
      const ydoc = await YjsService.getDocument(docId);
      const ytext = ydoc.getText('content');

      // Insert initial text
      ytext.insert(0, 'Version 1');
      const update1 = Y.encodeStateAsUpdate(ydoc);
      await YjsService.applyUpdate(docId, update1, testUser._id, 'client-1');
      
      const timestamp = Date.now();
      await new Promise(resolve => setTimeout(resolve, 100));

      // Insert more text
      ytext.insert(ytext.length, ' Version 2');
      const update2 = Y.encodeStateAsUpdate(ydoc);
      await YjsService.applyUpdate(docId, update2, testUser._id, 'client-1');

      // Time travel to before second update
      const result = await YjsService.getStateAtTime(docId, new Date(timestamp));
      
      expect(result.content).toContain('Version 1');
      expect(result.operations).toBeGreaterThanOrEqual(0);
    });
  });
});

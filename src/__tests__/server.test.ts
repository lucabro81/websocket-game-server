import WebSocket from 'ws';
import { GameMessageType } from '../utils/game-messages';
import { GameServer } from '../server';

describe('WebSocket Server', () => {
  let client: WebSocket;
  let server: GameServer;
  const PORT = 8080;
  const SERVER_URL = `ws://localhost:${PORT}`;

  beforeAll(() => {
    server = new GameServer(PORT);
  });

  afterAll((done) => {
    server.close();
    done();
  });

  beforeEach((done) => {
    // Create client and wait for connection
    client = new WebSocket(SERVER_URL);
    client.on('open', () => {
      done();
    });
  });

  afterEach((done) => {

    if (client.readyState === WebSocket.OPEN) {
      client.close();
    }
    done();
  });

  it('should connect successfully', () => {
    // If we reach here, the beforeEach succeeded in connecting
    expect(client.readyState).toBe(WebSocket.OPEN);
  });

  it('should receive error on invalid message', (done) => {
    client.on('message', (message) => {
      const response = JSON.parse(message.toString());
      expect(response.type).toBe(GameMessageType.ERROR);
      expect(response.data.code).toBe('INVALID_MESSAGE');
      done();
    });

    client.send('invalid json');
  });

  it('should handle CREATE_ROOM message', (done) => {
    client.on('message', (message) => {
      const response = JSON.parse(message.toString());
      expect(response.type).toBe(GameMessageType.ROOM_CREATED);
      expect(response.data.roomId).toBeDefined();
      expect(response.data.playerId).toBeDefined();
      done();
    });

    client.send(JSON.stringify({
      type: GameMessageType.CREATE_ROOM,
      data: {}
    }));
  });
});


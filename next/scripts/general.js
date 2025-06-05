import readline from 'readline';
import startSocket from '../../next.js';

const { socket } = startSocket;

const listenGroupMessages = async ({ group }) => {};
const listAllGroups = async () => {
  Array.from(socket?.chats);
};

export const start = () => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'N: ',
  });

  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();
    const [command, subcommand, ...args] = input.split(' ');

    let groupId = null;

    try {
      if (command === 'lookup' && subcommand !== 'groups') {
        groupId = subcommand;
      }
    } catch (e) {
      console.error('❌ Error parsing command:', e);
    }

    try {
      if (command === 'lookup' && subcommand === 'groups') {
        await listAllGroups();
      } else if (groupId) {
        await listenGroupMessages({ group: groupId });
      } else {
        console.log('❓ Unknown command.');
      }
    } catch (err) {
      console.error('❌ Error executing command:', err);
    }

    rl.prompt();
  });

  rl.on('SIGINT', () => {
    console.log('\nShutting down...');
    process.exit(0);
  });
};

start();

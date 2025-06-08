import start from '../../next.js';

const socket = await start();

socket.db.User.find().then((users) => {
  users.forEach((u) => {
    u.config.ratio = '1:1';
    u.save().catch((err) => null);
    console.log(`[query] Atualizando usuário ${u.phone} com ratio=1:1`);
  });
});

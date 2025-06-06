import start from '../../next.js';

const socket = await start();

socket.db.User.find().then((users) => {
  users.forEach((u) => {
    socket.db.User.deleteOne({ phone: u.phone })
      .then(() => console.log(`Updated user: ${u.phone}`))
      .catch((err) => console.error(`Error updating user ${u.phone}:`, err));
  });
});

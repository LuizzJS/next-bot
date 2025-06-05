import { Client } from 'pg';

const stabilishConnection = async () => {
  const { PG_DATABASE, PG_USER, PG_PASSWORD, PG_PORT } = process.env;
  const client = new Client({
    user: PG_USER,
    host: 'localhost',
    database: PG_DATABASE,
    password: PG_PASSWORD,
    port: PG_PORT,
  });

  await client.connect();

  return client;
};

export default stabilishConnection;

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../../.env') });

const stabilishConnection = async () => {
  try {
    const connection = await mongoose.connect(process.env.MG_URL);

    console.log(
      `✅ Conectado ao MongoDB com sucesso: "${connection.connection.name}" em "${connection.connection.host}:${connection.connection.port}"`
    );
  } catch (error) {
    console.error(`❌ Erro ao conectar ao MongoDB: ${error.message}`);
    throw new Error('Falha ao conectar ao MongoDB');
  }
};

export default stabilishConnection;

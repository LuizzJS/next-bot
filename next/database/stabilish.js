import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'next', '.env') });

const stabilishConnection = async () => {
  try {
    const connection = await mongoose.connect(process.env.MG_URL);

    console.log(
      `✅ Conectado ao MongoDB com sucesso: "${connection.connection.name}" em "${connection.connection.host}:${connection.connection.port}"`
    );

    return connection;
  } catch (error) {
    console.error(`❌ Erro ao conectar ao MongoDB: ${error.message}`);
    throw new Error('Falha ao conectar ao MongoDB');
  }
};

export default stabilishConnection;

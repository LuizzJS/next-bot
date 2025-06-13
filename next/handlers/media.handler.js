const mediaHandler = async ({ message, client }) => {
  const { mimetype, chatId } = message;

  if (
    !mimetype ||
    (!mimetype.startsWith('image/') && !mimetype.startsWith('video/'))
  ) {
    return;
  }
  if (chatId.includes('@g.us')) {
    const gp = await client.db.Group.findOne({
      id: message.chatId,
    });
    if (!gp.autoSticker) return;
  }

  try {
    const mediaBuffer = await client.decryptMedia(message);

    const stickerOptions = {
      pack: '🅽',
      author: 'NextBOT',
    };

    if (mimetype.startsWith('image/')) {
      await client.sendImageAsSticker(
        chatId,
        mediaBuffer,
        stickerOptions,
        message.id
      );
      console.log(`✅ Sticker de imagem enviado para ${chatId}`);
    } else if (mimetype.startsWith('video/')) {
      await client.sendMp4AsSticker(
        chatId,
        mediaBuffer,
        null,
        stickerOptions,
        message.id
      );
      console.log(`✅ Sticker de vídeo enviado para ${chatId}`);
    }
  } catch (error) {
    console.error(`❌ Erro ao processar mídia para ${message.chatId}:`, error);
    await client.sendText(
      chatId,
      'Ocorreu um erro ao tentar transformar a mídia em figurinha.'
    );
  }
};

export default mediaHandler;

const mediaHandler = async ({ message, client }) => {
  const { mimetype, type, chatId, caption } = message;

  // Verificação mais abrangente de tipos de mídia
  const isImage = type === 'image' || mimetype?.startsWith('image/');
  const isVideo = type === 'video' || mimetype?.startsWith('video/');
  const isStickerCommand = caption?.toLowerCase().startsWith('sticker');

  // Se não for mídia nem comando de sticker, ignora
  if (!isImage && !isVideo && !isStickerCommand) {
    return;
  }

  try {
    // Verificar configurações de autoSticker
    let shouldConvert = false;

    if (chatId.includes('@g.us')) {
      // Para grupos
      const group = await client.db.Group.findOne({ id: chatId });
      const user = await client.db.User.findOne({
        phone: chatId.replace('@c.us', ''),
      });
      shouldConvert =
        group?.autoSticker || user?.config?.autoSticker || isStickerCommand;
    } else {
      // Para chats privados
      const user = await client.db.User.findOne({
        phone: chatId.replace('@c.us', ''),
      });
      shouldConvert = user?.config?.autoSticker || isStickerCommand;
    }

    if (!shouldConvert) return;

    // Processar a mídia
    const mediaBuffer = await client.decryptMedia(message);
    const stickerOptions = {
      pack: '🅽',
      author: 'NextBOT',
      cropPosition: 'center',
      keepScale: false,
    };

    if (isImage) {
      await client.sendImageAsSticker(
        chatId,
        mediaBuffer,
        stickerOptions,
        message.id
      );
      console.log(`✅ Sticker de imagem enviado para ${chatId}`);
    } else if (isVideo) {
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
    console.error(`❌ Erro ao processar mídia para ${chatId}:`, error);
    await client.sendText(
      chatId,
      '⚠️ Ocorreu um erro ao tentar criar a figurinha.\n' +
        'Certifique-se que a mídia não é muito grande ou tente novamente mais tarde.'
    );
  }
};

export default mediaHandler;
